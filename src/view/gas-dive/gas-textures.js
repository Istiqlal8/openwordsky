// Canvas textures for the gas dive: soft cloud puffs, a tileable cloud deck and a storm spiral.
import * as THREE from 'three';
import { Rng, hash32 } from '../../core/rng.js';
import { cached, makeCanvas, toTexture, clamp01 } from '../../assets/canvas.js';

const U32 = 4294967296;
const smooth = (t) => t * t * (3 - 2 * t);

// Periodic value noise: lattice wraps every p cells so the tile repeats seamlessly.
function tileNoise(seed, x, y, p) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const sx = smooth(x - x0), sy = smooth(y - y0);
  const h = (i, j) => hash32(seed, ((x0 + i) % p + p) % p, ((y0 + j) % p + p) % p) / U32;
  const a = h(0, 0) + (h(1, 0) - h(0, 0)) * sx;
  const b = h(0, 1) + (h(1, 1) - h(0, 1)) * sx;
  return a + (b - a) * sy;
}

function tileFbm(seed, u, v, base, octaves) {
  let sum = 0, amp = 1, norm = 0;
  for (let o = 0, p = base; o < octaves; o++, p *= 2) {
    sum += tileNoise(seed + o * 31, u * p, v * p, p) * amp;
    norm += amp;
    amp *= 0.55;
  }
  return sum / norm;
}

// Paint a grayscale canvas where fn(u, v) returns [value, alpha] in 0..1.
function paintGray(S, fn) {
  const c = makeCanvas(S, S), g = c.getContext('2d');
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const [val, a] = fn(x / S, y / S);
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(clamp01(val) * 255);
      img.data[i + 3] = Math.round(clamp01(a) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Lumpy cloud blob: radial falloff broken up by noise. Alpha only (white RGB).
export function puffTexture() {
  return cached('gasdive:puff', () => {
    const c = paintGray(128, (u, v) => {
      const dx = u - 0.5, dy = v - 0.5;
      const r = Math.hypot(dx, dy) * 2;
      const n = tileFbm(77, u, v, 4, 4);
      const a = smooth(clamp01((1 - r) * 1.6)) * clamp01(0.35 + n * 1.1);
      return [1, a * a * 1.4];
    });
    return toTexture(c, false);
  });
}

// Tileable deck coverage map (R channel) used by the big layer planes.
export function deckTexture(seed) {
  return cached(`gasdive:deck:${seed}`, () => {
    const s = hash32(seed, 0xdec);
    const c = paintGray(256, (u, v) => {
      const n = tileFbm(s, u, v, 4, 5);
      return [n, 1];
    });
    const tex = toTexture(c, false);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });
}

// Storm eye: logarithmic spiral arms around a dark core. Alpha fades at the rim.
export function spiralTexture(seed) {
  return cached(`gasdive:spiral:${seed}`, () => {
    const rng = new Rng(hash32(seed, 0x5b1));
    const arms = 2 + rng.int(3), twist = rng.range(5, 8);
    const c = paintGray(256, (u, v) => {
      const dx = u - 0.5, dy = v - 0.5, r = Math.hypot(dx, dy) * 2;
      const ang = Math.atan2(dy, dx);
      const arm = 0.5 + 0.5 * Math.sin(ang * arms + Math.log(r + 0.02) * twist);
      const n = tileFbm(seed, u, v, 8, 3);
      const val = 0.45 + 0.4 * arm * smooth(clamp01(r * 3)) + (n - 0.5) * 0.3;
      return [val * (0.55 + 0.45 * smooth(clamp01(r * 4))), smooth(clamp01((1 - r) * 3))];
    });
    return toTexture(c, false);
  });
}
