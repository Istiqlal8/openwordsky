// Player-built ships: spec (small JSON the player edits) -> design accepted by buildShip().
// Stats derive from the parts: size -> shield, engines -> speed, guns -> damage, compact -> agility.
import { hash32 } from '../../core/rng.js';
import { clampStat, engineMounts } from './ship-design.js';
import { normalizeSpec, specFromDesign, randomSpec, DEFAULT_SPEC } from './ship-custom-spec.js';
import { customResist } from '../../ship-systems/ship-resist.js';

export { normalizeSpec, specFromDesign, randomSpec, DEFAULT_SPEC };

export const CLASS_LABELS = { fighter: 'Petarung', explorer: 'Penjelajah', hauler: 'Pengangkut', exotic: 'Eksotis' };
const BODY_PART = { wedge: 'wedge', long: 'long', boxy: 'box', organic: 'pod', saucer: 'saucer' };
const CANOPY_T = { wedge: 0.66, long: 0.77, box: 0.86, pod: 0.65, saucer: 0.5 };
const CANOPY = { small: { size: 1, stretch: 1 }, bubble: { size: 1.3, stretch: 0.9 }, long: { size: 1, stretch: 1.9 } };
const CHORD = { swept: 0.4, delta: 0.45, straight: 0.24, forward: 0.4, none: 0.3 };
const CLASS_BIAS = {
  fighter: { agility: 0.06, damage: 0.05 }, explorer: { regen: 0.12, speed: 0.03 },
  hauler: { shield: 0.08 }, exotic: { speed: 0.03, agility: 0.03, shield: 0.03, damage: 0.03, regen: 0.03 },
};

const hexNum = (css) => parseInt(css.slice(1), 16);

// Stable 32-bit id for a spec (so the same spec always gets the same seed).
// Weapon and armor are left out so ships saved before those options keep their seed.
function specSeed(spec) {
  const { weapon, armor, ...shape } = spec;
  const json = JSON.stringify(shape);
  const codes = [];
  for (let i = 0; i < json.length; i++) codes.push(json.charCodeAt(i));
  return hash32(0xc057, ...codes);
}

// Real hull dimensions; a saucer turns "width" into a rim-to-rim ratio of its length.
function dims(s) {
  if (s.body !== 'saucer') return { length: s.length, width: s.width, height: s.height };
  return { length: s.length, width: s.length * (0.55 + s.width * 0.12), height: s.height * 0.7 };
}

function wingParts(s, d) {
  const w = s.wings;
  if (w.shape === 'none') return { shape: 'none', pairs: 0, span: 0, chord: 0, sweep: 0, z: 0, dihedral: 0 };
  const z = s.body === 'saucer' ? 0 : w.shape === 'straight' ? 0.25 : 0.12;
  return { shape: w.shape, pairs: w.pairs, span: w.span, chord: d.length * CHORD[w.shape], sweep: w.sweep, z, dihedral: w.dihedral };
}

function engineParts(s, d) {
  const r = s.engines === 1 ? s.engineSize * 1.3 : s.engineSize;
  return {
    engines: s.engines ? engineMounts(s.engines, d.width * 0.28, r) : [],
    engineLen: 0.8 + s.engineSize * 2,
    nacelles: s.nacelles ? { x: d.width * 0.5 + 1.2 + s.engineSize * 1.5, r: s.engineSize * 1.15, length: d.length * 0.5 } : null,
  };
}

function buildParts(s) {
  const d = dims(s), body = BODY_PART[s.body];
  return {
    body, ...d, wings: wingParts(s, d), ...engineParts(s, d),
    fins: s.fins, guns: s.guns, legs: s.legs, antenna: s.antenna, dish: s.antenna && s.dish,
    canopy: { t: CANOPY_T[body], ...CANOPY[s.canopy] },
    cargo: s.cargo, ring: s.ring, spikes: body === 'pod' ? 4 : 0, booms: s.booms, decal: s.decal,
  };
}

// Raw 0..1-ish factors describing the build.
function factors(s, p) {
  const volume = p.length * p.width * p.height;
  const nozzles = p.engines.reduce((a, e) => a + e.r * e.r, 0) + (p.nacelles ? 2 * p.nacelles.r ** 2 : 0);
  return {
    size: Math.min(1, Math.max(0, (volume - 8) / 55)),
    thrust: Math.min(1, nozzles / 0.8),
    wing: p.wings.pairs ? Math.min(1, (p.wings.span * p.wings.pairs) / 6) : 0,
    extras: s.cargo * 0.25 + (s.ring ? 0.5 : 0) + (s.booms ? 0.4 : 0),
  };
}

export function customStats(s, p) {
  const f = factors(s, p);
  const raw = {
    speed: 0.78 + f.thrust * 0.7 - f.size * 0.3 - f.extras * 0.05 + (p.wings.pairs ? 0 : 0.06),
    agility: 1.3 - f.size * 0.6 + f.wing * 0.1 - f.thrust * 0.25 + s.fins * 0.02 - (p.length - 7) * 0.04 - (s.guns === 4 ? 0.05 : 0),
    shield: 0.75 + f.size * 0.6 + f.extras * 0.08 + (s.body === 'boxy' ? 0.05 : 0),
    damage: 0.82 + (s.guns === 4 ? 0.34 : 0) - f.thrust * 0.05 + f.size * 0.08,
    regen: 0.85 + (s.antenna ? 0.12 : 0) + (s.dish ? 0.12 : 0) + (s.ring ? 0.12 : 0) + (s.nacelles ? 0.08 : 0),
  };
  const bias = CLASS_BIAS[s.cls] ?? {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) out[k] = clampStat(v + (bias[k] ?? 0));
  return out;
}

// Spec -> full design (same shape as shipDesign output, plus `custom` and the normalized `spec`).
export function customDesign(spec) {
  const s = normalizeSpec(spec);
  const parts = buildParts(s);
  const stats = customStats(s, parts);
  return {
    seed: specSeed(s), name: s.name, cls: s.cls, label: CLASS_LABELS[s.cls],
    stats: { ...stats, ...customResist(s.cls, s.armor, stats.shield) }, weapon: s.weapon,
    palette: { hull: hexNum(s.colors.hull), trim: hexNum(s.colors.trim), glow: hexNum(s.colors.glow) },
    parts, custom: true, spec: s,
  };
}
