// Shared helpers for canvas-generated textures.
import * as THREE from 'three';

const cache = new Map(); // insertion order doubles as LRU order
const MAX_CACHED = 48;

// Return the cached texture for key, building it on first request.
// Least-recently-used textures beyond MAX_CACHED are disposed; three.js
// re-uploads one automatically if a material still uses it.
export function cached(key, build) {
  let tex = cache.get(key);
  if (tex) {
    cache.delete(key);
  } else {
    tex = build();
  }
  cache.set(key, tex);
  if (cache.size > MAX_CACHED) evictOldest();
  return tex;
}

function evictOldest() {
  const [key, tex] = cache.entries().next().value;
  cache.delete(key);
  tex.dispose();
}

// Drop a cached texture and free its GPU memory (and any cube map made from it).
export function release(tex) {
  for (const [key, value] of cache) {
    if (value === tex) cache.delete(key);
  }
  tex.dispose();
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function toTexture(canvas, color = true) {
  const tex = new THREE.CanvasTexture(canvas);
  if (color) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Unit-sphere direction for equirectangular coords u, v in [0, 1].
// Sampling noise here makes the texture wrap seamlessly at u = 0 / 1.
export function sphereDir(u, v) {
  const lon = u * Math.PI * 2;
  const lat = (0.5 - v) * Math.PI;
  const c = Math.cos(lat);
  return [c * Math.cos(lon), Math.sin(lat), c * Math.sin(lon)];
}

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
