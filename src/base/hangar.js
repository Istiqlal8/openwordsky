// Arched hangar (open front at +Z) where the player swaps ships; a spare ship waits inside.
import * as THREE from 'three';
import { C } from './materials.js';
import { foundation, stairs } from './ground.js';
import { addSign } from './signs.js';

const R = 7, L = 16;
export const HANGAR = { w: 15, d: 17, door: { x: 0, z: 11 }, shipSpot: { x: 0, z: -1.5 }, lights: [-5, 0, 5], lightY: R - 0.5 };

function shell(kit) {
  const arch = new THREE.CylinderGeometry(R, R, L, 18, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2);
  kit.add('hull', arch, C.hull);
  kit.add('hull', new THREE.CircleGeometry(R, 18, 0, Math.PI), C.panel, 0, 0, -L / 2);
  for (let i = 0; i <= 4; i++) {
    const z = -L / 2 + (i * L) / 4, hex = i === 4 ? C.accent : C.steel;
    kit.add('hull', new THREE.TorusGeometry(R + 0.12, i === 4 ? 0.35 : 0.2, 4, 18, Math.PI), hex, 0, 0, z);
  }
  // Glass strips along the roof, lit from inside.
  for (const a of [-0.5, 0.5]) {
    const geo = new THREE.BoxGeometry(0.9, 0.08, L - 3);
    kit.add('glow', geo, C.cool, Math.sin(a) * (R + 0.05), Math.cos(a) * (R + 0.05), 0, [0, 0, -a]);
  }
}

function doors(kit) {
  for (const s of [-1, 1]) {
    kit.box('hull', C.panel, 3.2, 6.2, 0.35, s * (R + 1.2), 3.1, L / 2 + 0.3);
    kit.box('hull', C.accent, 0.3, 6.2, 0.4, s * (R + 2.7), 3.1, L / 2 + 0.3);
    kit.box('glow', C.warm, 0.25, 0.25, 0.1, s * (R + 1.2), 5.6, L / 2 + 0.5);
  }
  kit.box('hull', C.dark, 6, 0.3, 0.6, 0, R + 0.1, L / 2 + 0.2);
  addSign(kit, 'hangar', 5, 0, R + 1.25, L / 2 + 0.35);
}

function interior(kit) {
  kit.box('hull', C.dark, 13.6, 0.1, L - 0.4, 0, 0.05, 0);
  kit.add('pad', new THREE.RingGeometry(4.2, 4.6, 32).rotateX(-Math.PI / 2), C.stripe, 0, 0.12, HANGAR.shipSpot.z);
  for (let i = 0; i < 6; i++) {
    const z = -L / 2 + 1.5 + i * 2.6;
    kit.box('lamp', C.cool, 0.25, 0.1, 1.2, -6.4, 0.14, z);
    kit.box('lamp', C.cool, 0.25, 0.1, 1.2, 6.4, 0.14, z);
  }
  for (const z of HANGAR.lights) kit.add('lamp', new THREE.SphereGeometry(0.3, 8, 6), C.cool, 0, HANGAR.lightY, z);
  // Tool cabinets and fuel tanks along the back wall.
  for (let i = 0; i < 4; i++) kit.box('hull', i % 2 ? C.accent : C.teal, 1.4, 2.2, 0.8, -5 + i * 1.6, 1.1, -L / 2 + 0.6);
  for (const x of [3.8, 5]) kit.cyl('hull', C.hull, 0.5, 0.5, 2.4, 10, x, 0, -L / 2 + 0.9);
  kit.box('glow', C.cool, 1.2, 0.8, 0.06, -2.6, 1.9, -L / 2 + 1.03);
}

// kit frame must already sit at the hangar floor. drop: floor height above the ground at the door.
export function buildHangar(kit, depth, drop) {
  kit.box('hull', C.panel, HANGAR.w, 0.4, L + 0.6, 0, -0.2, 0);
  foundation(kit, { w: HANGAR.w, d: L + 0.6 }, depth);
  shell(kit);
  doors(kit);
  interior(kit);
  stairs(kit, drop, 6, L / 2 + 0.3);
}
