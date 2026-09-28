// Earth ("Bumi") geography: continents and ocean, beaches, plains, rolling hills, mountain
// ranges with snow, rivers and lakes. One fixed seed, so Earth looks the same in every save.
// Heights are in meters with the sea at EARTH_SEA.
import { noise2, fbm2, ridge2 } from '../core/noise.js';

export const EARTH_SEED = 0xea27;
export const EARTH_SEA = -1;
const S = EARTH_SEED;
// World origin sits on a grassy coastal plain just north of a sandy bay.
const OX = -600, OZ = 2780;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// Large-scale fields shared by height and biome lookups. Writes into `out` and returns it.
export function earthFields(x, z, out) {
  x += OX;
  z += OZ;
  const wx = x + (fbm2(S + 1, x / 2600, z / 2600, 3) - 0.5) * 2200;
  const wz = z + (fbm2(S + 2, x / 2600 + 7.3, z / 2600, 3) - 0.5) * 2200;
  // Continentalness: < 0 ocean, > 0 land. The origin is nudged onto a coast.
  out.cont = (fbm2(S + 3, wx / 7000, wz / 7000, 4, 0.5) - 0.5) * 1.6 + 0.03;
  out.belt = smooth(0.56, 0.68, fbm2(S + 4, wx / 5200, wz / 5200, 3, 0.5));
  out.moist = fbm2(S + 5, wx / 3200, wz / 3200, 3, 0.5);
  out.river = Math.abs(fbm2(S + 6, wx / 2400, wz / 2400, 3, 0.45) - 0.5);
  return out;
}

const F = {};

// Continental base elevation: ocean floor, shelf, beach, low plains rising inland.
function baseHeight(c) {
  if (c < 0) return Math.max(-46, c * 520) - 1.2;
  return c * 70 + smooth(0, 0.02, c) * 1.8 - 1.2;
}

function mountains(x, z, c, belt) {
  if (belt <= 0) return 0;
  const r = ridge2(S + 7, x / 1500, z / 1500, 5, 0.5);
  return belt * smooth(0.02, 0.12, c) * (r * r * 520 + r * 40);
}

function hills(x, z, c) {
  const mask = smooth(0.35, 0.7, fbm2(S + 8, x / 2800, z / 2800, 2)) * smooth(0.01, 0.06, c);
  if (mask <= 0) return 0;
  return (fbm2(S + 9, x / 420, z / 420, 4, 0.5) - 0.42) * 46 * mask;
}

// Carves river valleys (lowlands only) down to just below sea level.
function carveRiver(y, f) {
  const k = smooth(0.02, 0.006, f.river) * (1 - f.belt) * smooth(0.012, 0.05, f.cont);
  if (k <= 0 || y > 55) return y;
  return y + (EARTH_SEA - 1.6 - y) * k * smooth(55, 25, y);
}

export function earthHeight(x, z) {
  const f = earthFields(x, z, F);
  x += OX;
  z += OZ;
  let y = baseHeight(f.cont) + hills(x, z, f.cont) + mountains(x, z, f.cont, f.belt);
  y = carveRiver(y, f);
  return y + (noise2(S + 10, x / 38, z / 38) - 0.5) * 1.4;
}
