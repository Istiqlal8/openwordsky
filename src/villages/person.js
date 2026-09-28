// Cheap low-poly person: one vertex-coloured body mesh plus four limb meshes, all sharing one material.
// Faces -Z like the astronaut; clothes, hair, headwear (hijab, caping, peci, helmet) vary per resident.
import * as THREE from 'three';
import { GeoKit } from '../base/geo-kit.js';

const SKIN = [0xf1c9a0, 0xe0b088, 0xc8946a, 0xa87450, 0x8a5a3a];
const HAIR = [0x1a1410, 0x2a1d14, 0x4a3020, 0x222222, 0x6a4a2a];
const SHIRT = [0xe0463a, 0x3f8fd0, 0x3fb06a, 0xf0a030, 0xb05ad0, 0xf4f4f0, 0x2fb0b0, 0xe070a0, 0x8a6a4a, 0x4a5aa0];
const PANTS = [0x2f3f5f, 0x4a4a4a, 0x6b5a40, 0x2a2a2a, 0x8a6a4a, 0x3a5a3a];
const SUITS = [0xe9e4d8, 0xd8e0e8, 0xf0d8a8, 0xc8e8d0];
const HIP = 0.88, SHOULDER = 1.44;

// Clothing and headwear for a role ('farmer' | 'fisher' | 'scientist' | 'colonist' | 'miner' | ...).
export function randomLook(rng, role, female) {
  const suit = role === 'colonist' || role === 'miner';
  const head = suit ? 'helmet' : (role === 'farmer' || role === 'fisher') && rng.chance(0.7) ? 'caping'
    : female && rng.chance(0.55) ? 'hijab' : !female && rng.chance(0.25) ? 'peci' : 'hair';
  return { skin: rng.pick(SKIN), hair: rng.pick(HAIR), shirt: suit ? rng.pick(SUITS) : rng.pick(SHIRT),
    pants: suit ? 0x4a515c : rng.pick(PANTS), veil: rng.pick(SHIRT), accent: rng.pick([0x5fd4ff, 0x9cff6a, 0xffa040, 0xff6ab4]),
    head, suit, coat: role === 'scientist', rod: role === 'fisher', skirt: female && !suit && rng.chance(0.4) };
}

function headwear(kit, L) {
  const y = 1.66;
  if (L.head === 'helmet') {
    kit.add('b', new THREE.SphereGeometry(0.23, 10, 8), L.shirt, 0, y, 0);
    kit.box('b', 0x1a2a44, 0.3, 0.16, 0.08, 0, y + 0.01, -0.19);
    kit.box('b', L.accent, 0.08, 0.08, 0.06, 0.12, 1.3, -0.15);
    return kit.box('b', 0x3b424c, 0.4, 0.5, 0.2, 0, 1.2, 0.2);
  }
  kit.box('b', L.skin, 0.24, 0.28, 0.25, 0, y, 0);
  kit.box('b', 0x1a1a1a, 0.05, 0.04, 0.02, -0.06, y + 0.03, -0.13);
  kit.box('b', 0x1a1a1a, 0.05, 0.04, 0.02, 0.06, y + 0.03, -0.13);
  if (L.head === 'hijab') {
    kit.box('b', L.veil, 0.3, 0.36, 0.28, 0, y + 0.02, 0.03);
    kit.box('b', L.veil, 0.48, 0.14, 0.3, 0, 1.5, 0.01);
    return kit.box('b', L.skin, 0.17, 0.2, 0.02, 0, y - 0.01, -0.125);
  }
  kit.box('b', L.hair, 0.26, 0.1, 0.27, 0, y + 0.16, 0.01);
  kit.box('b', L.hair, 0.26, 0.2, 0.06, 0, y + 0.06, 0.12);
  if (L.head === 'caping') kit.add('b', new THREE.ConeGeometry(0.44, 0.24, 10), 0xd9c07a, 0, y + 0.27, 0);
  if (L.head === 'peci') kit.box('b', 0x1a1a1a, 0.26, 0.1, 0.25, 0, y + 0.2, 0.01);
}

function bodyParts(kit, L) {
  kit.box('b', L.shirt, 0.44, 0.6, 0.24, 0, 1.18, 0);
  kit.box('b', L.pants, 0.4, 0.14, 0.22, 0, 0.9, 0);
  if (L.coat) kit.box('b', 0xf8f8f8, 0.47, 0.82, 0.27, 0, 1.08, 0.01);
  if (L.skirt) kit.add('b', new THREE.CylinderGeometry(0.22, 0.3, 0.55, 8), L.pants, 0, 0.62, 0);
  kit.box('b', L.skin, 0.1, 0.08, 0.1, 0, 1.51, 0);
  headwear(kit, L);
}

function limbParts(kit, L) {
  const sleeve = L.coat ? 0xf8f8f8 : L.shirt, hand = L.suit ? 0x3b424c : L.skin;
  for (const k of ['a', 'r']) {
    kit.box(k, sleeve, 0.12, 0.3, 0.13, 0, -0.15, 0);
    kit.box(k, L.suit || L.coat ? sleeve : L.skin, 0.1, 0.28, 0.11, 0, -0.44, 0);
    kit.box(k, hand, 0.1, 0.1, 0.1, 0, -0.62, 0);
  }
  if (L.rod) kit.beam('r', 0x6b4a30, [0, -0.62, 0], [0, -2.8, -2.2], 0.02, 4);
  kit.box('l', L.pants, 0.17, 0.78, 0.19, 0, -0.39, 0);
  kit.box('l', L.suit ? 0x3b424c : 0x2a2420, 0.19, 0.1, 0.28, 0, -0.83, -0.04);
}

function pivot(mesh, x, y) {
  const g = new THREE.Group();
  g.position.set(x, y, 0);
  g.add(mesh);
  return g;
}

export class Person {
  // mat: shared vertex-colour material; look: from randomLook(); scale: 1 adult, ~0.62 child.
  constructor(mat, look, scale = 1) {
    const kit = new GeoKit().at(0, 0, 0, 0);
    bodyParts(kit, look);
    limbParts(kit, look);
    const m = kit.build({ b: mat, a: mat, r: mat, l: mat });
    this.geos = [m.b.geometry, m.a.geometry, m.r.geometry, m.l.geometry];
    this.body = new THREE.Group();
    this.arms = [pivot(m.a, -0.29, SHOULDER), pivot(m.r, 0.29, SHOULDER)];
    this.legs = [pivot(m.l, -0.12, HIP), pivot(new THREE.Mesh(m.l.geometry, mat), 0.12, HIP)];
    this.body.add(m.b, ...this.arms, ...this.legs);
    this.group = new THREE.Group();
    this.group.add(this.body);
    this.group.scale.setScalar(scale);
  }

  // kind: 'walk' | 'idle' | 'work' | 'sit' | 'fish' | 'wave'; t: seconds.
  pose(kind, t) {
    const [la, ra] = this.arms, [ll, rl] = this.legs, swing = kind === 'walk' ? Math.sin(t * 7) * 0.6 : 0;
    ll.rotation.x = kind === 'sit' ? 1.45 : swing;
    rl.rotation.x = kind === 'sit' ? 1.45 : -swing;
    la.rotation.set(-swing * 0.8, 0, 0);
    ra.rotation.set(swing * 0.8, 0, 0);
    this.body.position.y = kind === 'sit' ? -0.42 : 0;
    this.body.rotation.x = 0;
    if (kind === 'work') this.work(t);
    else if (kind === 'fish') { ra.rotation.x = 1.3 + Math.sin(t * 0.8) * 0.05; la.rotation.x = 0.9; }
    else if (kind === 'wave') { ra.rotation.z = 2.5 + Math.sin(t * 9) * 0.35; }
    else if (kind === 'idle') { la.rotation.x = Math.sin(t * 1.3) * 0.05; }
  }

  // Hoeing / harvesting: bend forward and swing both arms.
  work(t) {
    const s = Math.sin(t * 3);
    this.body.rotation.x = 0.25 + s * 0.08;
    this.arms[0].rotation.x = this.arms[1].rotation.x = 0.9 + s * 0.5;
  }

  dispose() {
    this.group.removeFromParent();
    for (const g of this.geos) g.dispose();
  }
}
