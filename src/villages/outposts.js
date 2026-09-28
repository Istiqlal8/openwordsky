// Off-world and science structures: research domes, antenna masts, colony habitats, greenhouses,
// landing pads and mining modules (kit frame at the floor, front +Z).
import * as THREE from 'three';
import { foundation, stairs } from '../base/ground.js';
import { addSign } from './signs.js';

const WHITE = 0xe9e6de, STEEL = 0x6d7782, DARK = 0x3b424c, COOL = 0x9fd8ff;

// Hemispherical dome with a lit window band and an airlock door.
export function buildDome(kit, r, hex, depth, drop, sign = null) {
  foundation(kit, { r: r + 0.3, seg: 12 }, depth, STEEL);
  kit.add('hull', new THREE.SphereGeometry(r, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), hex, 0, 0, 0);
  kit.add('glow', new THREE.CylinderGeometry(r * 0.93, r * 0.98, 0.5, 14, 1, true), COOL, 0, r * 0.35, 0);
  kit.box('hull', DARK, 1.6, 2.4, 1.6, 0, 1.2, r - 0.2);
  kit.box('glow', COOL, 1, 1.9, 0.08, 0, 1.05, r + 0.62);
  if (sign) addSign(kit, sign, 2.6, 0, 2.9, r + 0.4);
  stairs(kit, drop, 1.6, r + 0.9);
  return { door: { x: 0, z: r + 1.6 } };
}

// Lattice mast with a red top light (the dish is a Mover). Returns top height.
export function buildMast(kit, H) {
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [x, z] of legs) kit.beam('hull', STEEL, [x * 1.4, -1.2, z * 1.4], [x * 0.3, H, z * 0.3], 0.1);
  for (let y = 2; y < H - 1; y += 3) {
    const w = 1.4 - (1.1 * y) / H;
    for (let i = 0; i < 4; i++) {
      const [ax, az] = legs[i], [bx, bz] = legs[(i + 1) % 4];
      kit.beam('hull', i % 2 ? 0xe0463a : WHITE, [ax * w, y, az * w], [bx * w, y + 1.5, bz * w], 0.05, 4);
    }
  }
  kit.box('lamp', 0xff4a3a, 0.3, 0.3, 0.3, 0, H + 0.2, 0);
  return H;
}

// Solar panels in a row (kit frame on the ground).
export function solarRow(kit, n) {
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 2.4;
    kit.beam('hull', STEEL, [x, -1, 0], [x, 0.9, 0], 0.07);
    kit.add('hull', new THREE.BoxGeometry(2.2, 0.08, 1.5), 0x1f3b6b, x, 1, 0, [0.5, 0, 0]);
  }
}

// Prefab habitat: a capsule lying on legs with a round porthole row and a door.
export function buildHabitat(kit, hex, depth, drop, sign) {
  const len = 8, r = 2;
  foundation(kit, { w: len, d: r * 2 }, depth, STEEL);
  kit.add('hull', new THREE.CapsuleGeometry(r, len - r * 2, 4, 10).rotateZ(Math.PI / 2), hex, 0, r, 0);
  kit.box('hull', DARK, len * 0.9, 0.3, 0.2, 0, r + 0.3, r - 0.05);
  for (let i = -2; i <= 2; i++) {
    if (i) kit.add('glow', new THREE.CylinderGeometry(0.34, 0.34, 0.1, 10).rotateX(Math.PI / 2), 0xffd08a, i * 1.3, r + 0.1, r - 0.02);
  }
  kit.box('hull', STEEL, 1.4, 2.4, 1.2, 0, 1.2, r + 0.2);
  kit.box('glow', COOL, 0.9, 1.8, 0.08, 0, 1.1, r + 0.84);
  if (sign) addSign(kit, sign, 2.4, 0, r * 2 + 0.7, 0, 0);
  stairs(kit, drop, 1.4, r + 1.1);
  return { door: { x: 0, z: r + 1.8 } };
}

// Arched greenhouse with plant rows inside (the glass glows green at night).
export function buildGreenhouse(kit, depth) {
  const len = 9, r = 2.6;
  foundation(kit, { w: len, d: r * 2 }, depth, STEEL);
  const arch = new THREE.CylinderGeometry(r, r, len, 12, 1, true, 0, Math.PI).rotateZ(Math.PI / 2);
  kit.add('glass', arch, 0xbfffd0, 0, 0, 0);
  for (let i = 0; i <= 4; i++) kit.add('hull', new THREE.TorusGeometry(r + 0.03, 0.06, 4, 12, Math.PI).rotateY(Math.PI / 2), STEEL, -len / 2 + (i * len) / 4, 0, 0);
  for (const z of [-1, 1]) {
    kit.box('hull', 0x5b4330, len - 1, 0.4, 0.8, 0, 0.2, z);
    for (let k = 0; k < 7; k++) kit.add('hull', new THREE.IcosahedronGeometry(0.33, 0), 0x4faf3a, -len / 2 + 1 + k * 1.15, 0.65, z);
  }
}

// Landing pad (octagon with stripes and edge lights). Returns the pad centre (world is the kit frame).
export function buildLandingPad(kit, r, depth) {
  kit.add('hull', new THREE.CylinderGeometry(r, r, 0.4, 8), 0x4a515c, 0, -0.2, 0, [0, Math.PI / 8, 0]);
  foundation(kit, { r: r * 0.92, seg: 8 }, depth, STEEL);
  kit.add('pad', new THREE.RingGeometry(r - 1.2, r - 0.8, 24).rotateX(-Math.PI / 2), 0xf2c14e, 0, 0.02, 0);
  for (const x of [-1.3, 1.3]) kit.box('pad', 0xf2c14e, 0.5, 0.04, 3.8, x, 0.02, 0);
  kit.box('pad', 0xf2c14e, 2.2, 0.04, 0.5, 0, 0.02, 0);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    kit.box('pad', i % 3 ? COOL : 0x6aff8a, 0.3, 0.16, 0.3, Math.cos(a) * (r - 0.3), 0.08, Math.sin(a) * (r - 0.3));
  }
}

// Mining container module with hazard stripes.
export function buildModule(kit, hex, depth, drop, sign) {
  const w = 6, d = 3.4, h = 2.8;
  foundation(kit, { w, d }, depth, STEEL);
  kit.box('hull', hex, w, h, d, 0, h / 2, 0);
  for (let i = 0; i < 6; i++) kit.box('hull', i % 2 ? 0x222222 : 0xf2c14e, w / 6, 0.3, 0.06, -w / 2 + (i + 0.5) * (w / 6), 0.3, d / 2 + 0.03);
  kit.box('glow', 0xffd08a, 1.4, 0.7, 0.08, -1.6, 1.8, d / 2 + 0.03);
  kit.box('hull', DARK, 1.1, 2.1, 0.08, 1.4, 1.05, d / 2 + 0.03);
  if (sign) addSign(kit, sign, 2.2, -1.2, h + 0.5, d / 2 - 0.2);
  stairs(kit, drop, 1.2, d / 2 + 0.3);
  return { door: { x: 1.4, z: d / 2 + 1.1 } };
}

// Drill rig frame (the spinning bit is a Mover). Returns the bit height above the floor.
export function buildRig(kit) {
  for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]]) kit.beam('hull', 0xf2c14e, [x, -0.8, z], [x * 0.3, 9, z * 0.3], 0.13);
  kit.box('hull', DARK, 1.6, 1.2, 1.6, 0, 9.4, 0);
  kit.box('lamp', 0xffa040, 0.3, 0.3, 0.3, 0, 10.2, 0);
  for (let i = 0; i < 5; i++) kit.add('hull', new THREE.DodecahedronGeometry(0.5 + (i % 3) * 0.2, 0), 0x8a7a6a, 2.4 + (i % 2) * 0.8, 0.3, -1 + i * 0.6);
  return 9;
}
