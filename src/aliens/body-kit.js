// Shared helpers for alien models: a geometry pool, per-individual materials, meshes and pivots.
import * as THREE from 'three';
import { hsl } from '../core/color.js';

// Geometry pool: one geometry per (type, args) for a whole outpost or fleet; dispose() frees all.
export class GeoKit {
  constructor() { this.cache = new Map(); }

  get(type, ...args) {
    const key = `${type}:${args.join(',')}`;
    let g = this.cache.get(key);
    if (!g) { g = new THREE[`${type}Geometry`](...args); this.cache.set(key, g); }
    return g;
  }

  sphere(detail = 14) { return this.get('Sphere', 1, detail, Math.round(detail * 0.7)); }
  cap(r, len) { return this.get('Capsule', r, len, 3, 8); }
  cyl(rt, rb, h, seg = 12) { return this.get('Cylinder', rt, rb, h, seg); }
  cone(r, h, seg = 12) { return this.get('Cone', r, h, seg); }
  box(w, h, d) { return this.get('Box', w, h, d); }
  torus(r, t) { return this.get('Torus', r, t, 6, 18); }
  ico(r, detail) { return this.get('Icosahedron', r, detail); }

  dispose() {
    for (const g of this.cache.values()) g.dispose();
    this.cache.clear();
  }
}

// Per-individual color variant: skin + secondary tone around the race hue, glowing parts.
export function makeMats(race, rng) {
  const hue = rng.range(race.hue[0], race.hue[1]);
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.55, ...o });
  const glow = new THREE.Color(race.glow).offsetHSL(rng.range(-0.04, 0.04), 0, 0);
  const mats = {
    skin: std({ color: hsl(hue, rng.range(0.3, 0.6), rng.range(0.42, 0.6)) }),
    dark: std({ color: hsl(hue + rng.range(-0.1, 0.1), 0.35, rng.range(0.16, 0.28)) }),
    accent: std({ color: hsl(hue + 0.5, 0.55, 0.55), side: THREE.DoubleSide }),
    glow: std({ color: 0x111111, emissive: glow, emissiveIntensity: 1.6 }),
    eye: std({ color: 0xf4f1e6, roughness: 0.25 }),
    pupil: std({ color: 0x07080c, roughness: 0.2 }),
  };
  mats.all = Object.values(mats);
  return mats;
}

export function mesh(geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

export function pivot(x = 0, y = 0, z = 0, ...children) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (children.length) g.add(...children);
  return g;
}

// Limb hanging down from its pivot (capsule of radius r, straight length len).
export function limb(kit, mat, x, y, z, r, len) {
  return pivot(x, y, z, mesh(kit.cap(r, len), mat, 0, -len / 2 - r * 0.5, 0));
}

// Pair of eyes on the -Z face; returns meshes to blink (scale.y).
export function eyePair(kit, mats, parent, { x, y, z, r, glow = false, pupil = true }) {
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = mesh(kit.sphere(10), glow ? mats.glow : mats.eye, s * x, y, z, r);
    if (pupil && !glow) e.add(mesh(kit.sphere(8), mats.pupil, 0, 0, -0.62, 0.5));
    parent.add(e);
    eyes.push(e);
  }
  return eyes;
}

// Empty rig record that the race builders fill in.
export function newRig() {
  return { root: new THREE.Group(), legs: [], arms: [], head: null, eyes: [], frills: [], spin: [],
    torso: null, float: false, unit: 1.8, wave: 1 };
}
