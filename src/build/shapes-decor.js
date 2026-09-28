// Decoration piece geometry: lights, furniture, banners and the planter/pen.
import * as THREE from 'three';
import { GRID } from './shapes-struct.js';

const box = (k, c, w, h, d, x, y, z) => k.box('solid', c, w, h, d, x, y, z);
const ball = (k, bucket, c, r, x, y, z) => k.add(bucket, new THREE.SphereGeometry(r, 8, 6), c, x, y, z);
const legs = (k, c, w, d, h) => {
  for (const [x, z] of [[-w, -d], [w, -d], [-w, d], [w, d]]) box(k, c, 0.08, h, 0.08, x, h / 2, z);
};

export function lampPost(k, c) {
  k.cyl('solid', c.dark, 0.18, 0.22, 0.12, 6, 0, 0, 0);
  k.cyl('solid', c.metal, 0.05, 0.06, 1.8, 5, 0, 0.1, 0);
  ball(k, 'glow', c.warm, 0.22, 0, 2.05, 0);
}

// Hanging lamp on a bracket, for a wall or a ceiling edge.
export function lampWall(k, c) {
  box(k, c.metal, 0.16, 0.16, 0.5, 0, 2.4, -0.2);
  k.add('solid', new THREE.ConeGeometry(0.34, 0.4, 8), c.dark, 0, 2.3, 0.1);
  ball(k, 'glow', c.warm, 0.16, 0, 2.05, 0.1);
}

// Floor strip light: a low glowing bar.
export function lampStrip(k, c) {
  box(k, c.dark, 2.4, 0.12, 0.3, 0, 0.06, 0);
  k.box('glow', c.glow, 2.2, 0.06, 0.18, 0, 0.14, 0);
}

export function banner(k, c) {
  box(k, c.metal, 0.1, 3.2, 0.1, 0, 1.6, 0);
  box(k, c.cloth, 1.1, 1.9, 0.05, 0.6, 2.1, 0);
  k.add('solid', new THREE.ConeGeometry(0.55, 0.5, 3), c.cloth, 0.6, 0.9, 0, [Math.PI, 0, 0]);
}

export function crate(k, c) {
  box(k, c.wood, 1, 1, 1, 0, 0.5, 0);
  for (const s of [-1, 1]) box(k, c.trim, 1.06, 0.12, 1.06, 0, 0.5 + s * 0.35, 0);
}

export function shelf(k, c) {
  for (const s of [-1, 1]) box(k, c.dark, 0.1, 2, 0.5, s * 0.85, 1, 0);
  for (const y of [0.4, 1, 1.6]) box(k, c.wood, 1.8, 0.08, 0.5, 0, y, 0);
  for (const [x, y] of [[-0.4, 0.62], [0.3, 1.22]]) box(k, c.cloth, 0.3, 0.36, 0.3, x, y, 0);
}

export function bed(k, c) {
  box(k, c.dark, 1.4, 0.35, 2.2, 0, 0.3, 0);
  box(k, c.cloth, 1.36, 0.22, 1.5, 0, 0.55, 0.3);
  box(k, c.trim, 1.2, 0.18, 0.5, 0, 0.6, -0.72);
  box(k, c.metal, 1.5, 0.7, 0.12, 0, 0.6, -1.15);
}

export function rug(k, c) {
  box(k, c.cloth, 2.6, 0.04, 2, 0, 0.02, 0);
  box(k, c.trim, 2.2, 0.05, 1.6, 0, 0.03, 0);
}

export function table(k, c) {
  box(k, c.wood, 1.6, 0.1, 0.9, 0, 0.8, 0);
  legs(k, c.dark, 0.7, 0.35, 0.78);
}

export function chair(k, c) {
  box(k, c.wood, 0.6, 0.08, 0.6, 0, 0.45, 0);
  box(k, c.wood, 0.6, 0.6, 0.08, 0, 0.8, -0.28);
  legs(k, c.dark, 0.25, 0.25, 0.44);
}

export function sign(k, c) {
  for (const s of [-1, 1]) box(k, c.dark, 0.1, 1.8, 0.1, s * 0.7, 0.9, 0);
  box(k, c.accent, 1.6, 0.8, 0.08, 0, 1.4, 0.06);
  k.box('glow', c.glow, 1.2, 0.08, 0.02, 0, 1.4, 0.11);
}

export function planter(k, c) {
  box(k, c.dark, 2, 0.5, 2, 0, 0.25, 0);
  box(k, c.soil, 1.8, 0.05, 1.8, 0, 0.5, 0);
}

export function pen(k, c) {
  box(k, c.soil, GRID, 0.06, GRID, 0, 0.03, 0);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) box(k, c.wood, 0.16, 1.3, 0.16, x, 0.65, z);
  for (const y of [0.5, 1.1]) {
    for (const s of [-1, 1]) {
      box(k, c.wood, GRID, 0.1, 0.06, 0, y, s * 2);
      box(k, c.wood, 0.06, 0.1, GRID, s * 2, y, 0);
    }
  }
}
