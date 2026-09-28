// Procedural skin: cached canvas textures (countershading + stripes/spots + fur/scale detail) and materials.
import * as THREE from 'three';
import { Rng } from '../../../core/rng.js';
import { shiftHex, mixHex } from '../../../core/color.js';

const W = 256, H = 128;
const CACHE = new Map(); // seed -> { map, bump, glow }
const CACHE_MAX = 16;
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;

// fur | scales | chitin | hide — decides texture detail and roughness.
export function skinKind(g) {
  if (g.legs >= 6 || g.body === 'segmen') return 'chitin';
  if (g.body === 'ular' || g.body === 'pipih') return 'scales';
  if (g.body === 'kubus') return 'hide';
  const r = new Rng((g.seed ?? 1) ^ 0x5c1e).next();
  if (g.body === 'tong') return r < 0.5 ? 'hide' : 'fur';
  return r < 0.7 ? 'fur' : 'scales';
}

function countershade(ctx, g) {
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  const belly = mixHex(g.primary, 0xf2e6cf, 0.55);
  grd.addColorStop(0, hex(shiftHex(g.primary, 0, 0, -0.1)));
  grd.addColorStop(0.35, hex(g.primary));
  grd.addColorStop(0.6, hex(g.primary));
  grd.addColorStop(0.8, hex(belly));
  grd.addColorStop(0.94, hex(belly));
  grd.addColorStop(0.95, '#ffffff');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
}

// Draws fn at x, x-W and x+W so patterns wrap horizontally.
const wrap = (fn) => { for (const o of [-W, 0, W]) fn(o); };

function stripes(ctx, rng, color) {
  ctx.fillStyle = color;
  const n = 5 + rng.int(5);
  for (let i = 0; i < n; i++) {
    const x = (i + rng.range(-0.2, 0.2)) * (W / n), w = rng.range(5, 12), bend = rng.range(-14, 14), end = H * rng.range(0.6, 0.78);
    wrap((o) => {
      ctx.beginPath();
      ctx.moveTo(o + x - w, 0);
      ctx.quadraticCurveTo(o + x + bend - w * 0.6, end * 0.5, o + x + bend * 0.4, end);
      ctx.quadraticCurveTo(o + x + bend + w * 0.6, end * 0.5, o + x + w, 0);
      ctx.fill();
    });
  }
}

function spots(ctx, rng, color, ring) {
  const n = 40 + rng.int(40);
  for (let i = 0; i < n; i++) {
    const x = rng.range(0, W), y = rng.range(2, H * 0.74), r = rng.range(2.5, 7) * (1 - y / H * 0.6);
    const sx = rng.range(0.8, 1.5), a = rng.range(0, 3);
    wrap((o) => {
      ctx.beginPath();
      ctx.ellipse(o + x, y, r * sx, r, a, 0, Math.PI * 2);
      if (ring) { ctx.lineWidth = r * 0.55; ctx.strokeStyle = color; ctx.stroke(); } else { ctx.fillStyle = color; ctx.fill(); }
    });
  }
}

function saddle(ctx, rng, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  const edge = H * rng.range(0.32, 0.48), amp = rng.range(3, 10), f = 1 + rng.int(4);
  for (let x = 0; x <= W; x += 8) ctx.lineTo(x, edge + Math.sin((x / W) * Math.PI * 2 * f) * amp);
  ctx.lineTo(W, 0);
  ctx.fill();
}

function pattern(ctx, g, rng) {
  const dark = hex(shiftHex(g.pattern === 'belang' ? g.secondary : g.primary, 0.02, 0.05, -0.3));
  if (g.pattern === 'belang') stripes(ctx, rng, dark);
  else if (g.pattern === 'totol') spots(ctx, rng, dark, rng.chance(0.35));
  else if (g.pattern === 'dua-warna') saddle(ctx, rng, hex(mixHex(shiftHex(g.secondary, 0, -0.1, -0.12), g.primary, 0.3)));
}

// Fine detail in grey: fur strands, overlapping scales, chitin plates or wrinkled hide.
function detail(ctx, kind, rng, alpha) {
  ctx.lineWidth = 1;
  if (kind === 'fur') {
    for (let i = 0; i < 1600; i++) {
      const x = rng.range(0, W), y = rng.range(0, H * 0.94), l = rng.range(2, 5);
      ctx.strokeStyle = rng.chance(0.5) ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha * 0.8})`;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng.range(-1.5, 1.5), y + l); ctx.stroke();
    }
  } else if (kind === 'scales') {
    ctx.strokeStyle = `rgba(0,0,0,${alpha * 3})`;
    for (let y = 0; y < H * 0.94; y += 5) {
      for (let x = (y / 5) % 2 ? 3 : 0; x < W; x += 6) { ctx.beginPath(); ctx.arc(x, y, 3.4, 0.15, Math.PI - 0.15); ctx.stroke(); }
    }
  } else if (kind === 'chitin') {
    ctx.fillStyle = `rgba(0,0,0,${alpha * 3})`;
    for (let x = 0; x < W; x += 21) ctx.fillRect(x, 0, 2, H * 0.94);
  } else {
    for (let i = 0; i < 260; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${alpha * 1.6})`;
      const x = rng.range(0, W), y = rng.range(0, H * 0.94);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng.range(-8, 8), y + rng.range(-3, 3)); ctx.stroke();
    }
  }
}

function glowLayer(ctx, g, rng) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  const c = hex(mixHex(g.secondary, 0xffffff, 0.25));
  if (g.glow && g.pattern === 'belang') stripes(ctx, new Rng((g.seed ?? 1) ^ 0x7e11), c);
  if (g.glow && g.pattern === 'totol') spots(ctx, new Rng((g.seed ?? 1) ^ 0x7e11), c, false);
  const dots = g.features?.includes('bintik') ? H * 0.5 : g.glow && (g.pattern === 'polos' || g.pattern === 'dua-warna') ? H * 0.08 : 0;
  ctx.fillStyle = c;
  for (let x = 6; dots && x < W; x += 16) {
    for (const dy of [-6, 6]) { ctx.beginPath(); ctx.arc(x + rng.range(-3, 3), dots + dy, 2.6, 0, Math.PI * 2); ctx.fill(); }
  }
}

function canvasTex(draw) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  draw(cv.getContext('2d'));
  const t = new THREE.CanvasTexture(cv);
  t.flipY = false;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function buildTextures(g) {
  const kind = skinKind(g), seed = (g.seed ?? 1) ^ 0x7e11;
  const map = canvasTex((ctx) => {
    countershade(ctx, g);
    pattern(ctx, g, new Rng(seed));
    detail(ctx, kind, new Rng(seed + 1), 0.07);
  });
  map.colorSpace = THREE.SRGBColorSpace;
  const bump = canvasTex((ctx) => {
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);
    detail(ctx, kind, new Rng(seed + 1), 0.25);
  });
  const lit = g.glow || g.features?.includes('bintik');
  const glow = lit ? canvasTex((ctx) => glowLayer(ctx, g, new Rng(seed + 2))) : null;
  return { map, bump, glow };
}

function textures(g) {
  if (typeof document === 'undefined') return {};
  const key = `${g.seed}:${g.primary}:${g.secondary}:${g.pattern}`;
  let t = CACHE.get(key);
  if (t) { CACHE.delete(key); CACHE.set(key, t); return t; }
  t = buildTextures(g);
  CACHE.set(key, t);
  if (CACHE.size > CACHE_MAX) {
    const [old, v] = CACHE.entries().next().value;
    CACHE.delete(old);
    for (const tex of Object.values(v)) tex?.dispose();
  }
  return t;
}

const ROUGH = { fur: 0.95, scales: 0.5, chitin: 0.32, hide: 0.8 };

export function skinMaterials(g) {
  const kind = skinKind(g), t = textures(g);
  const skin = new THREE.MeshStandardMaterial({ map: t.map ?? null, bumpMap: t.bump ?? null, bumpScale: kind === 'fur' ? 0.6 : 1.4,
    roughness: ROUGH[kind], metalness: kind === 'chitin' ? 0.15 : 0, vertexColors: true,
    emissiveMap: t.glow ?? null, emissive: t.glow ? 0xffffff : 0x000000, emissiveIntensity: t.glow ? 1 : 0 });
  const eye = g.glow ? new THREE.MeshBasicMaterial({ vertexColors: true })
    : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.1 });
  const glow = new THREE.MeshStandardMaterial({ color: g.secondary, emissive: g.secondary, emissiveIntensity: 1.3, roughness: 0.4 });
  return { skin, eye, glow };
}
