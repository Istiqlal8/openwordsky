// Floor plan of the freighter interior (1 unit = 1 m, floor at y = 0) and the geometry of
// its floors, ceilings and walls. The hangar's space door faces -Z; the bridge window faces +Z.
import * as THREE from 'three';
import { tileUv } from './interior-mats.js';

export const ROOMS = {
  hangar: { x0: -30, x1: 30, z0: -15, z1: 15, h: 16 },
  corridor: { x0: -2.5, x1: 2.5, z0: 15, z1: 40, h: 4 },
  quarters: { x0: -16, x1: -2.5, z0: 22, z1: 34, h: 4 },
  workshop: { x0: 2.5, x1: 16, z0: 22, z1: 34, h: 4 },
  bridge: { x0: -12, x1: 12, z0: 40, z1: 56, h: 7 },
};

// Walkable rectangles; connectors overlap their rooms so the player can pass doorways.
export const WALK = [
  ROOMS.hangar, ROOMS.quarters, ROOMS.workshop, ROOMS.bridge,
  { x0: -2.5, x1: 2.5, z0: 13, z1: 42 },
  { x0: -4.5, x1: 0, z0: 26, z1: 30 },
  { x0: 0, x1: 4.5, z0: 26, z1: 30 },
];

export const SPACE_DOOR = { x0: -24, x1: 24, h: 13, z: -15 };
const DOOR_H = 3.2;

// [along, fixed, from, to, height, gaps[[a, b, y0, y1]]]: 'x' walls run along x at z = fixed.
const WALLS = [
  ['x', -15, -30, 30, 16, [[SPACE_DOOR.x0, SPACE_DOOR.x1, 0, SPACE_DOOR.h]]],
  ['x', 15, -30, 30, 16, [[-2.5, 2.5, 0, DOOR_H + 0.4]]],
  ['z', -30, -15, 15, 16, []],
  ['z', 30, -15, 15, 16, []],
  ['z', -2.5, 15, 40, 4, [[26, 30, 0, DOOR_H]]],
  ['z', 2.5, 15, 40, 4, [[26, 30, 0, DOOR_H]]],
  ['x', 22, -16, -2.5, 4, []],
  ['x', 34, -16, -2.5, 4, []],
  ['z', -16, 22, 34, 4, [[25, 31, 1.3, 3]]],
  ['x', 22, 2.5, 16, 4, []],
  ['x', 34, 2.5, 16, 4, []],
  ['z', 16, 22, 34, 4, []],
  ['x', 40, -12, 12, 7, [[-2.5, 2.5, 0, DOOR_H + 0.4]]],
  ['x', 56, -12, 12, 7, [[-10, 10, 1, 6.2]]],
  ['z', -12, 40, 56, 7, []],
  ['z', 12, 40, 56, 7, []],
];
const T = 0.3; // wall thickness

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

// Solid spans between gaps, plus sill and lintel pieces around each gap.
function wall(group, mat, [along, fixed, from, to, h, gaps]) {
  let a = from;
  for (const [g0, g1, y0, y1] of gaps) {
    piece(group, mat, along, fixed, a, g0, 0, h);
    piece(group, mat, along, fixed, g0, g1, 0, y0);
    piece(group, mat, along, fixed, g0, g1, y1, h);
    a = g1;
  }
  piece(group, mat, along, fixed, a, to, 0, h);
}

function slab(group, mat, r, y, up) {
  const w = r.x1 - r.x0, d = r.z1 - r.z0;
  const m = new THREE.Mesh(tileUv(new THREE.PlaneGeometry(w, d), w / 4, d / 4), mat);
  m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
  m.position.set((r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2);
  group.add(m);
}

export function buildShell(mats) {
  const group = new THREE.Group();
  group.name = 'freighter-shell';
  for (const r of Object.values(ROOMS)) {
    slab(group, mats.floor, r, 0, true);
    slab(group, mats.ceiling, r, r.h, false);
  }
  for (const w of WALLS) wall(group, mats.wall, w);
  return group;
}

// Room name at a floor point (for lighting cues / debugging), or null outside.
export function roomAt(x, z) {
  for (const [name, r] of Object.entries(ROOMS)) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return name;
  return null;
}

// Ceiling height at a floor point (camera clamp).
export function ceilingAt(x, z) {
  const name = roomAt(x, z);
  return name ? ROOMS[name].h : 4;
}
