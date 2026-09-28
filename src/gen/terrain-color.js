// Ground vertex color: base patches, biome accents, strata, sand, snow, crater floors.
import { noise2 } from '../core/noise.js';
import { mixHex, shiftHex } from '../core/color.js';
import { earthColor } from '../earth/earth-biome.js';

const SAND = { swamp: 0x3b3322, volcanic: 0x201a1a, candy: 0xfff1f6, glass: 0x5a4f78, frozen: 0xe6eef4 };
const ACCENT_BIOMES = { exotic: 0.62, crystal: 0.6, fungal: 0.58, candy: 0.55, toxic: 0.7, swamp: 0.64 };
const cache = new WeakMap();
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Per-planet derived colors (shiftHex is too slow to run per vertex).
function tones(planet) {
  let t = cache.get(planet);
  if (t) return t;
  const p = planet.palette, id = planet.biome.id;
  t = {
    sand: SAND[id] ?? mixHex(p.ground1, 0xe8dcb0, 0.55),
    strataA: shiftHex(p.rock, 0.03, 0.08, 0.1),
    strataB: shiftHex(p.rock, -0.04, 0.05, -0.12),
    accent: id === 'candy' ? 0xfff7d6 : id === 'swamp' ? 0x252a14 : mixHex(p.floraAlt, p.ground1, 0.35),
    accentAt: ACCENT_BIOMES[id] ?? 2,
    sheen: id === 'glass' ? shiftHex(p.water, 0, 0.2, 0.15) : 0,
    floor: shiftHex(p.ground2, 0, -0.1, -0.12),
    craters: planet.terrain.style === 'craters',
    // Snow needs water vapour: dry, thin-air worlds (e.g. Mars) stay bare.
    snowAt: !planet.terrain.hasWater && planet.atmosphereDensity < 0.5 ? 2
      : planet.temperature < -10 ? 0.6 : planet.temperature < 8 ? 0.84 : 2,
  };
  cache.set(planet, t);
  return t;
}

function baseColor(planet, t, x, z) {
  const p = planet.palette, seed = planet.seed;
  const patch = noise2(seed + 99, x * 0.03, z * 0.03);
  let c = mixHex(p.ground1, p.ground2, clamp01(patch * 1.4 - 0.2));
  if (t.accentAt < 1) {
    const a = noise2(seed + 7, x * 0.011, z * 0.011);
    if (a > t.accentAt) c = mixHex(c, t.accent, clamp01((a - t.accentAt) * 6));
  }
  if (t.sheen) c = mixHex(c, t.sheen, Math.max(0, Math.sin(x * 0.07 + z * 0.045 + patch * 5) - 0.75) * 2.4);
  return c;
}

// Horizontal rock bands on cliffs.
function strata(t, rock, y, slope) {
  const band = Math.sin(y * 1.1) + Math.sin(y * 2.7 + 1.3) * 0.5;
  const s = band > 0.35 ? t.strataA : band < -0.45 ? t.strataB : rock;
  return mixHex(rock, s, clamp01((slope - 0.55) * 3));
}

// slope: 0 (flat) .. 1+ (steep); y relative to terrain amplitude.
export function groundColor(planet, x, z, y, slope) {
  if (planet.style === 'earth') return earthColor(x, z, y, slope);
  const p = planet.palette, t = tones(planet), ter = planet.terrain;
  let c = baseColor(planet, t, x, z);
  const high = (y / (ter.amp || 1) + 1) / 2;
  if (t.craters && high < 0.42) c = mixHex(c, t.floor, clamp01((0.42 - high) * 5));
  if (high > 0.72) c = mixHex(c, p.rock, clamp01((high - 0.72) * 4));
  if (slope > 0.55) c = mixHex(c, strata(t, p.rock, y, slope), clamp01((slope - 0.55) * 2.5));
  if (ter.hasWater && y < ter.waterY + 1.8) c = mixHex(c, t.sand, y < ter.waterY + 1 ? 0.75 : 0.4);
  if (high > t.snowAt && slope < 0.9) c = mixHex(c, 0xf4f8ff, clamp01((high - t.snowAt) * 8) * 0.85);
  return c;
}
