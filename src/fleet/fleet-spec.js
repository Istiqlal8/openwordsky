// Player capital-ship spec: the small JSON blob the shop and the DIY yard both produce.
// Kept flat and JSON-safe so it can live in save.freighter; spec-model.js turns it into a model.
import { hash32, Rng } from '../core/rng.js';

export const ARCHETYPE_IDS = ['classic', 'hammerhead', 'catamaran', 'ring', 'citadel', 'saucer', 'whale', 'cruiser'];
export const ARCHETYPE_LABELS = {
  classic: 'Kapal Induk', hammerhead: 'Martil', catamaran: 'Kembar', ring: 'Cincin',
  citadel: 'Benteng', saucer: 'Cakram', whale: 'Paus', cruiser: 'Penjelajah',
};
export const BRIDGE_STYLES = ['menara', 'kubah', 'datar'];
export const BRIDGE_LABELS = { menara: 'Menara', kubah: 'Kubah', datar: 'Datar' };

// Numeric limits [min, max] shared by the yard sliders and normalization.
export const LIMITS = { engines: [0, 6], towers: [0, 4], cargo: [0, 4], size: [0.7, 1.5] };

// Base traits per archetype: hangar slots, cargo holds, comfort (0..1) and shop price in Nanit.
export const ARCHETYPE_BASE = {
  classic: { hangar: 4, cargo: 9, comfort: 0.5, price: 20000 },
  hammerhead: { hangar: 5, cargo: 7, comfort: 0.45, price: 34000 },
  catamaran: { hangar: 6, cargo: 6, comfort: 0.6, price: 42000 },
  ring: { hangar: 3, cargo: 5, comfort: 0.95, price: 56000 },
  citadel: { hangar: 5, cargo: 11, comfort: 0.7, price: 68000 },
  saucer: { hangar: 8, cargo: 8, comfort: 0.8, price: 84000 },
  whale: { hangar: 4, cargo: 10, comfort: 0.85, price: 98000 },
  cruiser: { hangar: 7, cargo: 6, comfort: 0.35, price: 120000 },
};

export const DEFAULT_SPEC = Object.freeze({
  v: 1, archetype: 'classic', name: 'Garuda', hull: '#8a909c', accent: '#2f7fd0', glow: '#ffe0a8',
  engines: 2, towers: 1, cargo: 2, bridgeStyle: 'menara', size: 1,
});

const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const oneOf = (v, list, def) => (list.includes(v) ? v : def);
const clamp = (v, [lo, hi], def) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : def);
const round2 = (v) => Math.round(v * 100) / 100;

// Any (stale, hand-edited or partial) object -> a valid spec with every field in range.
export function normalizeSpec(raw = {}) {
  const s = { ...DEFAULT_SPEC, ...(raw && typeof raw === 'object' ? raw : {}) };
  const whole = (k) => Math.round(clamp(s[k], LIMITS[k], DEFAULT_SPEC[k]));
  return {
    v: 1,
    archetype: oneOf(s.archetype, ARCHETYPE_IDS, DEFAULT_SPEC.archetype),
    name: String(s.name ?? '').trim().slice(0, 22) || DEFAULT_SPEC.name,
    hull: isHex(s.hull) ? s.hull : DEFAULT_SPEC.hull,
    accent: isHex(s.accent) ? s.accent : DEFAULT_SPEC.accent,
    glow: isHex(s.glow) ? s.glow : DEFAULT_SPEC.glow,
    engines: whole('engines'), towers: whole('towers'), cargo: whole('cargo'),
    bridgeStyle: oneOf(s.bridgeStyle, BRIDGE_STYLES, DEFAULT_SPEC.bridgeStyle),
    size: round2(clamp(s.size, LIMITS.size, DEFAULT_SPEC.size)),
  };
}

// Stable 32-bit seed for a spec, so the same spec always grows the same hull.
export function specSeed(spec) {
  const json = JSON.stringify(normalizeSpec(spec));
  const codes = [];
  for (let i = 0; i < json.length; i++) codes.push(json.charCodeAt(i));
  return hash32(0xf1ee7, ...codes);
}

// Derived stats shown as bars: hangar slots, cargo holds, comfort 0..100.
export function specStats(spec) {
  const s = normalizeSpec(spec), b = ARCHETYPE_BASE[s.archetype];
  const scale = 0.6 + s.size * 0.4;
  return {
    hangar: Math.max(1, Math.round(b.hangar * scale)),
    cargo: Math.max(1, Math.round((b.cargo + s.cargo * 2) * scale)),
    comfort: Math.round(Math.min(1, b.comfort + s.towers * 0.04 + (s.bridgeStyle === 'kubah' ? 0.08 : 0)) * 100),
    thrust: Math.round(Math.min(1, 0.45 + s.engines * 0.09) * 100),
  };
}

// Build cost in Nanit for a DIY hull: the archetype's frame plus every fitted option.
export function buildCost(spec) {
  const s = normalizeSpec(spec), b = ARCHETYPE_BASE[s.archetype];
  const frame = b.price * 0.82;
  const fit = s.engines * 2600 + s.towers * 1900 + s.cargo * 2400;
  const scale = 1 + (s.size - 1) * 0.55;
  return Math.round(((frame + fit) * scale) / 100) * 100;
}

export function archetypeLabel(spec) {
  return ARCHETYPE_LABELS[normalizeSpec(spec).archetype];
}

// Cost of building `spec` when the player already owns `ownedSpec`: 60% trade-in on the old hull.
export function refitCost(spec, ownedSpec = null) {
  const cost = buildCost(spec);
  if (!ownedSpec) return cost;
  return Math.max(0, Math.round((cost - buildCost(ownedSpec) * 0.6) / 100) * 100);
}

const HULLS = ['#8a909c', '#a39a8a', '#6f7f8c', '#b4b8be', '#7d8a78', '#6a6470', '#4f7f7a'];
const ACCENTS = ['#2f7fd0', '#d0662f', '#3aa87a', '#c9b23a', '#8a5ad0', '#c03a4a', '#2fb8c0'];
const GLOWS = ['#ffe0a8', '#a8e0ff', '#b8ffc8', '#7affd8', '#d8a0ff', '#fff4d8'];
const NAMES = ['Garuda', 'Nusantara', 'Rinjani', 'Bima', 'Arjuna', 'Srikandi', 'Majapahit', 'Sriwijaya',
  'Merapi', 'Krakatau', 'Cendrawasih', 'Komodo', 'Semeru', 'Mahakam', 'Jatayu', 'Samudra', 'Bromo', 'Toba'];

// A random but valid capital-ship spec, for the yard's "Acak" button.
export function randomSpec(seed = (Math.random() * 2 ** 32) >>> 0) {
  const rng = new Rng(seed);
  return normalizeSpec({
    archetype: rng.pick(ARCHETYPE_IDS), name: rng.pick(NAMES), hull: rng.pick(HULLS),
    accent: rng.pick(ACCENTS), glow: rng.pick(GLOWS), engines: rng.int(5), towers: rng.int(4),
    cargo: rng.int(5), bridgeStyle: rng.pick(BRIDGE_STYLES), size: rng.range(0.8, 1.35),
  });
}
