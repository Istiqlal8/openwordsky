// Procedural ship design: pure data (no three.js). Same seed -> same ship.
import { Rng, hash32 } from '../../core/rng.js';
import { hsl } from '../../core/color.js';
import { word } from '../../gen/names.js';
import { rollWeapon } from '../../ship-systems/ship-weapons.js';
import { rollResist } from '../../ship-systems/ship-resist.js';

const CLASSES = [
  { w: 35, cls: 'fighter', label: 'Petarung', stats: { speed: 1.25, agility: 1.3, shield: 0.85, damage: 1.2, regen: 0.9 } },
  { w: 30, cls: 'explorer', label: 'Penjelajah', stats: { speed: 1.1, agility: 0.95, shield: 1.0, damage: 0.85, regen: 1.35 } },
  { w: 25, cls: 'hauler', label: 'Pengangkut', stats: { speed: 0.8, agility: 0.75, shield: 1.35, damage: 0.95, regen: 1.0 } },
  { w: 10, cls: 'exotic', label: 'Eksotis', stats: { speed: 1.2, agility: 1.15, shield: 1.1, damage: 1.15, regen: 1.15 } },
];
const SUFFIX = ['Mk-II', 'Mk-III', 'Mk-IV', 'S', 'X', 'Prime', 'Nova', 'Zero', 'VII'];
const GLOW_HUES = [0.55, 0.08, 0.6, 0.33, 0.9, 0.5];
const STARTER_SEED = 1; // the ship a new pilot begins with wears the sculpted hull

export const clampStat = (v) => Math.round(Math.max(0.7, Math.min(1.4, v)) * 100) / 100;

function rollStats(rng, base) {
  const out = {};
  for (const [k, v] of Object.entries(base)) out[k] = clampStat(v + rng.range(-0.08, 0.08));
  return out;
}

function rollPalette(rng, cls) {
  const h = rng.next();
  const glow = hsl(rng.pick(GLOW_HUES), 0.9, 0.6);
  if (cls === 'explorer') return { hull: hsl(h, rng.range(0.05, 0.2), rng.range(0.7, 0.82)), trim: hsl(h + 0.5, 0.65, 0.5), glow };
  if (cls === 'hauler') {
    const hh = rng.pick([0.1, 0.12, 0.07, 0.56, 0.0, 0.3]);
    return { hull: hsl(hh, rng.range(0.25, 0.55), rng.range(0.42, 0.55)), trim: hsl(0.6, 0.08, 0.25), glow };
  }
  if (cls === 'exotic') {
    const eh = rng.pick([0.75, 0.83, 0.45, 0.95, 0.12]);
    return { hull: hsl(eh, 0.6, 0.35), trim: hsl(eh + 0.12, 0.7, 0.62), glow: hsl(eh + 0.45, 1, 0.62) };
  }
  return { hull: hsl(h, rng.range(0.35, 0.6), rng.range(0.42, 0.56)), trim: hsl(h + rng.pick([0.5, 0.08, 0]), 0.2, rng.pick([0.2, 0.85])), glow };
}

// Engine nozzle positions [x, y] at the rear, spread across the body width.
export function engineMounts(n, spread, r) {
  const s = spread;
  const layouts = {
    1: [[0, 0]], 2: [[-s, 0], [s, 0]],
    3: [[-s, -r * 0.4], [s, -r * 0.4], [0, r * 1.2]],
    4: [[-s, -r * 1.05], [s, -r * 1.05], [-s, r * 1.05], [s, r * 1.05]],
  };
  return layouts[n].map(([x, y]) => ({ x, y, r }));
}

function fighterParts(rng) {
  const length = rng.range(6.5, 8), width = rng.range(1.6, 2.1), height = rng.range(0.9, 1.2);
  const n = rng.pick([1, 2, 2, 3]);
  const r = n === 1 ? 0.5 : 0.36;
  return {
    body: 'wedge', length, width, height,
    wings: { shape: rng.pick(['swept', 'delta', 'swept']), pairs: rng.chance(0.35) ? 2 : 1,
      span: rng.range(2.4, 3.4), chord: length * rng.range(0.35, 0.45), sweep: rng.range(1.2, 2.2),
      z: rng.range(0.05, 0.2), dihedral: rng.range(-0.12, 0.18) },
    engines: engineMounts(n, width * 0.28, r), engineLen: rng.range(1.2, 1.7),
    fins: rng.pick([1, 2, 2]), guns: 2, legs: 3, canopy: { t: rng.range(0.62, 0.7), size: 1 },
  };
}

function explorerParts(rng) {
  const length = rng.range(8.5, 10), width = rng.range(1.4, 1.8), height = rng.range(1.3, 1.6);
  const nacelles = rng.chance(0.6);
  const r = rng.range(0.5, 0.65);
  const engines = nacelles ? [] : engineMounts(rng.pick([2, 3]), width * 0.3, r * 0.8);
  return {
    body: 'long', length, width, height,
    wings: { shape: rng.pick(['straight', 'swept']), pairs: 1, span: rng.range(1.6, 2.4),
      chord: length * 0.22, sweep: rng.range(0.3, 0.9), z: rng.range(0.2, 0.35), dihedral: rng.range(-0.25, 0.05) },
    nacelles: nacelles ? { x: width * 0.5 + rng.range(1.5, 2), r, length: length * rng.range(0.45, 0.6) } : null,
    engines, engineLen: rng.range(1.4, 2), antenna: true, dish: rng.chance(0.6),
    fins: rng.pick([0, 1]), guns: 2, legs: 4, canopy: { t: rng.range(0.74, 0.8), size: 1.15 },
  };
}

function haulerParts(rng) {
  const length = rng.range(8, 9.5), width = rng.range(2.8, 3.4), height = rng.range(2, 2.5);
  return {
    body: 'box', length, width, height,
    wings: { shape: 'straight', pairs: 1, span: rng.range(0.8, 1.4), chord: length * 0.3,
      sweep: 0.3, z: rng.range(0.25, 0.4), dihedral: rng.range(-0.3, -0.1) },
    engines: engineMounts(rng.pick([2, 4, 4]), width * 0.28, rng.range(0.42, 0.55)), engineLen: 1.1,
    cargo: rng.int(3) + 2, fins: rng.pick([0, 2]), guns: 2, legs: 4,
    canopy: { t: 0.86, size: 0.95 },
  };
}

function exoticParts(rng) {
  const length = rng.range(6.5, 8.5), width = rng.range(1.7, 2.3), height = rng.range(1.2, 1.6);
  return {
    body: 'pod', length, width, height,
    wings: { shape: rng.pick(['forward', 'delta', 'swept']), pairs: rng.chance(0.5) ? 2 : 1,
      span: rng.range(2, 3.2), chord: length * 0.4, sweep: rng.range(-1.4, 2), z: rng.range(0.1, 0.25),
      dihedral: rng.range(0.1, 0.4) },
    engines: engineMounts(1, 0, rng.range(0.5, 0.7)), engineLen: 0.9,
    ring: rng.chance(0.7), spikes: rng.int(4) + 3, fins: 0, guns: 2, legs: 3,
    canopy: { t: rng.range(0.6, 0.7), size: 1.1 },
  };
}

const PARTS = { fighter: fighterParts, explorer: explorerParts, hauler: haulerParts, exotic: exoticParts };

export function shipDesign(seed) {
  seed = seed >>> 0;
  const rng = new Rng(hash32(seed, 0x5419));
  const kind = rng.weighted(CLASSES);
  const name = rng.chance(0.6) ? `${word(rng)} ${rng.pick(SUFFIX)}` : word(rng);
  return {
    seed, name, cls: kind.cls, label: kind.label,
    stats: { ...rollStats(rng, kind.stats), ...rollResist(seed, kind.cls) },
    palette: rollPalette(rng, kind.cls),
    parts: PARTS[kind.cls](rng),
    weapon: rollWeapon(seed, kind.cls),
    glb: seed === STARTER_SEED ? 'crimson' : null,
  };
}

// Candidate seeds for the hangar: the current ship first, then derived variants.
export function candidateSeeds(current, count = 12) {
  return Array.from({ length: count }, (_, i) => (i === 0 ? current >>> 0 : hash32(current, i, 0x4a6)));
}
