// The hangar bay of the space freighter: a lit cavity in the +X flank, a force field over the
// mouth, and a docking guide (floor chevrons + gates) leading pilots in.
import * as THREE from 'three';
import { box, glow } from './kit.js';

// Bay span along the hull (z), cavity depth (x) and half height (y), space units.
export const BAY = { z0: -24, z1: 32, depth: 26, half: 9 };
const W = 46, H = 34;
const CHEVRONS = 7;

function slabs(g, mats) {
  const len = BAY.z1 - BAY.z0, zc = (BAY.z0 + BAY.z1) / 2, cap = H / 2 - BAY.half;
  box(g, mats.hull, W, cap, len, 0, BAY.half + cap / 2, zc);
  box(g, mats.hull, W, cap, len, 0, -BAY.half - cap / 2, zc);
  const inner = W - BAY.depth;
  box(g, mats.plate, inner, BAY.half * 2, len, -W / 2 + inner / 2, 0, zc);
}

// Lit interior: back wall panels, ceiling bars, floor landing strips.
function cavityLights(g, mats) {
  const len = BAY.z1 - BAY.z0, zc = (BAY.z0 + BAY.z1) / 2, back = W / 2 - BAY.depth;
  for (let z = BAY.z0 + 6; z < BAY.z1 - 3; z += 8) {
    box(g, mats.bay, 4, 6, 0.4, back + 0.3, 1, z).rotation.y = Math.PI / 2;
    box(g, mats.window, BAY.depth - 4, 0.5, 1, W / 2 - BAY.depth / 2, BAY.half - 0.4, z);
  }
  for (const z of [zc - 9, zc + 9]) box(g, mats.warn, BAY.depth, 0.2, 0.8, W / 2 - BAY.depth / 2, -BAY.half + 0.2, z);
  box(g, mats.dark, BAY.depth - 2, 0.3, 10, W / 2 - BAY.depth / 2, -BAY.half + 0.2, zc);
  const light = new THREE.PointLight(0xcfeeff, 6, 90, 0.6);
  light.position.set(W / 2 - BAY.depth * 0.6, 2, zc);
  g.add(light);
  return len;
}

// Glowing frame and a faint force field across the opening.
function mouth(g, mats, len) {
  const zc = (BAY.z0 + BAY.z1) / 2, x = W / 2 + 0.4;
  box(g, mats.bay, 0.8, 0.8, len + 0.8, x, BAY.half, zc);
  box(g, mats.bay, 0.8, 0.8, len + 0.8, x, -BAY.half, zc);
  box(g, mats.bay, 0.8, BAY.half * 2, 0.8, x, 0, BAY.z0);
  box(g, mats.bay, 0.8, BAY.half * 2, 0.8, x, 0, BAY.z1);
  const fieldMat = new THREE.MeshBasicMaterial({ color: 0x5cc8ff, transparent: true, opacity: 0.1,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(len, BAY.half * 2), fieldMat);
  field.rotation.y = Math.PI / 2;
  field.position.set(x, 0, zc);
  g.add(field);
  return fieldMat;
}

// Arrow ">" lying flat, pointing -X (into the bay).
function chevron(g, mat, x, y, z) {
  const c = new THREE.Group();
  for (const s of [-1, 1]) {
    const bar = box(c, mat, 7, 0.4, 1.2, 0, 0, s * 2.2);
    bar.rotation.y = s * 0.6;
  }
  c.position.set(x, y, z);
  g.add(c);
}

// Floor chevrons outside the mouth (blinking in sequence) and hollow gates in the approach lane.
function guide(g) {
  const zc = (BAY.z0 + BAY.z1) / 2, mats = [];
  for (let i = 0; i < CHEVRONS; i++) {
    const m = glow(0x7fe6ff, 0.4);
    mats.push(m);
    chevron(g, m, W / 2 + 8 + i * 11, -BAY.half, zc);
  }
  const gate = glow(0x9ff0ff, 1.6);
  for (const [d, s] of [[26, 1], [52, 0.85], [80, 0.7]]) {
    const hz = (BAY.z1 - BAY.z0) / 2 * s, hy = BAY.half * s, x = W / 2 + d;
    box(g, gate, 0.5, 0.5, hz * 2, x, hy, zc);
    box(g, gate, 0.5, 0.5, hz * 2, x, -hy, zc);
    box(g, gate, 0.5, hy * 2, 0.5, x, 0, zc - hz);
    box(g, gate, 0.5, hy * 2, 0.5, x, 0, zc + hz);
  }
  return mats;
}

// Builds the bay into `g`; returns local anchors and animated materials.
export function buildBay(g, mats) {
  slabs(g, mats);
  const len = cavityLights(g, mats);
  const field = mouth(g, mats, len);
  const chevrons = guide(g);
  const zc = (BAY.z0 + BAY.z1) / 2;
  return {
    field, chevrons,
    dock: new THREE.Vector3(W / 2 - 5, 0, zc),       // just inside the force field
    radius: 12,
    launch: new THREE.Vector3(W / 2 + 34, 0, zc),    // exit point for the player's ship
    normal: new THREE.Vector3(1, 0, 0),
  };
}
