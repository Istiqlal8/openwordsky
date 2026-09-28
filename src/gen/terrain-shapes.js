// Extra terrain styles. Each returns a normalized height (~0..1, 0.45 = datum)
// for world x/z; heightFn scales it by the planet amplitude.
import { fbm2, ridge2 } from '../core/noise.js';
import { hash32 } from '../core/rng.js';

const U8 = 1 / 255;
const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Bowl with a raised rim; d = distance / radius.
function craterProfile(d) {
  if (d > 1.6) return 0;
  const bowl = d < 1 ? (d * d - 1) * 0.55 : 0;
  const rim = Math.exp(-((d - 1) * (d - 1)) / 0.045) * 0.22;
  return bowl + rim;
}

// Sum of crater profiles from a jittered cell grid (cells are 1/k world units wide).
function craterField(seed, x, z, k, chance) {
  const u = x * k, v = z * k;
  const cu = Math.floor(u), cv = Math.floor(v);
  let sum = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const h = hash32(seed, cu + i, cv + j);
      if ((h & 255) * U8 > chance) continue;
      const r = 0.18 + ((h >>> 24) & 255) * U8 * 0.3;
      const du = u - (cu + i + 0.2 + ((h >>> 8) & 255) * U8 * 0.6);
      const dv = v - (cv + j + 0.2 + ((h >>> 16) & 255) * U8 * 0.6);
      sum += craterProfile(Math.sqrt(du * du + dv * dv) / r) * r * 2.4;
    }
  }
  return sum;
}

export function craters(seed, x, z, f, gain) {
  const n = fbm2(seed, x * f, z * f, 4, gain);
  const big = craterField(seed + 31, x, z, f * 1.6, 0.55);
  const small = craterField(seed + 57, x, z, f * 5, 0.45) * 0.35;
  return 0.42 + (n - 0.5) * 0.6 + big + small;
}

// Flat-topped uplands cut by deep winding channels with flat floors.
export function canyons(seed, x, z, f, gain) {
  const n = fbm2(seed, x * f, z * f, 4, gain);
  const r = ridge2(seed + 7, x * f * 1.1, z * f * 1.1, 2, 0.35);
  const cut = smooth(0.5, 0.78, r);
  const top = 0.72 + (n - 0.5) * 0.35;
  const step = Math.round(cut * 3) / 3 * 0.25 + cut * 0.75; // stepped walls
  return top - step * 0.62;
}

// Rolling ground with sparse sheer pillars and mesas.
export function spires(seed, x, z, f, gain) {
  const n = fbm2(seed, x * f, z * f, 4, gain);
  const k = f * 3.2, u = x * k, v = z * k;
  const cu = Math.floor(u), cv = Math.floor(v);
  let pillar = 0;
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const h = hash32(seed + 13, cu + i, cv + j);
      if ((h & 255) * U8 > 0.42) continue;
      const w = ((h >>> 24) & 255) * U8;
      const r = w > 0.85 ? 0.28 + (w - 0.85) : 0.1 + w * 0.14; // a few wide mesas
      const du = u - (cu + i + 0.25 + ((h >>> 8) & 255) * U8 * 0.5);
      const dv = v - (cv + j + 0.25 + ((h >>> 16) & 255) * U8 * 0.5);
      const d = Math.sqrt(du * du + dv * dv) / r;
      const tall = 0.6 + ((h >>> 12) & 255) * U8 * 0.9;
      pillar = Math.max(pillar, smooth(1, 0.72, d) * tall);
    }
  }
  return 0.35 + (n - 0.5) * 0.5 + pillar;
}

// Hillsides cut into flat steps with short risers (rice-paddy / mesa feel).
export function terraces(seed, x, z, f, gain) {
  const n = fbm2(seed, x * f, z * f, 5, gain);
  const s = (n - 0.2) * 9;
  const fl = Math.floor(s);
  return 0.2 + (fl + smooth(0.78, 1, s - fl)) / 9 * 1.1;
}

// Sea floor with scattered islands (tops well above any water level).
export function archipelago(seed, x, z, f, gain) {
  const n = fbm2(seed, x * f, z * f, 5, gain);
  const isle = smooth(0.5, 0.62, n);
  return 0.08 + n * 0.25 + isle * (0.45 + (n - 0.5) * 0.8);
}
