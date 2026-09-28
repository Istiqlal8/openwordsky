// Base pieces: name, cost, how they snap and their low-poly parts. Parts are drawn into a
// GeoKit (src/base/geo-kit.js) whose frame is already at the piece's standing point and yaw.
// Snap kinds: 'floor' = grid cell, 'edge' = cell side, 'roof' = cell at wall height, 'free'.
import * as THREE from 'three';
import { FLORA_MATERIALS } from '../quest/materials.js';

export const GRID = 4;       // foundation cell size
export const WALL_H = 3;     // wall height; roofs sit this high above the floor
export const BASE_RADIUS = 48; // pieces must stay this close to the beacon

const group = (label, any) => (n) => ({ label, any, n });
const item = (name) => (n) => ({ label: name, any: [name], n });
const [FERIT, KARBON, NANIT, PROTEIN] = ['Ferit', 'Karbon', 'Nanit', 'Protein Fauna'].map(item);
const BIO = group('Bahan Flora', FLORA_MATERIALS);

const METAL = 0x8d97a4, DARK = 0x4b535e, TRIM = 0xc9d2dc, AMBER = 0xffb347, WOOD = 0x9a6b43, SOIL = 0x5a3d26;
const GLOW = 0x9fefff, GLASS = 0x9fe8ff;

const ball = (k, bucket, hex, r, x, y, z) => k.add(bucket, new THREE.SphereGeometry(r, 8, 6), hex, x, y, z);
const legs = (k, hex, w, d, h) => {
  for (const [x, z] of [[-w, -d], [w, -d], [-w, d], [w, d]]) k.box('solid', hex, 0.08, h, 0.08, x, h / 2, z);
};

function beacon(k) {
  k.cyl('solid', DARK, 0.7, 0.9, 0.3, 8, 0, 0, 0);
  k.cyl('solid', METAL, 0.12, 0.18, 2.6, 6, 0, 0.3, 0);
  k.cyl('solid', AMBER, 0.45, 0.45, 0.12, 8, 0, 1.4, 0);
  ball(k, 'glow', GLOW, 0.32, 0, 3.1, 0);
}

function foundation(k) {
  k.box('solid', DARK, GRID, 3, GRID, 0, -1.5, 0);
  k.box('solid', METAL, GRID - 0.2, 0.06, GRID - 0.2, 0, 0.02, 0);
}

function wall(k) {
  k.box('solid', METAL, GRID, WALL_H, 0.3, 0, WALL_H / 2, 0);
  k.box('solid', TRIM, GRID, 0.12, 0.34, 0, 0.9, 0);
}

function windowWall(k) {
  k.box('solid', METAL, GRID, 1, 0.3, 0, 0.5, 0);
  k.box('solid', METAL, GRID, 0.8, 0.3, 0, 2.6, 0);
  for (const s of [-1, 1]) k.box('solid', METAL, 0.8, 1.2, 0.3, s * 1.6, 1.6, 0);
  k.box('glass', GLASS, 2.4, 1.2, 0.08, 0, 1.6, 0);
}

function door(k) {
  for (const s of [-1, 1]) k.box('solid', METAL, 0.9, WALL_H, 0.3, s * 1.55, WALL_H / 2, 0);
  k.box('solid', METAL, GRID, 0.7, 0.3, 0, 2.65, 0);
  k.box('solid', AMBER, 2.2, 2.3, 0.1, 0, 1.15, 0.12);
  ball(k, 'glow', GLOW, 0.06, 0.8, 1.15, 0.2);
}

function roof(k) {
  k.box('solid', DARK, GRID + 0.2, 0.25, GRID + 0.2, 0, 0.125, 0);
  k.box('solid', TRIM, GRID + 0.3, 0.08, 0.2, 0, 0.29, GRID / 2);
}

function stairs(k) {
  for (let i = 0; i < 5; i++) k.box('solid', i % 2 ? METAL : DARK, 1.6, (i + 1) * 0.6, 0.8, 0, (i + 1) * 0.3, 1.6 - i * 0.8);
}

function fence(k) {
  for (const x of [-1.9, 0, 1.9]) k.box('solid', WOOD, 0.14, 1.2, 0.14, x, 0.6, 0);
  for (const y of [0.45, 0.95]) k.box('solid', WOOD, GRID, 0.1, 0.06, 0, y, 0);
}

function lamp(k) {
  k.cyl('solid', DARK, 0.18, 0.22, 0.12, 6, 0, 0, 0);
  k.cyl('solid', METAL, 0.05, 0.06, 1.8, 5, 0, 0.1, 0);
  ball(k, 'glow', 0xfff1b8, 0.22, 0, 2.05, 0);
}

function table(k) {
  k.box('solid', WOOD, 1.6, 0.1, 0.9, 0, 0.8, 0);
  legs(k, DARK, 0.7, 0.35, 0.78);
}

function chair(k) {
  k.box('solid', WOOD, 0.6, 0.08, 0.6, 0, 0.45, 0);
  k.box('solid', WOOD, 0.6, 0.6, 0.08, 0, 0.8, -0.28);
  legs(k, DARK, 0.25, 0.25, 0.44);
}

function sign(k) {
  for (const s of [-1, 1]) k.box('solid', DARK, 0.1, 1.8, 0.1, s * 0.7, 0.9, 0);
  k.box('solid', AMBER, 1.6, 0.8, 0.08, 0, 1.4, 0.06);
  k.box('glow', GLOW, 1.2, 0.08, 0.02, 0, 1.4, 0.11);
}

function planter(k) {
  k.box('solid', DARK, 2, 0.5, 2, 0, 0.25, 0);
  k.box('solid', SOIL, 1.8, 0.05, 1.8, 0, 0.5, 0);
}

function pen(k) {
  k.box('solid', SOIL, GRID, 0.06, GRID, 0, 0.03, 0);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) k.box('solid', WOOD, 0.16, 1.3, 0.16, x, 0.65, z);
  for (const y of [0.5, 1.1]) {
    for (const s of [-1, 1]) {
      k.box('solid', WOOD, GRID, 0.1, 0.06, 0, y, s * 2);
      k.box('solid', WOOD, 0.06, 0.1, GRID, s * 2, y, 0);
    }
  }
}

// solid: blocks the player on foot. act: T does something (src/build/base-life.js).
export const BEACON = { id: 'suar', name: 'Suar Markas', kind: 'free', cost: [FERIT(20), KARBON(10), NANIT(50)], draw: beacon };
export const PIECES = [
  { id: 'fondasi', name: 'Fondasi', kind: 'floor', cost: [FERIT(8), KARBON(4)], draw: foundation },
  { id: 'dinding', name: 'Dinding', kind: 'edge', solid: true, cost: [FERIT(6), KARBON(2)], draw: wall },
  { id: 'pintu', name: 'Pintu', kind: 'edge', cost: [FERIT(8), KARBON(2)], draw: door },
  { id: 'jendela', name: 'Jendela', kind: 'edge', solid: true, cost: [FERIT(6), KARBON(4)], draw: windowWall },
  { id: 'atap', name: 'Atap', kind: 'roof', cost: [FERIT(6), KARBON(4)], draw: roof },
  { id: 'lampu', name: 'Lampu', kind: 'free', cost: [FERIT(2), KARBON(2)], draw: lamp },
  { id: 'kebun', name: 'Kebun', kind: 'free', act: true, cost: [KARBON(10), FERIT(4), BIO(2)], draw: planter },
  { id: 'kandang', name: 'Kandang', kind: 'floor', act: true, cost: [FERIT(12), KARBON(6), NANIT(20)], draw: pen },
  { id: 'tangga', name: 'Tangga', kind: 'free', cost: [FERIT(6)], draw: stairs },
  { id: 'pagar', name: 'Pagar', kind: 'edge', solid: true, cost: [KARBON(4)], draw: fence },
  { id: 'meja', name: 'Meja', kind: 'free', cost: [KARBON(4), BIO(1)], draw: table },
  { id: 'kursi', name: 'Kursi', kind: 'free', cost: [KARBON(3)], draw: chair },
  { id: 'papan', name: 'Papan Nama', kind: 'free', cost: [KARBON(3), FERIT(1)], draw: sign },
];

const BY_ID = Object.fromEntries([BEACON, ...PIECES].map((p) => [p.id, p]));
export const pieceOf = (id) => BY_ID[id];

// Protein Fauna lures an animal into a pen (same bait as taming a pet).
export const PEN_BAIT = [PROTEIN(1)];
