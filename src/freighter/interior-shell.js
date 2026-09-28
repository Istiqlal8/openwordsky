// Builds a plan's shell: floor and ceiling slabs for every area (rect, disc, ring, ramp),
// straight walls with door/window gaps, curved walls, domes and vaults (1 unit = 1 m).
// Angles follow three.js cylinders: theta 0 points +Z, PI/2 points +X.
import * as THREE from 'three';
import { tileUv } from './interior-mats.js';

// Legacy classic-layout door (read by the old launch.js; plans carry their own doors now).
export const SPACE_DOOR = { x0: -24, x1: 24, h: 13, z: -15 };
const T = 0.3; // wall thickness
const TAU = Math.PI * 2;

// One wall piece spanning [a, b] along its axis and [y0, y1] in height.
function piece(group, mat, along, fixed, a, b, y0, y1) {
  const len = b - a, h = y1 - y0;
  if (len <= 0.01 || h <= 0.01) return;
  const geo = tileUv(along === 'x' ? new THREE.BoxGeometry(len, h, T) : new THREE.BoxGeometry(T, h, len), len / 4, h / 4);
  const m = new THREE.Mesh(geo, mat);
  const mid = (a + b) / 2;
  m.position.set(along === 'x' ? mid : fixed, (y0 + y1) / 2, along === 'x' ? fixed : mid);
  group.add(m);
}

// Wall spec [along, fixed, from, to, top, gaps[[a, b, y0, y1]], base]: 'x' walls run along x
// at z = fixed. Gap heights are relative to the base.
function wall(group, mat, [along, fixed, from, to, top, gaps = [], base = 0]) {
  let a = from;
  for (const [g0, g1, y0, y1] of [...gaps].sort((p, q) => p[0] - q[0])) {
    piece(group, mat, along, fixed, a, g0, base, top);
    piece(group, mat, along, fixed, g0, g1, base, base + y0);
    piece(group, mat, along, fixed, g0, g1, base + y1, top);
    a = g1;
  }
  piece(group, mat, along, fixed, a, to, base, top);
}

function arcPiece(group, mat, a, t0, t1, y0, y1) {
  const len = t1 - t0, h = y1 - y0;
  if (len <= 0.005 || h <= 0.01) return;
  const segs = Math.max(2, Math.ceil(len * a.r / 1.5));
  const geo = tileUv(new THREE.CylinderGeometry(a.r, a.r, h, segs, 1, true, t0, len), len * a.r / 4, h / 4);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(a.cx, (a.y ?? 0) + (y0 + y1) / 2, a.cz);
  group.add(m);
}

// Curved wall { cx, cz, r, h, y, a0, a1, gaps[[t0, t1, y0, y1]] }; a full circle starts at its first gap.
function arcWall(group, mat, a) {
  let gaps = (a.gaps ?? []).map(([t0, t1, y0, y1]) => [t0, t1, y0, y1]);
  let from = a.a0 ?? 0, to = a.a1 ?? TAU;
  if (to - from >= TAU - 1e-6 && gaps.length) {
    gaps = gaps.map(([t0, t1, y0, y1]) => { const s = ((t0 % TAU) + TAU) % TAU; return [s, s + t1 - t0, y0, y1]; })
      .sort((p, q) => p[0] - q[0]);
    from = gaps[0][0]; to = from + TAU;
  }
  let t = from;
  for (const [g0, g1, y0, y1] of gaps) {
    arcPiece(group, mat, a, t, g0, 0, a.h);
    arcPiece(group, mat, a, g0, g1, 0, y0);
    arcPiece(group, mat, a, g0, g1, y1, a.h);
    t = g1;
  }
  arcPiece(group, mat, a, t, to, 0, a.h);
}

function areaGeo(a) {
  if (a.r !== undefined) return tileUv(new THREE.CircleGeometry(a.r, 48), a.r / 2, a.r / 2);
  if (a.r0 !== undefined) return tileUv(new THREE.RingGeometry(a.r0, a.r1, 72, 1), a.r1 / 2, a.r1 / 2);
  const w = a.x1 - a.x0, d = a.z1 - a.z0;
  return tileUv(new THREE.PlaneGeometry(w, d), w / 4, d / 4);
}

function slab(group, mat, a, y, up) {
  const m = new THREE.Mesh(areaGeo(a), mat);
  m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
  m.position.set(a.cx ?? (a.x0 + a.x1) / 2, y, a.cz ?? (a.z0 + a.z1) / 2);
  group.add(m);
}

// Quad from 4 corners in order; flips to face `up` (+Y) when asked.
function quad(p, faceUp, u = 1, v = 1) {
  const geo = new THREE.BufferGeometry();
  const order = faceUp && new THREE.Vector3().subVectors(p[1], p[0]).cross(new THREE.Vector3().subVectors(p[2], p[0])).y < 0
    ? [p[0], p[3], p[2], p[1]] : p;
  geo.setAttribute('position', new THREE.Float32BufferAttribute(order.flatMap((q) => [q.x, q.y, q.z]), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, v], 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeVertexNormals();
  return geo;
}

// Ramp surface plus side skirts down to its base level.
function ramp(group, mats, a) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z), base = a.base ?? 0;
  const alongZ = a.axis !== 'x', len = alongZ ? a.z1 - a.z0 : a.x1 - a.x0, w = alongZ ? a.x1 - a.x0 : a.z1 - a.z0;
  const top = alongZ ? [V(a.x0, a.y0, a.z0), V(a.x1, a.y0, a.z0), V(a.x1, a.y1, a.z1), V(a.x0, a.y1, a.z1)]
    : [V(a.x0, a.y0, a.z0), V(a.x1, a.y1, a.z0), V(a.x1, a.y1, a.z1), V(a.x0, a.y0, a.z1)];
  group.add(new THREE.Mesh(quad(top, true, w / 2, len / 2), mats.floor));
  const sides = alongZ ? [[top[0], top[3]], [top[1], top[2]]] : [[top[0], top[1]], [top[3], top[2]]];
  for (const [lo, hi] of sides) {
    const skirt = [V(lo.x, base, lo.z), V(hi.x, base, hi.z), hi, lo];
    group.add(new THREE.Mesh(quad(skirt, false, len / 4, 1), mats.wallIn));
  }
}

// Dome cap { cx, cz, r, y, k (height / r), mat }.
function dome(group, mats, d) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(d.r, 40, 12, 0, TAU, 0, Math.PI / 2), mats[d.mat ?? 'ceiling']);
  m.scale.y = d.k ?? 0.5;
  m.position.set(d.cx, d.y ?? 0, d.cz);
  group.add(m);
}

// Half-cylinder vault along Z { cx, cz, r, len, y, k }.
function vault(group, mats, v) {
  const geo = tileUv(new THREE.CylinderGeometry(v.r, v.r, v.len, 36, 1, true, Math.PI / 2, Math.PI), v.len / 4, v.r * 0.8);
  const m = new THREE.Mesh(geo, mats[v.mat ?? 'wallIn']);
  m.rotation.x = Math.PI / 2;
  m.scale.set(1, 1, v.k ?? 1); // local z becomes world y after the rotation
  m.position.set(v.cx, v.y ?? 0, v.cz);
  group.add(m);
}

// plan: { floors, walls, arcs, domes, vaults }. Areas: `ceil: false` skips the ceiling,
// `under: true` adds an underside for raised decks.
export function buildShell(ctx, plan) {
  const { mats } = ctx, g = ctx.g;
  for (const a of plan.floors) {
    if (a.y1 !== undefined) { ramp(g, mats, a); continue; }
    const y = a.y ?? 0;
    if (a.floor !== false) slab(g, mats.floor, a, y, true);
    if (a.under) slab(g, mats.ceiling, a, y - 0.08, false);
    if (a.ceil !== false) slab(g, mats.ceiling, a, y + a.h, false);
  }
  for (const w of plan.walls ?? []) wall(g, mats.wall, w);
  for (const a of plan.arcs ?? []) arcWall(g, mats[a.mat ?? 'wallIn'], a);
  for (const d of plan.domes ?? []) dome(g, mats, d);
  for (const v of plan.vaults ?? []) vault(g, mats, v);
}
