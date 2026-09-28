// Earth regional biomes and ground colors from height, slope and the large-scale fields:
// sand beaches, grassland, temperate forest, pine slopes, dry savanna, desert, bare rock, snow.
import { noise2 } from '../core/noise.js';
import { mixHex } from '../core/color.js';
import { earthFields, EARTH_SEA, EARTH_SEED } from './earth-terrain.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const F = {};
const C = {
  sand: 0xdcca98, wetSand: 0xb8a878, dune: 0xd6b27a, dry: 0xa8a45a, grass: 0x5a9a3c, lush: 0x3f8233,
  forest: 0x2f6428, pine: 0x3c5a34, rock: 0x7a746a, darkRock: 0x5a564f, snow: 0xf4f8ff, seabed: 0x8a8060,
};

// Per-point weights (0..1) describing the region. Shared by colors and flora placement.
export function earthRegion(x, z, y, out = {}) {
  const f = earthFields(x, z, F);
  const n = noise2(EARTH_SEED + 20, x / 90, z / 90);
  out.moist = f.moist + (n - 0.5) * 0.06;
  out.desert = clamp01((0.375 - out.moist) / 0.035) * clamp01((Math.hypot(x, z) - 1800) / 1200);
  out.forest = clamp01((out.moist - 0.52) / 0.04) * (1 - clamp01((y - 110) / 30));
  out.beach = y < EARTH_SEA + 2.4 ? 1 - clamp01((y - EARTH_SEA - 1.4) / 1) : 0;
  out.snowLine = 175 + (n - 0.5) * 60;
  out.snow = clamp01((y - out.snowLine) / 18);
  out.alpine = clamp01((y - 55) / 25) * (1 - out.snow);
  out.coast = f.cont;
  return out;
}

const R = {};
export const BIOMES = ['water', 'beach', 'grass', 'forest', 'pine', 'desert', 'rock', 'snow'];
export const B = Object.fromEntries(BIOMES.map((id, i) => [id, i]));

// Dominant biome code (index into BIOMES) for a precomputed region.
function biomeOf(r, y, slope) {
  if (y < EARTH_SEA + 0.3) return B.water;
  if (r.snow > 0.5) return B.snow;
  if (slope > 1.1) return B.rock;
  if (r.beach > 0.5) return B.beach;
  if (r.alpine > 0.5) return slope > 0.8 ? B.rock : B.pine;
  if (r.desert > 0.5) return B.desert;
  return r.forest > 0.5 ? B.forest : B.grass;
}

function lowland(x, z, r) {
  const patch = noise2(EARTH_SEED + 21, x / 24, z / 24);
  let c = mixHex(C.grass, C.lush, clamp01((r.moist - 0.46) * 8));
  c = mixHex(c, C.dry, clamp01((0.47 - r.moist) * 12));
  c = mixHex(c, C.forest, r.forest * 0.85);
  c = mixHex(c, C.dune, r.desert);
  return mixHex(c, patch > 0.5 ? C.lush : C.dry, Math.abs(patch - 0.5) * 0.35 * (1 - r.desert));
}

function colorOf(x, z, y, slope, r) {
  if (y < EARTH_SEA - 0.4) return mixHex(C.wetSand, C.seabed, clamp01((EARTH_SEA - 0.4 - y) / 8));
  let c = lowland(x, z, r);
  c = mixHex(c, C.pine, r.alpine * 0.9);
  c = mixHex(c, C.sand, r.beach);
  const rocky = clamp01((slope - 0.65) * 2.2) + r.alpine * clamp01((y - 110) / 40);
  c = mixHex(c, slope > 1.2 ? C.darkRock : C.rock, clamp01(rocky));
  if (r.snow > 0) c = mixHex(c, C.snow, r.snow * (slope > 1.3 ? 0.45 : 0.95));
  return c;
}

// Color (hex) and biome code in one field lookup. slope = rise / run.
export function earthGround(x, z, y, slope, out) {
  const r = earthRegion(x, z, y, R);
  out.color = colorOf(x, z, y, slope, r);
  out.biome = biomeOf(r, y, slope);
  return out;
}

const G = {};
export const earthColor = (x, z, y, slope) => earthGround(x, z, y, slope, G).color;
export const earthBiome = (x, z, y, slope) => BIOMES[earthGround(x, z, y, slope, G).biome];
