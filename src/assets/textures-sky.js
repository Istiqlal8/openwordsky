// Equirectangular textures: planet cloud layer and space nebula background.
import { Rng, hash32 } from '../core/rng.js';
import { fbm3 } from '../core/noise.js';
import { hsl, toRgb } from '../core/color.js';
import { cached, makeCanvas, toTexture, sphereDir, clamp01 } from './canvas.js';

const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// Fill a (w + 2) x h canvas where column 0 / w + 1 wrap around, so a smoothed
// upscale of the inner w columns stays seamless. fn(u, v) -> [r, g, b, a] in 0..1.
function paintLowRes(w, h, fn) {
  const c = makeCanvas(w + 2, h), g = c.getContext('2d');
  const img = g.createImageData(w + 2, h);
  for (let y = 0; y < h; y++) {
    const v = (y + 0.5) / h;
    for (let x = 0; x < w + 2; x++) {
      const px = fn((((x - 1 + w) % w) + 0.5) / w, v);
      const i = (y * (w + 2) + x) * 4;
      for (let k = 0; k < 4; k++) img.data[i + k] = Math.round(clamp01(px[k]) * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Draw the inner columns of a padded low-res canvas stretched over dst.
function upscale(dst, src) {
  const g = dst.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 1, 0, src.width - 2, src.height, 0, 0, dst.width, dst.height);
  return g;
}

// White clouds with alpha; transparent where clear.
export function cloudTexture(seed) {
  return cached(`cloud:${seed}`, () => {
    const rng = new Rng(hash32(seed, 0xc10d));
    const cover = rng.range(0.47, 0.6);
    const scale = rng.range(2.2, 4);
    const s = hash32(seed, 11);
    const low = paintLowRes(512, 256, (u, v) => {
      const [x, y, z] = sphereDir(u, v);
      const warp = fbm3(s + 3, x * 1.5, y * 1.5, z * 1.5, 3) - 0.5;
      const n = fbm3(s, x * scale + warp, y * scale * 1.3, z * scale - warp, 5, 0.55);
      const a = smoothstep(cover, cover + 0.18, n);
      const shade = 0.82 + 0.18 * a;
      return [shade, shade, shade, a * 0.92];
    });
    const c = makeCanvas(1024, 512);
    upscale(c, low);
    return toTexture(c);
  });
}

// Colorful nebula clouds on near-black; returns one pixel's [r, g, b, 1].
function nebulaPixel(s, main, accent, u, v) {
  const [x, y, z] = sphereDir(u, v);
  const w = fbm3(s + 5, x * 1.8, y * 1.8, z * 1.8, 3) - 0.5;
  const n1 = fbm3(s, x * 2 + w, y * 2 - w, z * 2, 5, 0.55);
  const n2 = fbm3(s + 9, x * 3.5 - w, y * 3.5, z * 3.5 + w, 4, 0.5);
  const dust = fbm3(s + 17, x * 6, y * 6, z * 6, 3);
  const a = Math.pow(smoothstep(0.45, 0.8, n1), 1.6) * 0.55;
  const b = Math.pow(smoothstep(0.55, 0.85, n2), 2) * 0.35;
  const dark = 0.55 + 0.45 * smoothstep(0.3, 0.6, dust);
  const out = [0, 0, 0, 1];
  for (let k = 0; k < 3; k++) out[k] = (0.012 + main[k] * a + accent[k] * b) * dark;
  return out;
}

// Deep-space background: nebula around hue plus a complementary accent, with stars.
export function nebulaTexture(seed, hue) {
  return cached(`nebula:${seed}:${hue}`, () => {
    const rng = new Rng(hash32(seed, 0x6eb));
    const main = toRgb(hsl(hue, 0.7, 0.55));
    const accent = toRgb(hsl(hue + 0.5 + rng.range(-0.08, 0.08), 0.65, 0.5));
    const s = hash32(seed, 23);
    const low = paintLowRes(256, 128, (u, v) => nebulaPixel(s, main, accent, u, v));
    const c = makeCanvas(2048, 1024);
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);
    upscale(c, low);
    drawStars(g, c.width, c.height, rng);
    return toTexture(c);
  });
}

function drawStars(g, W, H, rng) {
  for (let i = 0; i < 700; i++) {
    const x = rng.next() * W;
    const v = Math.acos(1 - 2 * rng.next()) / Math.PI; // uniform over the sphere
    const stretch = Math.min(4, 1 / Math.max(0.25, Math.sin(v * Math.PI)));
    const big = rng.chance(0.06);
    const r = big ? rng.range(1.2, 2.2) : rng.range(0.4, 1.1);
    const tint = hsl(rng.pick([0.08, 0.12, 0.58, 0.62, 0]), rng.range(0, 0.5), rng.range(0.8, 0.95));
    for (const ox of [0, x < 12 ? W : x > W - 12 ? -W : null]) {
      if (ox === null) continue;
      drawStar(g, x + ox, v * H, r, stretch, tint, big, rng.range(0.5, 1));
    }
  }
}

function drawStar(g, x, y, r, stretch, hex, big, alpha) {
  const [cr, cg, cb] = toRgb(hex).map((c) => Math.round(c * 255));
  if (big) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r * 4);
    grad.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha * 0.5})`);
    grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    g.fillStyle = grad;
    g.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  }
  g.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
  g.beginPath();
  g.ellipse(x, y, r * stretch, r, 0, 0, Math.PI * 2);
  g.fill();
}
