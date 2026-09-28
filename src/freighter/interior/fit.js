// Fittings reused by several layouts: a bridge facing a +Z window, wall pillars, instanced
// boxes, cargo clutter, floor strips and chase lights.
import * as THREE from 'three';
import { box, glow, instances } from '../kit.js';
import { chair, crateStack } from '../interior-props.js';
import { windowPane, consoles } from '../interior-rooms.js';
import { aabb } from '../walkable.js';

// Window of width w at z = zWin (sill 1, top 6.2 above y), a console row and the captain's chair.
export function bridgeFit(ctx, { cx = 0, zWin, w = 20, y = 0, n = 5 }) {
  windowPane(ctx, { x: cx, y: y + 3.6, z: zWin - 0.1, w, h: 5.2, bars: 3 });
  consoles(ctx, { x: cx, z: zWin - 1.7, n, y, gap: Math.min(4, (w - 2) / n) });
  chair(ctx, ctx.g, cx, zWin - 5.4, 0, true, y);
}

// Pillars (one instanced draw) along a wall line: points [[x, z]], size w x d, height h.
export function pillars(ctx, points, { w = 1, d = 1, h = 10, y = 0, mat = ctx.mats.metal } = {}) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  instances(ctx.g, geo, mat, points.map(([x, z]) => [x, y + h / 2, z, 0, w, h, d]));
}

// Instanced boxes from [[w, h, d, x, y, z, rotY]] (one draw).
export function boxes(ctx, mat, list) {
  return instances(ctx.g, new THREE.BoxGeometry(1, 1, 1), mat, list.map(([w, h, d, x, y, z, r = 0]) => [x, y, z, r, w, h, d]));
}

// Several crate stacks [[x, z, cols, rows, layers]].
export function crates(ctx, rng, stacks) {
  for (const [x, z, c, r, l] of stacks) crateStack(ctx, ctx.g, rng, x, z, c, r, l);
}

// Solid round tank at (x, z) with a coloured band.
export function tank(ctx, x, z, r = 1.1, h = 3.2, band = ctx.mats.orange) {
  const { mats } = ctx;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), mats.metal);
  m.position.set(x, h / 2, z);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.02, r + 0.02, 0.3, 20), band);
  b.position.set(x, h * 0.75, z);
  ctx.g.add(m, b);
  ctx.blocks.push(aabb(x, z, r * 2.2, r * 2.2));
}

// Floor line (hazard or glow strip) from (x0, z0) to (x1, z1).
export function strip(ctx, mat, x0, z0, x1, z1, w = 0.15, y = 0) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const m = box(ctx.g, mat, w, 0.03, len, (x0 + x1) / 2, y + 0.015, (z0 + z1) / 2);
  m.rotation.y = Math.atan2(x1 - x0, z1 - z0);
  return m;
}

// Floor lights [[x, z]] in `sets` interleaved groups whose glow chases along the list;
// `per` consecutive spots light together (e.g. 2 for left/right pairs).
export function chaseLights(ctx, spots, hex, { sets = 3, per = 1, size = [0.5, 0.06, 0.9], rate = 5 } = {}) {
  const mats = Array.from({ length: sets }, () => glow(hex, 0.4));
  const geo = new THREE.BoxGeometry(...size);
  mats.forEach((mat, k) => instances(ctx.g, geo, mat,
    spots.filter((_, i) => Math.floor(i / per) % sets === k).map(([x, z]) => [x, 0.03, z])));
  return { update(t) { mats.forEach((m, k) => { m.emissiveIntensity = Math.floor(t * rate) % sets === k ? 3.5 : 0.4; }); } };
}
