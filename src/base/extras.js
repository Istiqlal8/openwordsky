// Store kiosk, comms tower, entrance gate and lamp posts.
import * as THREE from 'three';
import { C } from './materials.js';
import { foundation, stairs } from './ground.js';
import { addSign } from './signs.js';
import { makeCanvas, toTexture } from '../assets/canvas.js';

export const STORE = { door: { x: 0, z: 3.4 } };
export const TOWER_H = 22;

function awning(kit) {
  for (let i = 0; i < 6; i++) {
    const x = -2.1 + i * 0.84;
    kit.add('hull', new THREE.BoxGeometry(0.84, 0.08, 1.6), i % 2 ? C.white : C.accent, x, 3.1, 1.9, [0.35, 0, 0]);
  }
}

// Trading kiosk, open counter toward +Z.
export function buildStore(kit, depth, drop) {
  kit.box('hull', C.plaza, 5.6, 0.3, 4.6, 0, -0.15, 0.4);
  foundation(kit, { w: 5.6, d: 4.6 }, depth);
  kit.box('hull', C.teal, 5, 3.2, 0.2, 0, 1.6, -1.5);
  for (const s of [-1, 1]) kit.box('hull', C.teal, 0.2, 3.2, 3, s * 2.4, 1.6, 0);
  kit.box('hull', C.hull, 5.4, 0.25, 3.6, 0, 3.3, 0);
  kit.box('hull', C.wood, 4.6, 1.1, 0.6, 0, 0.55, 1.2);
  kit.box('glow', C.cool, 3.4, 1, 0.06, 0, 2, -1.38);
  for (let i = 0; i < 5; i++) kit.box('hull', [C.accent, C.stripe, C.red, C.green, C.cool][i], 0.35, 0.35, 0.35, -1.6 + i * 0.8, 1.28, 1.2);
  for (const [x, z, s] of [[3.3, 1.8, 0.8], [3.6, 0.6, 0.6], [-3.2, 1.9, 0.7]]) kit.box('hull', C.wood, s, s, s, x, s / 2, z);
  awning(kit);
  addSign(kit, 'toko', 2.8, 0, 3.85, 1.4);
  kit.box('hull', C.dark, 2.9, 0.75, 0.05, 0, 3.85, 1.37);
  stairs(kit, drop, 2.4, 2.7);
}

// Lattice mast with a dish; the blinking beacon on top is a separate sprite.
export function buildTower(kit) {
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [x, z] of legs) kit.beam('hull', C.steel, [x * 1.8, -1.5, z * 1.8], [x * 0.35, TOWER_H, z * 0.35], 0.12);
  for (let y = 2; y < TOWER_H - 1; y += 3) {
    const w = 1.8 - (1.45 * (y + 1.5)) / (TOWER_H + 1.5);
    for (let i = 0; i < 4; i++) {
      const [ax, az] = legs[i], [bx, bz] = legs[(i + 1) % 4];
      kit.beam('hull', i % 2 ? C.red : C.hull, [ax * w, y, az * w], [bx * w, y + 1.5, bz * w], 0.06, 4);
    }
  }
  const dish = new THREE.SphereGeometry(1.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 3.2);
  kit.add('hull', dish, C.hull, 0.2, TOWER_H - 5, 0.9, [-1.1, 0, 0]);
  kit.beam('hull', C.steel, [0, TOWER_H - 1, 0], [0, TOWER_H + 2.5, 0], 0.07);
  kit.box('hull', C.dark, 1.6, 1.8, 1.4, 1.8, 0.9, 1.6);
  kit.box('lamp', C.green, 0.2, 0.2, 0.05, 1.8, 1.3, 2.32);
  kit.box('lamp', C.red, 0.25, 0.25, 0.25, 0, TOWER_H * 0.55, 0);
}

// Gate over the entrance path with a sign on both faces.
export function buildGate(kit) {
  for (const s of [-1, 1]) {
    kit.box('hull', C.hull, 0.7, 4.6, 0.7, s * 3, 2.3 - 1, 0);
    kit.box('lamp', C.warm, 0.3, 0.3, 0.74, s * 3, 3.1, 0);
  }
  kit.box('hull', C.dark, 7.2, 1.3, 0.35, 0, 4, 0);
  kit.box('hull', C.accent, 7.2, 0.15, 0.4, 0, 3.3, 0);
  addSign(kit, 'pangkalan', 5.2, 0, 4, 0.19);
  addSign(kit, 'pangkalan', 5.2, 0, 4, -0.19, Math.PI);
}

// Lamp post at kit-frame origin (ground level); head glows at night.
export function buildLamp(kit) {
  kit.cyl('hull', C.dark, 0.09, 0.13, 3.6, 6, 0, -0.5, 0);
  kit.box('hull', C.dark, 0.5, 0.12, 0.5, 0, 3.1, 0);
  kit.add('lamp', new THREE.SphereGeometry(0.24, 8, 6), C.warm, 0, 2.9, 0);
}

// Flag pole; the cloth is an animated mesh made by makeFlag().
export function buildFlagPole(kit) {
  kit.cyl('hull', C.steel, 0.07, 0.1, 7.5, 6, 0, -0.5, 0);
  kit.add('hull', new THREE.SphereGeometry(0.14, 8, 6), C.stripe, 0, 7.1, 0);
}

// Red-and-white cloth that ripples; pole at local x = 0. Returns { mesh, update(t), dispose() }.
export function makeFlag() {
  const geo = new THREE.PlaneGeometry(2.6, 1.6, 10, 1).translate(1.3, 0, 0);
  const c = makeCanvas(2, 2), g = c.getContext('2d');
  g.fillStyle = '#d8262f';
  g.fillRect(0, 0, 2, 1);
  g.fillStyle = '#f4f4f0';
  g.fillRect(0, 1, 2, 1);
  const tex = toTexture(c);
  tex.magFilter = THREE.NearestFilter;
  const mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat), pos = geo.attributes.position, n = pos.count;
  const update = (t) => {
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin(x * 2.2 - t * 5) * 0.18 * x / 2.6);
    }
    pos.needsUpdate = true;
  };
  const dispose = () => { mesh.removeFromParent(); geo.dispose(); mat.dispose(); tex.dispose(); };
  return { mesh, update, dispose };
}
