// Cozy habitat pods with gardens, plus the water tower and the solar field.
import * as THREE from 'three';
import { C } from './materials.js';
import { foundation, stairs } from './ground.js';
import { addSign } from './signs.js';

const R = 3.2, WALL = 3;
const TINTS = [[0xefe4d2, C.roof], [0xd9e6ea, 0x3f7fa8], [0xe9dcc8, 0x7a9a4a], [0xe6e0ee, 0x9a5a8a]];
export const HOUSE = { r: 5, door: { x: 0, z: R + 1.8 }, porch: { z: R + 0.45, y: 2.05 } };

function pod(kit, wall, roof) {
  kit.add('hull', new THREE.CylinderGeometry(R, R + 0.15, WALL, 8), wall, 0, WALL / 2, 0, [0, Math.PI / 8, 0]);
  const dome = new THREE.SphereGeometry(R + 0.35, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  kit.add('hull', dome, roof, 0, WALL, 0, [0, Math.PI / 8, 0], [1, 0.55, 1]);
  kit.add('hull', new THREE.CylinderGeometry(R + 0.4, R + 0.4, 0.2, 8), C.dark, 0, WALL, 0, [0, Math.PI / 8, 0]);
  const face = R * Math.cos(Math.PI / 8) + 0.07; // octagon apothem at window height
  for (const a of [-Math.PI / 2, Math.PI / 2, 2.356, -2.356, 0.785, -0.785]) {
    const x = Math.sin(a) * face, z = Math.cos(a) * face;
    kit.add('glow', new THREE.BoxGeometry(0.95, 0.9, 0.12), C.warm, x, 1.8, z, [0, a, 0]);
  }
  kit.box('hull', C.wood, 1.2, 2.1, 0.2, 0, 1.05, R - 0.05);
  kit.box('glow', C.warm, 0.2, 0.2, 0.1, 0.4, 1.05, R + 0.07);
  kit.box('hull', wall, 1.8, 0.2, 0.9, 0, 2.3, R + 0.3);
  kit.box('lamp', C.warm, 0.3, 0.12, 0.3, 0, 2.15, R + 0.45);
  // Rooftop solar panel on a strut.
  kit.beam('hull', C.steel, [1.2, WALL + 1.2, -0.6], [1.2, WALL + 2, -0.6], 0.07);
  kit.add('hull', new THREE.BoxGeometry(1.8, 0.08, 1.2), 0x1f3b6b, 1.2, WALL + 2.05, -0.6, [0.5, 0, 0]);
}

// Garden bed with bushes and flowers beside the door, fenced.
function garden(kit, side) {
  const gx = side * 3.2, gz = R + 1.2;
  kit.box('hull', C.soil, 2.4, 0.3, 1.6, gx, 0.15, gz);
  const flowers = [0xf2c14e, 0xe55d87, 0xffffff, 0xb07cf0];
  for (let i = 0; i < 6; i++) {
    const x = gx - 0.8 + (i % 3) * 0.8, z = gz - 0.4 + Math.floor(i / 3) * 0.8;
    if (i % 2) kit.add('hull', new THREE.IcosahedronGeometry(0.35, 0), C.leaf, x, 0.55, z);
    else kit.add('hull', new THREE.IcosahedronGeometry(0.16, 0), flowers[i % 4], x, 0.5, z);
  }
  for (let i = 0; i <= 4; i++) kit.box('hull', C.wood, 0.1, 0.7, 0.1, gx - 1.3 + i * 0.65, 0.35, gz + 0.95);
  kit.box('hull', C.wood, 2.7, 0.08, 0.06, gx, 0.55, gz + 0.95);
}

// kit frame at the house floor facing the plaza. index picks colours; sign: atlas key.
export function buildHouse(kit, index, sign, depth, drop) {
  const [wall, roof] = TINTS[index % TINTS.length];
  kit.add('hull', new THREE.CylinderGeometry(R + 1.6, R + 1.6, 0.3, 8), C.plaza, 0, -0.15, 0.6, [0, Math.PI / 8, 0]);
  foundation(kit, { r: R + 1.6, seg: 8 }, depth);
  pod(kit, wall, roof);
  garden(kit, index % 2 ? 1 : -1);
  addSign(kit, sign, 2.4, 0, 2.75, R + 0.42);
  kit.box('hull', C.dark, 2.5, 0.64, 0.05, 0, 2.75, R + 0.38);
  stairs(kit, drop, 1.6, R + 1.9);
}

export function buildWaterTower(kit) {
  for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) {
    kit.beam('hull', C.steel, [x * 1.3, -1.5, z * 1.3], [x, 6.5, z], 0.14);
  }
  kit.beam('hull', C.steel, [-1.6, 3, -1.6], [1.6, 3, 1.6], 0.08);
  kit.beam('hull', C.steel, [1.6, 3, -1.6], [-1.6, 3, 1.6], 0.08);
  kit.cyl('hull', C.hull, 2.2, 2.2, 3.2, 12, 0, 6.5, 0);
  kit.add('hull', new THREE.ConeGeometry(2.4, 1.2, 12), C.teal, 0, 10.3, 0);
  kit.box('hull', C.accent, 4.5, 0.4, 0.05, 0, 8.1, 2.2);
  kit.box('lamp', C.red, 0.3, 0.3, 0.3, 0, 11, 0);
}

export function buildSolarField(kit) {
  for (let i = 0; i < 6; i++) {
    const x = -3.6 + (i % 3) * 3.6, z = -1.6 + Math.floor(i / 3) * 3.2;
    kit.beam('hull', C.steel, [x, -1.2, z], [x, 1, z], 0.08);
    kit.add('hull', new THREE.BoxGeometry(3.2, 0.08, 2), 0x1f3b6b, x, 1.15, z, [0.45, 0, 0]);
  }
}
