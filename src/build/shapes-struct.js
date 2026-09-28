// Structural piece geometry: floors, walls, openings, roofs, ramps and railings.
// Every function draws into a GeoKit whose frame already sits at the piece's origin and yaw.
import * as THREE from 'three';

export const GRID = 4;     // foundation cell size
export const WALL_H = 3;   // wall height (roofs sit this high above their floor)

const box = (k, c, w, h, d, x, y, z) => k.box('solid', c, w, h, d, x, y, z);
const post = (k, c, x, z, h, r = 0.08) => k.box('solid', c, r * 2, h, r * 2, x, h / 2, z);

export function foundation(k, c) {
  box(k, c.dark, GRID, 3, GRID, 0, -1.5, 0);
  box(k, c.metal, GRID - 0.2, 0.06, GRID - 0.2, 0, 0.02, 0);
  for (const s of [-1, 1]) box(k, c.trim, GRID, 0.08, 0.1, 0, 0.04, s * (GRID / 2 - 0.1));
}

export function wall(k, c) {
  box(k, c.metal, GRID, WALL_H, 0.3, 0, WALL_H / 2, 0);
  box(k, c.trim, GRID, 0.12, 0.34, 0, 0.9, 0);
}

export function windowWall(k, c) {
  box(k, c.metal, GRID, 1, 0.3, 0, 0.5, 0);
  box(k, c.metal, GRID, 0.8, 0.3, 0, 2.6, 0);
  for (const s of [-1, 1]) box(k, c.metal, 0.8, 1.2, 0.3, s * 1.6, 1.6, 0);
  k.box('glass', c.glass, 2.4, 1.2, 0.08, 0, 1.6, 0);
}

// Tall slit windows: three narrow panes.
export function windowSlit(k, c) {
  box(k, c.metal, GRID, 0.6, 0.3, 0, 0.3, 0);
  box(k, c.metal, GRID, 0.5, 0.3, 0, WALL_H - 0.25, 0);
  for (const x of [-1.5, -0.5, 0.5, 1.5]) box(k, c.metal, 0.5, 2.15, 0.3, x, 1.68, 0);
  for (const x of [-1, 0, 1]) k.box('glass', c.glass, 0.5, 2.1, 0.08, x, 1.68, 0);
}

export function windowRound(k, c) {
  box(k, c.metal, GRID, WALL_H, 0.3, 0, WALL_H / 2, 0);
  k.add('glass', new THREE.CylinderGeometry(0.85, 0.85, 0.4, 12), c.glass, 0, 1.6, 0, [Math.PI / 2, 0, 0]);
  k.add('solid', new THREE.TorusGeometry(0.9, 0.1, 6, 14), c.trim, 0, 1.6, 0.16);
}

// Open doorway: posts and a lintel, nothing to block the player.
export function doorway(k, c) {
  for (const s of [-1, 1]) box(k, c.metal, 0.9, WALL_H, 0.3, s * 1.55, WALL_H / 2, 0);
  box(k, c.metal, GRID, 0.7, 0.3, 0, 2.65, 0);
}

export function door(k, c) {
  doorway(k, c);
  box(k, c.accent, 2.2, 2.3, 0.1, 0, 1.15, 0.12);
  k.add('glow', new THREE.SphereGeometry(0.06, 6, 5), c.glow, 0.8, 1.15, 0.2);
}

export function roof(k, c) {
  box(k, c.dark, GRID + 0.2, 0.25, GRID + 0.2, 0, 0.125, 0);
  box(k, c.trim, GRID + 0.3, 0.08, 0.2, 0, 0.29, GRID / 2);
}

// Shed roof: one slab tilted along +z.
export function roofSlope(k, c) {
  const geo = new THREE.BoxGeometry(GRID + 0.2, 0.2, GRID * 1.15);
  k.add('solid', geo, c.dark, 0, 0.5, 0, [0.42, 0, 0]);
  for (const s of [-1, 1]) k.beam('solid', c.trim, [s * 2, 0, GRID / 2], [s * 2, 1.5, -GRID / 2], 0.07);
}

export function pillar(k, c) {
  k.cyl('solid', c.metal, 0.22, 0.28, WALL_H, 8, 0, 0, 0);
  for (const y of [0.05, WALL_H - 0.25]) box(k, c.trim, 0.8, 0.2, 0.8, 0, y + 0.1, 0);
}

// Ramp from the floor down to the ground one cell outward (−z, the open side of an edge).
export function ramp(k, c) {
  const len = Math.hypot(GRID, WALL_H * 0.7);
  k.add('solid', new THREE.BoxGeometry(2.2, 0.18, len), c.metal, 0, -0.55, -GRID / 2, [0.5, 0, 0]);
  for (const s of [-1, 1]) k.beam('solid', c.trim, [s * 1.1, 0.9, -0.2], [s * 1.1, 0.2, -(GRID - 0.2)], 0.06);
}

export function stairs(k, c) {
  for (let i = 0; i < 5; i++) box(k, i % 2 ? c.metal : c.dark, 1.8, (i + 1) * 0.6, 0.8, 0, (i + 1) * 0.3, -1.6 + i * 0.8);
}

// Railing on one cell edge: a balcony or terrace lip.
export function balcony(k, c) {
  box(k, c.dark, GRID, 0.16, 1.4, 0, 0.08, -0.5);
  for (const x of [-1.9, 0, 1.9]) post(k, c.metal, x, 0, 1.1, 0.07);
  box(k, c.trim, GRID, 0.1, 0.12, 0, 1.1, 0);
}

export function fence(k, c) {
  for (const x of [-1.9, 0, 1.9]) post(k, c.wood, x, 0, 1.2, 0.07);
  for (const y of [0.45, 0.95]) box(k, c.wood, GRID, 0.1, 0.06, 0, y, 0);
}

// Fence with an open middle: walk through it.
export function gate(k, c) {
  for (const x of [-1.9, 1.9]) post(k, c.wood, x, 0, 1.6, 0.09);
  box(k, c.wood, GRID, 0.14, 0.1, 0, 1.6, 0);
  for (const s of [-1, 1]) k.beam('solid', c.wood, [s * 1.85, 1.5, 0], [s * 0.6, 0.9, 0], 0.05);
}
