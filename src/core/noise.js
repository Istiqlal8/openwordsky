// Seeded value noise (2D/3D) and fractal sums. Output range ~[0, 1].
import { hash32 } from './rng.js';

const U32 = 4294967296;
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

export function noise2(seed, x, z) {
  const x0 = Math.floor(x), z0 = Math.floor(z);
  const fx = smooth(x - x0), fz = smooth(z - z0);
  const a = hash32(seed, x0, z0) / U32;
  const b = hash32(seed, x0 + 1, z0) / U32;
  const c = hash32(seed, x0, z0 + 1) / U32;
  const d = hash32(seed, x0 + 1, z0 + 1) / U32;
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fz);
}

export function noise3(seed, x, y, z) {
  const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
  const fx = smooth(x - x0), fy = smooth(y - y0), fz = smooth(z - z0);
  const v = (i, j, k) => hash32(seed, x0 + i, y0 + j, z0 + k) / U32;
  const bottom = lerp(lerp(v(0, 0, 0), v(1, 0, 0), fx), lerp(v(0, 1, 0), v(1, 1, 0), fx), fy);
  const top = lerp(lerp(v(0, 0, 1), v(1, 0, 1), fx), lerp(v(0, 1, 1), v(1, 1, 1), fx), fy);
  return lerp(bottom, top, fz);
}

export function fbm2(seed, x, z, octaves = 4, gain = 0.5) {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += noise2(seed + o * 101, x * f, z * f) * amp;
    norm += amp;
    amp *= gain;
    f *= 2.03;
  }
  return sum / norm;
}

export function fbm3(seed, x, y, z, octaves = 4, gain = 0.5) {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += noise3(seed + o * 101, x * f, y * f, z * f) * amp;
    norm += amp;
    amp *= gain;
    f *= 2.03;
  }
  return sum / norm;
}

// Sharp crests: good for mountain ridges and canyons.
export function ridge2(seed, x, z, octaves = 4, gain = 0.5) {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let o = 0; o < octaves; o++) {
    const n = 1 - Math.abs(noise2(seed + o * 131, x * f, z * f) * 2 - 1);
    sum += n * n * amp;
    norm += amp;
    amp *= gain;
    f *= 2.03;
  }
  return sum / norm;
}
