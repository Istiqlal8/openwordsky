// Procedural bodies for the larger sea animals (forward +X, ~1 unit long; callers scale by
// body length): shark, dolphin, sea turtle, stingray and manta. Geometry and materials are
// shared per kind through a ModelKit. Each builder returns { group, anim(t, speed) }.
import * as THREE from 'three';
import { mergeParts } from './ocean-kit.js';

export class ModelKit {
  constructor() { this.geos = new Map(); this.mats = new Map(); }
  geo(key, fn) { if (!this.geos.has(key)) this.geos.set(key, fn()); return this.geos.get(key); }
  mat(key, fn) { if (!this.mats.has(key)) this.mats.set(key, fn()); return this.mats.get(key); }
  lit(key, extra = {}) { return this.mat(key, () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, ...extra })); }
  dispose() {
    this.geos.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
    this.geos.clear();
    this.mats.clear();
  }
}

// Countershading: vertices below `y` get the belly color.
function belly(geo, y, color) {
  const p = geo.attributes.position, c = geo.attributes.color, b = new THREE.Color(color);
  for (let i = 0; i < p.count; i++) if (p.getY(i) < y) c.setXYZ(i, b.r, b.g, b.b);
  return geo;
}

const eyes = (x, y, z, r = 0.03) => [-1, 1].map((s) => ({ geo: new THREE.SphereGeometry(r, 6, 4).translate(x, y, s * z), color: 0x080808 }));
const pivot = (x, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };

export function buildShark(kit, pal) {
  const body = kit.geo('shark-body', () => belly(mergeParts([
    { geo: new THREE.SphereGeometry(0.5, 18, 10).scale(1, 0.22, 0.24), color: pal.shark },
    { geo: new THREE.ConeGeometry(0.13, 0.24, 3).scale(1.3, 1, 0.12).translate(0.05, 0.2, 0), color: pal.shark },
    { geo: new THREE.BoxGeometry(0.16, 0.012, 0.36).rotateX(0.25).translate(0.12, -0.08, 0.14), color: pal.shark },
    { geo: new THREE.BoxGeometry(0.16, 0.012, 0.36).rotateX(-0.25).translate(0.12, -0.08, -0.14), color: pal.shark },
    ...eyes(0.36, 0.04, 0.09),
  ]), -0.04, 0xe8e8e0));
  const tailGeo = kit.geo('shark-tail', () => mergeParts([
    { geo: new THREE.CylinderGeometry(0.05, 0.07, 0.2, 6).rotateZ(Math.PI / 2).translate(-0.08, 0, 0), color: pal.shark },
    { geo: new THREE.ConeGeometry(0.06, 0.34, 3).scale(1, 1, 0.15).rotateZ(0.7).translate(-0.24, 0.12, 0), color: pal.shark },
    { geo: new THREE.ConeGeometry(0.05, 0.2, 3).scale(1, 1, 0.15).rotateZ(2.4).translate(-0.22, -0.07, 0), color: pal.shark },
  ]));
  const mat = kit.lit('shark', { roughness: 0.6 });
  const group = new THREE.Group(), tail = pivot(-0.42);
  group.add(new THREE.Mesh(body, mat), tail);
  tail.add(new THREE.Mesh(tailGeo, mat));
  return { group, anim: (t, sp) => { tail.rotation.y = Math.sin(t * (2 + sp * 0.8)) * 0.45; } };
}

export function buildDolphin(kit, pal) {
  const body = kit.geo('dolphin-body', () => belly(mergeParts([
    { geo: new THREE.SphereGeometry(0.5, 16, 10).scale(1, 0.2, 0.2), color: pal.dolphin },
    { geo: new THREE.CylinderGeometry(0.025, 0.04, 0.14, 6).rotateZ(Math.PI / 2).translate(0.54, -0.02, 0), color: pal.dolphin },
    { geo: new THREE.ConeGeometry(0.07, 0.16, 3).scale(1.4, 1, 0.14).rotateZ(-0.35).translate(-0.02, 0.15, 0), color: pal.dolphin },
    { geo: new THREE.BoxGeometry(0.12, 0.01, 0.34).rotateX(0.4).translate(0.18, -0.08, 0), color: pal.dolphin },
    ...eyes(0.4, 0.02, 0.075, 0.02),
  ]), -0.05, 0xe0e4e8));
  const fluke = kit.geo('dolphin-fluke', () => mergeParts([
    { geo: new THREE.CylinderGeometry(0.03, 0.05, 0.16, 6).rotateZ(Math.PI / 2).translate(-0.06, 0, 0), color: pal.dolphin },
    { geo: new THREE.BoxGeometry(0.1, 0.012, 0.3).translate(-0.16, 0, 0), color: pal.dolphin },
  ]));
  const mat = kit.lit('dolphin', { roughness: 0.35 });
  const group = new THREE.Group(), tail = pivot(-0.44);
  group.add(new THREE.Mesh(body, mat), tail);
  tail.add(new THREE.Mesh(fluke, mat));
  return { group, anim: (t, sp) => { tail.rotation.z = Math.sin(t * (2.5 + sp * 0.5)) * 0.4; } };
}

export function buildTurtle(kit, pal) {
  const shell = kit.geo('turtle-shell', () => {
    const g = mergeParts([
      { geo: new THREE.SphereGeometry(0.42, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.1, 0.5, 0.85), color: pal.turtle },
      { geo: new THREE.CylinderGeometry(0.4, 0.4, 0.04, 14).scale(1.1, 1, 0.85), color: 0xd8c890 },
      { geo: new THREE.SphereGeometry(0.1, 8, 6).scale(1.3, 0.8, 0.9).translate(0.52, 0.03, 0), color: 0x9a9a70 },
      ...eyes(0.6, 0.06, 0.05, 0.018),
    ]);
    const p = g.attributes.position, c = g.attributes.color;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0.05 && Math.sin(p.getX(i) * 30) * Math.sin(p.getZ(i) * 30) > 0.3) c.setXYZ(i, c.getX(i) * 0.6, c.getY(i) * 0.6, c.getZ(i) * 0.5);
    return g;
  });
  const flip = kit.geo('turtle-flipper', () => mergeParts([{ geo: new THREE.SphereGeometry(0.5, 8, 4).scale(0.18, 0.03, 0.5).translate(0, 0, 0.22), color: 0x9a9a70 }]));
  const mat = kit.lit('turtle', { roughness: 0.7, side: THREE.DoubleSide });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(shell, mat));
  const fins = [[0.22, 1, 1], [0.22, -1, 1], [-0.3, 1, 0.5], [-0.3, -1, 0.5]].map(([x, s, k]) => {
    const p = pivot(x, 0, s * 0.3);
    const m = new THREE.Mesh(flip, mat);
    m.scale.set(1, 1, s * k);
    p.add(m);
    group.add(p);
    return { p, s, k };
  });
  return { group, anim: (t) => { for (const f of fins) f.p.rotation.x = f.s * Math.sin(t * 1.6 + (f.k < 1 ? 1.5 : 0)) * 0.55 * f.k; } };
}

// Stingray (long whip tail) or manta (big dark wings, white belly, head fins).
export function buildRay(kit, pal, manta) {
  const key = manta ? 'manta' : 'ray', color = manta ? pal.manta : pal.ray;
  const core = kit.geo(`${key}-core`, () => belly(mergeParts([
    { geo: new THREE.SphereGeometry(0.5, 12, 8).scale(0.6, 0.12, 0.34), color },
    { geo: new THREE.CylinderGeometry(0.004, 0.02, manta ? 0.35 : 0.9, 4).rotateZ(Math.PI / 2).translate(manta ? -0.45 : -0.72, 0, 0), color },
    ...(manta ? [0.1, -0.1].map((z) => ({ geo: new THREE.BoxGeometry(0.14, 0.02, 0.04).translate(0.34, 0, z), color })) : []),
    ...eyes(0.18, 0.05, 0.1, 0.018),
  ]), -0.01, manta ? 0xf0f0ea : 0xd8d0c0));
  const wing = kit.geo(`${key}-wing`, () => belly(mergeParts([{ geo: new THREE.SphereGeometry(0.5, 12, 6).scale(0.55, 0.06, 0.5).translate(0, 0, 0.24), color }]), -0.005, manta ? 0xf0f0ea : 0xd8d0c0));
  const mat = kit.lit(key, { roughness: 0.7, side: THREE.DoubleSide });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(core, mat));
  const wings = [1, -1].map((s) => {
    const p = pivot(0, 0, s * 0.12), m = new THREE.Mesh(wing, mat);
    m.scale.z = s;
    p.add(m);
    group.add(p);
    return { p, s };
  });
  const rate = manta ? 1.1 : 1.8;
  return { group, anim: (t) => { for (const w of wings) w.p.rotation.x = w.s * Math.sin(t * rate) * 0.38; } };
}
