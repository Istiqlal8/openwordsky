// Ground work: terrain-hugging plaza and paths, the landing pad, foundations and door steps.
import * as THREE from 'three';
import { C } from './materials.js';
import { LAYOUT, pathSegments, groundY } from './site.js';

// Flat XZ geometry (base-local coords) moved into the world and draped over the terrain.
function drape(kit, bucket, geo, hex, ctx, lift) {
  const { frame, h, planet } = ctx, pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i), lz = pos.getZ(i), x = frame.x(lx, lz), z = frame.z(lx, lz);
    pos.setXYZ(i, x, groundY(h, planet, x, z) + lift, z);
  }
  geo.computeVertexNormals();
  kit.addWorld(bucket, geo, hex);
}

const flatRing = (r0, r1, seg, rings) => new THREE.RingGeometry(r0, r1, seg, rings).rotateX(-Math.PI / 2);

export function buildPlaza(kit, ctx) {
  const p = LAYOUT.plaza;
  drape(kit, 'ground', flatRing(0.01, p.r, 32, 8).translate(p.x, 0, p.z), C.plaza, ctx, 0.12);
  drape(kit, 'ground', flatRing(p.r, p.r + 0.9, 32, 1).translate(p.x, 0, p.z), C.tile, ctx, 0.14);
  drape(kit, 'ground', flatRing(2.2, 2.8, 24, 1).translate(p.x, 0, p.z), C.accent, ctx, 0.16);
  drape(kit, 'ground', flatRing(0.01, 1.2, 12, 1).translate(p.x, 0, p.z), C.teal, ctx, 0.16);
}

export function buildPaths(kit, ctx) {
  for (const [ax, az, bx, bz] of pathSegments()) {
    const len = Math.hypot(bx - ax, bz - az);
    const geo = new THREE.PlaneGeometry(2.4, len, 2, Math.ceil(len / 1.5)).rotateX(-Math.PI / 2);
    geo.rotateY(Math.atan2(bx - ax, bz - az)).translate((ax + bx) / 2, 0, (az + bz) / 2);
    drape(kit, 'ground', geo, C.path, ctx, 0.1);
  }
}

// Additive light pools on the ground under each lamp (visible at night).
export function addLightPool(kit, ctx, lx, lz) {
  drape(kit, 'pool', flatRing(0.01, 3.2, 16, 3).translate(lx, 0, lz), C.white, ctx, 0.2);
}

// Solid block (or slab on stilts when tall) from floor level (kit y = 0) down into the ground.
// shape: { w, d } rectangle or { r, seg } prism.
export function foundation(kit, shape, depth, hex = C.panel) {
  const deep = depth > 2.6, top = deep ? 0.7 : depth + 0.6, y = -0.06 - top / 2; // just under the floor slab
  if (shape.r) kit.add('hull', new THREE.CylinderGeometry(shape.r, shape.r, top, shape.seg ?? 8), hex, 0, y, 0, [0, Math.PI / 8, 0]);
  else kit.box('hull', hex, shape.w, top, shape.d, 0, y, 0);
  if (!shape.r) kit.box('hull', C.accent, shape.w * 0.98, 0.12, 0.08, 0, -0.3, shape.d / 2 + 0.01);
  if (!deep) return;
  const len = depth + 0.8, sx = shape.r ? shape.r * 0.7 : shape.w / 2 - 0.4, sz = shape.r ? shape.r * 0.7 : shape.d / 2 - 0.4;
  for (const [x, z] of [[-sx, -sz], [sx, -sz], [-sx, sz], [sx, sz], [0, 0]]) {
    kit.cyl('hull', C.steel, 0.35, 0.45, len, 6, x, -len, z);
  }
}

// Steps from floor level down to the ground in front of a door at local z0 (going +Z).
export function stairs(kit, drop, width, z0) {
  if (drop < 0.25) return;
  const n = Math.min(14, Math.ceil(drop / 0.3)), rise = drop / n;
  for (let i = 1; i <= n; i++) {
    const topY = -i * rise, hgt = drop - i * rise + 0.5 + rise;
    kit.box('hull', i % 2 ? C.tile : C.plaza, width, hgt, 0.5, 0, topY - hgt / 2 + rise, z0 + i * 0.5 - 0.25);
  }
}

// Landing pad: flat octagon at floor level with a chase-lit edge and an "H".
export function buildPad(kit, depth) {
  const r = LAYOUT.pad.r;
  kit.add('hull', new THREE.CylinderGeometry(r, r, 0.4, 8), C.pad, 0, -0.2, 0, [0, Math.PI / 8, 0]);
  foundation(kit, { r: r * 0.92, seg: 8 }, depth, C.steel);
  kit.add('pad', new THREE.RingGeometry(r - 1.3, r - 0.9, 32).rotateX(-Math.PI / 2), C.stripe, 0, 0.02, 0);
  kit.box('pad', C.stripe, 0.6, 0.04, 4.4, -1.5, 0.02, 0);
  kit.box('pad', C.stripe, 0.6, 0.04, 4.4, 1.5, 0.02, 0);
  kit.box('pad', C.stripe, 2.4, 0.04, 0.6, 0, 0.02, 0);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, rr = r - 0.35;
    kit.box('pad', i % 4 ? C.cool : C.green, 0.35, 0.18, 0.35, Math.cos(a) * rr, 0.09, Math.sin(a) * rr);
  }
}
