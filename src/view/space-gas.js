// Banded gas-giant textures (and Venus's cloud deck): latitude bands warped by
// turbulence, plus an optional storm spot. Hand-tuned palettes per planet.style.
import * as THREE from 'three';
import { fbm3 } from '../core/noise.js';
import { Rng, hash32 } from '../core/rng.js';
import { cached, makeCanvas, toTexture, sphereDir } from '../assets/canvas.js';

const W = 1024, H = 512;
const TW = 256, TH = 128;

export const GAS_STYLES = {
  jupiter: { bands: [0xe9dcc2, 0xc79467, 0xf1e6d2, 0xa8683e, 0xdcc19a, 0x8f5a3c, 0xefe2c8], count: 28,
    turb: 0.045, contrast: 1, spot: { color: 0xb8503a, lat: -0.2, w: 0.09, h: 0.045 }, glow: 0xd9c49a },
  saturn: { bands: [0xeadcaa, 0xd8c28c, 0xf1e5bd, 0xcbb07a, 0xe3cf9d], count: 18, turb: 0.02, contrast: 0.7, glow: 0xe8d9a8 },
  uranus: { bands: [0xaee3e6, 0x9fd8dd, 0xb8e9eb], count: 10, turb: 0.01, contrast: 0.35, glow: 0x9fe6f0 },
  neptune: { bands: [0x3f63d6, 0x2f4cb4, 0x4d74e6, 0x3656c4], count: 12, turb: 0.03, contrast: 0.8,
    spot: { color: 0x172464, lat: -0.3, w: 0.05, h: 0.03 }, glow: 0x5d86ff },
  venus: { bands: [0xeedcaa, 0xf4e6bf, 0xe0c890, 0xf1dfb0], count: 9, turb: 0.09, contrast: 0.6, glow: 0xf5e2b0 },
};

export function isGasLike(planet) {
  return Boolean(planet.gas) || planet.style === 'venus';
}

// Procedural gas giants take their band colors from the planet palette.
function styleOf(planet) {
  const known = GAS_STYLES[planet.style];
  if (known) return known;
  const p = planet.palette;
  const rng = new Rng(hash32(planet.seed, 0x6a5));
  const spot = rng.chance(0.5) ? { color: p.rock, lat: rng.range(-0.35, 0.35), w: rng.range(0.04, 0.08), h: 0.035 } : null;
  return { bands: [p.ground1, p.sky, p.ground2, p.fog, p.rock], count: 10 + rng.int(10),
    turb: rng.range(0.02, 0.07), contrast: rng.range(0.6, 1), spot, glow: p.sky };
}

export function gasGlowColor(planet) {
  return styleOf(planet).glow;
}

// Canvas pixels are sRGB; THREE.Color stores linear values.
const srgb = (hex) => new THREE.Color(hex).convertLinearToSRGB();

// Color per latitude row: random-width bands blended softly.
function bandTable(rng, style) {
  const cols = style.bands.map((h) => srgb(h));
  const mean = cols.reduce((a, c) => a.add(c), new THREE.Color(0, 0, 0)).multiplyScalar(1 / cols.length);
  const stops = Array.from({ length: style.count }, () => ({ w: rng.range(0.5, 1.6), c: rng.pick(cols) }));
  const total = stops.reduce((a, s) => a + s.w, 0);
  const table = [];
  for (const s of stops) {
    const rows = Math.max(1, Math.round((s.w / total) * H));
    const c = mean.clone().lerp(s.c, style.contrast);
    for (let i = 0; i < rows; i++) table.push(c);
  }
  while (table.length < H) table.push(table[table.length - 1]);
  return blurTable(table.slice(0, H), 3);
}

function blurTable(table, r) {
  return table.map((_, i) => {
    const c = new THREE.Color(0, 0, 0);
    for (let k = -r; k <= r; k++) c.add(table[Math.min(H - 1, Math.max(0, i + k))]);
    return c.multiplyScalar(1 / (2 * r + 1));
  });
}

// Low-res turbulence grid sampled on the sphere (seamless in longitude).
function turbulenceGrid(seed) {
  const g = new Float32Array(TW * TH);
  for (let y = 0; y < TH; y++) {
    for (let x = 0; x < TW; x++) {
      const [dx, dy, dz] = sphereDir(x / TW, (y + 0.5) / TH);
      g[y * TW + x] = fbm3(seed, dx * 4 + 11, dy * 14 + 11, dz * 4 + 11, 4) - 0.5;
    }
  }
  return g;
}

function sampleGrid(g, u, v) {
  const x = u * TW, y = Math.min(TH - 1.001, Math.max(0, v * TH - 0.5));
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const at = (i, j) => g[(j * TW) + (((x0 + i) % TW) + TW) % TW];
  const a = at(0, y0) + (at(1, y0) - at(0, y0)) * fx;
  const b = at(0, y0 + 1) + (at(1, y0 + 1) - at(0, y0 + 1)) * fx;
  return a + (b - a) * fy;
}

// Storm: swirl the band lookup around the spot and tint its core.
function spotAt(spot, u, v) {
  if (!spot) return null;
  let du = u - 0.3;
  du -= Math.round(du);
  const dx = du / spot.w, dy = (v - (0.5 - spot.lat * 0.5)) / spot.h;
  const d = Math.hypot(dx, dy);
  if (d > 1.8) return null;
  return { d, swirl: Math.max(0, 1.8 - d) * 0.9, dx, dy };
}

function pixel(ctx, u, v, out) {
  const { table, grid, style, spotColor } = ctx;
  let lat = v + sampleGrid(grid, u, v) * style.turb * 2;
  lat += Math.sin(u * Math.PI * 24 + v * 40) * style.turb * 0.08;
  const s = spotAt(style.spot, u, v);
  if (s) lat += Math.sin(Math.atan2(s.dy, s.dx) + s.swirl * 3) * s.swirl * style.spot.h * 0.6;
  const row = Math.min(H - 1, Math.max(0, Math.round(lat * H)));
  out.copy(table[row]);
  if (s && s.d < 1) out.lerp(spotColor, (1 - s.d * s.d) * 0.9);
  else if (s && s.d < 1.3) out.multiplyScalar(1.08);
  return out;
}

function paint(planet, style) {
  const rng = new Rng(hash32(planet.seed, 0x6a51));
  const ctx = { table: bandTable(rng, style), grid: turbulenceGrid(planet.seed + 5), style,
    spotColor: srgb(style.spot?.color ?? 0) };
  const canvas = makeCanvas(W, H);
  const g = canvas.getContext('2d');
  const img = g.createImageData(W, H);
  const c = new THREE.Color();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      pixel(ctx, x / W, (y + 0.5) / H, c);
      const i = (y * W + x) * 4;
      img.data[i] = c.r * 255; img.data[i + 1] = c.g * 255; img.data[i + 2] = c.b * 255; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return toTexture(canvas);
}

export function gasTexture(planet) {
  const style = styleOf(planet);
  return cached(`gas:${planet.seed}:${planet.style ?? ''}`, () => paint(planet, style));
}
