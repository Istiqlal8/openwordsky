// Station geometry: the claim beacon, workbench, locker, antenna, landing pad and teleport pad.
import * as THREE from 'three';
import { GRID } from './shapes-struct.js';

const box = (k, c, w, h, d, x, y, z) => k.box('solid', c, w, h, d, x, y, z);
const ball = (k, bucket, c, r, x, y, z) => k.add(bucket, new THREE.SphereGeometry(r, 8, 6), c, x, y, z);
const ring = (k, bucket, c, r, t, y) => k.add(bucket, new THREE.TorusGeometry(r, t, 6, 18), c, 0, y, 0, [Math.PI / 2, 0, 0]);

export function beacon(k, c) {
  k.cyl('solid', c.dark, 0.7, 0.9, 0.3, 8, 0, 0, 0);
  k.cyl('solid', c.metal, 0.12, 0.18, 2.6, 6, 0, 0.3, 0);
  k.cyl('solid', c.accent, 0.45, 0.45, 0.12, 8, 0, 1.4, 0);
  ball(k, 'glow', c.glow, 0.32, 0, 3.1, 0);
}

export function workbench(k, c) {
  box(k, c.metal, 2.4, 0.16, 1.1, 0, 0.92, 0);
  box(k, c.dark, 2.2, 0.75, 0.9, 0, 0.5, 0);
  box(k, c.metal, 2.4, 1.1, 0.14, 0, 1.5, -0.5);
  for (const x of [-0.7, 0, 0.7]) k.box('glow', c.glow, 0.4, 0.28, 0.03, x, 1.6, -0.42);
  for (const x of [-0.8, 0.5]) box(k, c.accent, 0.5, 0.12, 0.2, x, 1.06, 0.2);
}

export function locker(k, c) {
  box(k, c.metal, 1.6, 2, 0.8, 0, 1, 0);
  box(k, c.dark, 0.08, 1.9, 0.84, 0, 1, 0);
  for (const s of [-1, 1]) box(k, c.trim, 0.12, 0.3, 0.1, s * 0.25, 1.1, 0.42);
  k.box('glow', c.glow, 1.2, 0.06, 0.04, 0, 1.92, 0.42);
}

export function antenna(k, c) {
  k.cyl('solid', c.dark, 0.5, 0.7, 0.25, 6, 0, 0, 0);
  for (const s of [-1, 1]) k.beam('solid', c.metal, [s * 0.4, 0.2, 0], [0, 4.2, 0], 0.06);
  k.beam('solid', c.metal, [0, 0.2, 0.4], [0, 4.2, 0], 0.06);
  k.add('solid', new THREE.SphereGeometry(0.8, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), c.trim, 0, 4.2, 0, [-0.7, 0, 0]);
  ball(k, 'glow', c.accent, 0.12, 0, 4.4, 0.5);
}

// Ship pad: a wide plate with corner lights.
export function landingPad(k, c) {
  const r = GRID;
  k.cyl('solid', c.dark, r, r * 0.92, 0.35, 12, 0, 0, 0);
  ring(k, 'glow', c.accent, r * 0.8, 0.07, 0.4);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.78;
    box(k, c.metal, 0.3, 0.7, 0.3, Math.cos(a) * r * 0.85, 0.7, Math.sin(a) * r * 0.85);
    ball(k, 'glow', c.glow, 0.13, Math.cos(a) * r * 0.85, 1.15, Math.sin(a) * r * 0.85);
  }
  k.box('glow', c.glow, 1.6, 0.04, 0.4, 0, 0.37, 0);
}

export function teleportPad(k, c) {
  k.cyl('solid', c.dark, 1.5, 1.7, 0.3, 10, 0, 0, 0);
  k.cyl('solid', c.metal, 1.2, 1.3, 0.12, 10, 0, 0.3, 0);
  ring(k, 'glow', c.glow, 1.05, 0.08, 0.45);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    k.beam('solid', c.metal, [Math.cos(a) * 1.35, 0.3, Math.sin(a) * 1.35], [Math.cos(a) * 0.5, 2.6, Math.sin(a) * 0.5], 0.07);
  }
  ball(k, 'glow', c.glow, 0.3, 0, 2.7, 0);
}
