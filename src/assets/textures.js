// Canvas-generated textures: glow sprites, rings, clouds, nebula sky, detail noise.
import * as THREE from 'three';
import { Rng, hash32 } from '../core/rng.js';
import { toRgb } from '../core/color.js';
import { cached, makeCanvas, toTexture, clamp01 } from './canvas.js';

export { cloudTexture, nebulaTexture } from './textures-sky.js';

const U32 = 4294967296;
const css = (r, g, b, a) => `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;

// Soft radial glow with faint rays, tinted by hex. For additive sprites.
export function glowTexture(hex) {
  return cached(`glow:${hex}`, () => {
    const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
    const [r, gg, b] = toRgb(hex);
    const mix = (t) => [r + (1 - r) * t, gg + (1 - gg) * t, b + (1 - b) * t];
    const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grad.addColorStop(0, css(1, 1, 1, 1));
    grad.addColorStop(0.08, css(...mix(0.7), 0.95));
    grad.addColorStop(0.25, css(...mix(0.2), 0.45));
    grad.addColorStop(0.55, css(r, gg, b, 0.12));
    grad.addColorStop(1, css(r, gg, b, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, S, S);
    drawRays(g, S, mix(0.5));
    return toTexture(c);
  });
}

function drawRays(g, S, rgb) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.translate(S / 2, S / 2);
  for (let i = 0; i < 12; i++) {
    const long = i % 3 === 0;
    const len = S * (long ? 0.48 : 0.3);
    const grad = g.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, css(...rgb, long ? 0.22 : 0.12));
    grad.addColorStop(1, css(...rgb, 0));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, -S * 0.012);
    g.lineTo(len, 0);
    g.lineTo(0, S * 0.012);
    g.fill();
    g.rotate((Math.PI * 2) / 12 + (i % 2 ? 0.07 : -0.05));
  }
  g.restore();
}

// Ring strip: x = 0 inner edge, x = 511 outer edge.
export function ringTexture(seed, hex) {
  return cached(`ring:${seed}:${hex}`, () => {
    const W = 512, H = 16, c = makeCanvas(W, H), g = c.getContext('2d');
    const rng = new Rng(hash32(seed, 0x7219));
    const bands = ringBands(rng);
    const gap = { at: rng.range(0.5, 0.72), w: rng.range(0.025, 0.06) };
    const [r, gg, b] = toRgb(hex);
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      const s = ringSample(bands, u);
      const edge = Math.min(clamp01(u / 0.08), clamp01((1 - u) / 0.12));
      const inGap = Math.abs(u - gap.at) < gap.w / 2 ? 0.06 : 1;
      const a = clamp01(s.alpha * edge * inGap);
      const k = 0.75 + s.bright * 0.5;
      g.fillStyle = css(clamp01(r * k + s.tint), clamp01(gg * k), clamp01(b * k - s.tint), a.toFixed(3));
      g.fillRect(x, 0, 1, H);
    }
    return toTexture(c);
  });
}

function ringBands(rng) {
  return Array.from({ length: 40 }, () => ({
    at: rng.next(), w: rng.range(0.004, 0.06), a: rng.range(-0.35, 0.45),
    bright: rng.range(-0.4, 0.4), tint: rng.range(-0.06, 0.06),
  }));
}

// Sum of soft bands at position u, plus fine per-pixel grain.
function ringSample(bands, u) {
  let alpha = 0.45, bright = 0.5, tint = 0;
  for (const bd of bands) {
    const d = (u - bd.at) / bd.w;
    const f = Math.exp(-d * d);
    alpha += bd.a * f;
    bright += bd.bright * f;
    tint += bd.tint * f;
  }
  const grain = hash32(Math.floor(u * 511), 91) / U32;
  return { alpha: alpha * (0.8 + grain * 0.35), bright: clamp01(bright), tint };
}

// Periodic value noise: lattice coords wrap modulo period p, so tiles repeat seamlessly.
function tileNoise(seed, x, y, p) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const h = (i, j) => hash32(seed, ((x0 + i) % p + p) % p, ((y0 + j) % p + p) % p) / U32;
  const a = h(0, 0) + (h(1, 0) - h(0, 0)) * sx;
  const b = h(0, 1) + (h(1, 1) - h(0, 1)) * sx;
  return a + (b - a) * sy;
}

// Tileable grayscale detail noise around 0.85..1.0 brightness.
export function detailTexture(seed) {
  return cached(`detail:${seed}`, () => {
    const S = 256, c = makeCanvas(S, S), g = c.getContext('2d');
    const img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        let sum = 0, amp = 1, norm = 0;
        for (let o = 0, p = 8; o < 5; o++, p *= 2) {
          sum += tileNoise(seed + o * 37, (x / S) * p, (y / S) * p, p) * amp;
          norm += amp;
          amp *= 0.55;
        }
        const v = Math.round((0.84 + 0.16 * clamp01((sum / norm - 0.2) / 0.6)) * 255);
        const i = (y * S + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const tex = toTexture(c, false);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  });
}
