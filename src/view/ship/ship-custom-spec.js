// Player-editable ship spec: defaults, limits, normalization, random specs and conversion from designs.
// A spec is small, JSON-serializable data; ship-custom.js turns it into a buildable design.
import { Rng } from '../../core/rng.js';
import { hsl } from '../../core/color.js';
import { word } from '../../gen/names.js';
import { shipDesign } from './ship-design.js';
import { WEAPON_IDS, weaponId } from '../../ship-systems/ship-weapons.js';
import { ARMOR_IDS } from '../../ship-systems/ship-resist.js';

export const BODIES = ['wedge', 'long', 'boxy', 'organic', 'saucer'];
export const WING_SHAPES = ['swept', 'delta', 'straight', 'forward', 'none'];
export const CLASS_IDS = ['fighter', 'explorer', 'hauler', 'exotic'];
export const CANOPIES = ['small', 'bubble', 'long'];
export const DECALS = ['none', 'stripe', 'chevron', 'checker'];

// Numeric limits [min, max] shared by the editor sliders and normalization.
export const LIMITS = {
  length: [5, 12], width: [1.2, 4], height: [0.8, 2.6], cargo: [0, 4],
  span: [0.8, 4], sweep: [-1.5, 2.5], dihedral: [-0.4, 0.4],
  engines: [0, 4], engineSize: [0.3, 0.7], fins: [0, 3],
};

export const DEFAULT_SPEC = Object.freeze({
  v: 1, name: 'Elang', cls: 'fighter', body: 'wedge', length: 7, width: 1.8, height: 1,
  cargo: 0, ring: false, booms: false,
  wings: { shape: 'swept', pairs: 1, span: 2.8, sweep: 1.6, dihedral: 0.05 },
  engines: 2, engineSize: 0.4, nacelles: false, fins: 2,
  canopy: 'small', antenna: false, dish: false, guns: 2, legs: 3,
  colors: { hull: '#7a8ea8', trim: '#23262e', glow: '#5fd0ff' }, decal: 'none',
  weapon: 'laser', armor: 'none',
});

const clamp = (v, [lo, hi], def) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : def);
const oneOf = (v, list, def) => (list.includes(v) ? v : def);
const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const round2 = (v) => Math.round(v * 100) / 100;

function normalizeWings(w) {
  w = w && typeof w === 'object' ? w : {};
  const d = DEFAULT_SPEC.wings;
  return {
    shape: oneOf(w.shape, WING_SHAPES, d.shape), pairs: w.pairs === 2 ? 2 : 1,
    span: round2(clamp(w.span, LIMITS.span, d.span)), sweep: round2(clamp(w.sweep, LIMITS.sweep, d.sweep)),
    dihedral: round2(clamp(w.dihedral, LIMITS.dihedral, d.dihedral)),
  };
}

function normalizeColors(c) {
  c = c && typeof c === 'object' ? c : {};
  const d = DEFAULT_SPEC.colors;
  return { hull: isHex(c.hull) ? c.hull : d.hull, trim: isHex(c.trim) ? c.trim : d.trim, glow: isHex(c.glow) ? c.glow : d.glow };
}

// Any (possibly stale or hand-edited) object -> a valid spec with every field in range.
export function normalizeSpec(raw = {}) {
  const s = { ...DEFAULT_SPEC, ...(raw && typeof raw === 'object' ? raw : {}) };
  const nacelles = Boolean(s.nacelles);
  const num = (k, digits = true) => (digits ? round2 : Math.round)(clamp(s[k], LIMITS[k], DEFAULT_SPEC[k]));
  return {
    v: 1, name: String(s.name ?? '').trim().slice(0, 24) || DEFAULT_SPEC.name,
    cls: oneOf(s.cls, CLASS_IDS, DEFAULT_SPEC.cls), body: oneOf(s.body, BODIES, DEFAULT_SPEC.body),
    length: num('length'), width: num('width'), height: num('height'), cargo: num('cargo', false),
    ring: Boolean(s.ring), booms: Boolean(s.booms), wings: normalizeWings(s.wings),
    engines: Math.max(nacelles ? 0 : 1, num('engines', false)), engineSize: num('engineSize'), nacelles,
    fins: num('fins', false), canopy: oneOf(s.canopy, CANOPIES, 'small'),
    antenna: Boolean(s.antenna), dish: Boolean(s.dish), guns: s.guns === 4 ? 4 : 2, legs: s.legs === 4 ? 4 : 3,
    colors: normalizeColors(s.colors), decal: oneOf(s.decal, DECALS, 'none'),
    weapon: oneOf(s.weapon, WEAPON_IDS, 'laser'), armor: oneOf(s.armor, ARMOR_IDS, 'none'),
  };
}

const BODY_FROM_PART = { wedge: 'wedge', long: 'long', box: 'boxy', pod: 'organic', saucer: 'saucer' };
const cssHex = (n) => `#${(n >>> 0).toString(16).padStart(6, '0').slice(-6)}`;

function wingsFromParts(w) {
  if (!w || !w.pairs || w.shape === 'none') return { ...DEFAULT_SPEC.wings, shape: 'none' };
  return { shape: w.shape, pairs: w.pairs, span: w.span, sweep: w.sweep, dihedral: w.dihedral };
}

// Best-effort spec for any design (procedural or custom) so it can be used as a starting point.
export function specFromDesign(design) {
  if (design?.spec) return normalizeSpec(structuredClone(design.spec));
  const p = design.parts, eng = p.engines ?? [];
  const r0 = eng[0]?.r ?? (p.nacelles ? p.nacelles.r * 0.9 : 0.45);
  return normalizeSpec({
    name: design.name, cls: design.cls, body: BODY_FROM_PART[p.body] ?? 'wedge',
    length: p.length, width: p.width, height: p.height, cargo: p.cargo ?? 0, ring: Boolean(p.ring),
    wings: wingsFromParts(p.wings), engines: eng.length, engineSize: eng.length === 1 ? r0 / 1.3 : r0,
    nacelles: Boolean(p.nacelles), fins: p.fins ?? 0,
    canopy: p.canopy?.size >= 1.1 ? 'bubble' : 'small', antenna: Boolean(p.antenna), dish: Boolean(p.dish),
    guns: p.guns, legs: p.legs, decal: 'none', weapon: weaponId(design), armor: 'none',
    colors: { hull: cssHex(design.palette.hull), trim: cssHex(design.palette.trim), glow: cssHex(design.palette.glow) },
  });
}

function randomColors(rng) {
  const h = rng.next();
  return {
    hull: cssHex(hsl(h, rng.range(0.1, 0.7), rng.range(0.3, 0.75))),
    trim: cssHex(hsl(h + rng.pick([0.5, 0.08, 0.33, 0]), rng.range(0.1, 0.8), rng.pick([0.18, 0.5, 0.85]))),
    glow: cssHex(hsl(rng.next(), 0.9, 0.6)),
  };
}

// A random but valid spec: a procedural ship with some custom-only parts mixed in.
export function randomSpec(seed = (Math.random() * 2 ** 32) >>> 0) {
  const rng = new Rng(seed);
  const s = specFromDesign(shipDesign(seed));
  s.name = word(rng);
  s.body = rng.chance(0.25) ? rng.pick(BODIES) : s.body;
  if (s.body === 'saucer') Object.assign(s, { length: rng.range(6, 9), height: rng.range(0.9, 1.4) });
  if (rng.chance(0.3)) s.wings = { ...s.wings, shape: rng.pick(WING_SHAPES) };
  if (s.wings.shape === 'none') s.wings.span = DEFAULT_SPEC.wings.span;
  s.booms = rng.chance(0.2);
  s.guns = rng.chance(0.35) ? 4 : 2;
  s.canopy = rng.pick(CANOPIES);
  s.decal = rng.pick(DECALS);
  s.colors = randomColors(rng);
  s.armor = rng.pick(ARMOR_IDS);
  return normalizeSpec(s);
}
