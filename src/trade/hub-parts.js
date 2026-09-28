// Trade hub geometry drawn into a villages Builder (merged per material bucket): the exchange
// tower, streets, shop buildings, market stalls, landing pads and cargo yards.
import * as THREE from 'three';
import { HUB, avenuePoint } from './hub-plan.js';

const WALLS = [0x8a94a6, 0xb0a48c, 0x6f8fa8, 0xa88f7a, 0x7a8a78, 0x9a8aa8, 0xc0b8a8, 0x5f6f86];
const CANOPY = [0xe0463a, 0x3f8fd0, 0xf0a030, 0x3fb06a, 0xb05ad0, 0x2fb0b0, 0xe070a0, 0xf4f4f0];
const CRATES = [0xc0392b, 0x2e86c1, 0xd4ac0d, 0x27ae60, 0xe67e22, 0x7d3c98, 0x95a5a6, 0x1abc9c];
const hexOf = (css) => parseInt(css.slice(1), 16);

export function streets(b, plan) {
  b.disc(0, 0, HUB.plaza, 0x585d68, 0.12, 40);
  b.disc(0, 0, 13, 0x7a6a50, 0.16, 32);
  for (const t of plan.avenues) {
    const a = avenuePoint(t, HUB.plaza - 2), z = avenuePoint(t, HUB.R);
    b.strip(a.x, a.z, z.x, z.z, HUB.avenueW, 0x3d4048, 0.1);
  }
  const n = 36;
  for (let i = 0; i < n; i++) {
    const a = avenuePoint((i / n) * Math.PI * 2, HUB.ring), c = avenuePoint(((i + 1) / n) * Math.PI * 2, HUB.ring);
    b.strip(a.x, a.z, c.x, c.z, 9, 0x44474f, 0.08);
  }
}

// Central exchange tower ("Bursa Galaksi") with platforms, neon bands and four signs.
export function tower(b, signs) {
  const f = b.place(0, 0, 0, 10), k = b.kit, gold = hexOf(signs.colorOf('tower'));
  k.cyl('hull', 0x3a4250, 9.5, 10.5, f.depth + 3, 16, 0, -f.depth, 0);
  k.cyl('hull', 0x566070, 4, 5, 52, 8, 0, 3, 0);
  for (let y = 8; y < 54; y += 5) k.cyl('neon', y % 2 ? 0x7df0ff : gold, 4.35, 4.35, 0.35, 8, 0, y, 0);
  for (const y of [18, 34, 48]) {
    k.cyl('hull', 0x2c323d, 8 - y * 0.06, 7 - y * 0.06, 1.2, 16, 0, y, 0);
    k.cyl('neon', gold, 8.1 - y * 0.06, 8.1 - y * 0.06, 0.3, 16, 0, y + 1.0, 0);
    k.cyl('glow', 0xfff0c0, 7.2 - y * 0.06, 7.2 - y * 0.06, 0.8, 16, 0, y + 1.2, 0);
  }
  k.add('hull', new THREE.ConeGeometry(3, 12, 8), 0x8a94a4, 0, 61, 0);
  k.add('neon', new THREE.IcosahedronGeometry(1.4, 1), gold, 0, 68, 0);
  k.add('neon', new THREE.TorusGeometry(14, 0.14, 6, 64), 0x7df0ff, 0, 6, 0, [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2, s = Math.sin(a), c = Math.cos(a);
    k.box('hull', 0x10131a, 9.2, 2.6, 0.3, s * 5.3, 11, c * 5.3, a);
    signs.add(k, 'tower', 8.8, s * 5.5, 11, c * 5.5, a);
  }
  return { x: f.x, z: f.z, floor: f.floor };
}

// Shop building facing the avenue; interactive ones get a counter for the vendor.
export function shopBuilding(b, signs, lot, rng) {
  const w = rng.range(8, 11), d = rng.range(7, 9), floors = 1 + rng.int(3), h = floors * 4.2;
  const f = b.place(lot.x, lot.z, lot.face, Math.max(w, d) / 2 + 0.5, { x: 0, z: d / 2 + 1 }), k = b.kit;
  const key = lot.shopType ?? `decor${lot.decor}`, neon = hexOf(signs.colorOf(key));
  k.box('hull', rng.pick(WALLS), w, h + f.depth, d, 0, (h - f.depth) / 2, 0);
  k.box('hull', 0x22262e, w + 0.4, 0.4, d + 0.4, 0, h + 0.2, 0);
  for (let i = 0; i < floors; i++) k.box('glow', 0xfff0c8, w * 0.8, 1.3, 0.05, 0, 2.4 + i * 4.2 + (i ? 0.4 : 0.8), d / 2 + 0.03);
  k.box('hull', 0x151a22, 2.2, 2.6, 0.1, 0, 1.3, d / 2 + 0.05);
  k.box('hull', rng.pick(CANOPY), w, 0.12, 1.5, 0, 3.3, d / 2 + 0.75);
  k.box('neon', neon, w, 0.14, 0.14, 0, 3.22, d / 2 + 1.5);
  k.box('hull', 0x10131a, w * 0.9, w * 0.9 / 4 + 0.25, 0.25, 0, h + 1.5, d / 2 - 0.3);
  signs.add(k, key, w * 0.86, 0, h + 1.5, d / 2 - 0.15);
  if (!lot.shopType) return null;
  k.box('hull', 0x2a2f3a, 3.2, 1.05, 0.8, 0, 0.52, d / 2 + 2.3);
  k.box('neon', neon, 3.2, 0.08, 0.84, 0, 1.08, d / 2 + 2.3);
  b.colliders.push({ ...b.offset(f, 0, d / 2 + 2.3), r: 1.1 });
  return { vendor: b.offset(f, 0, d / 2 + 1.3), front: b.offset(f, 0, d / 2 + 3.6), yaw: f.yaw + Math.PI, floor: f.floor };
}

// Open market stall: striped canopy on poles, a counter and colourful goods.
export function stall(b, lot, rng) {
  const f = b.place(lot.x, lot.z, lot.face, 2.6, { x: 0, z: 2 }), k = b.kit;
  const [c1, c2] = [rng.pick(CANOPY), rng.pick(CANOPY)];
  k.box('hull', 0x4a4f58, 3.6, f.depth + 0.2, 2.8, 0, -f.depth / 2, 0);
  for (const [x, z] of [[-1.6, -1.1], [1.6, -1.1], [-1.6, 1.1], [1.6, 1.1]]) k.box('hull', 0x5a4a3a, 0.12, 2.6, 0.12, x, 1.3, z);
  for (let i = 0; i < 3; i++) k.box('hull', i % 2 ? c2 : c1, 1.15, 0.12, 2.9, (i - 1) * 1.1, 2.68, 0);
  k.box('hull', 0x6b4a30, 3.2, 0.9, 0.8, 0, 0.45, 1.0);
  for (let i = 0; i < 5; i++) k.box('hull', rng.pick(CRATES), 0.36, 0.28 + rng.range(0, 0.2), 0.36, -1.2 + i * 0.6, 1.05, 1.0);
  k.add('neon', new THREE.OctahedronGeometry(0.2, 0), rng.pick(CANOPY), 1.3, 1.25, 0.9);
  k.box('lamp', 0xffd08a, 0.25, 0.3, 0.25, 0, 2.35, 1.0);
}

// Landing pad (walkable): slab, rim lights and a painted ring. Returns the pad top centre.
export function pad(b, p) {
  const R = HUB.padR, f = b.place(p.x, p.z, p.yaw, R, { x: 0, z: R }, 0.3), k = b.kit;
  b.colliders.pop();
  k.cyl('hull', 0x2c313a, R, R + 0.5, f.depth + 0.6, 24, 0, -f.depth - 0.3, 0);
  k.add('pad', new THREE.TorusGeometry(R * 0.55, 0.2, 4, 40), 0xffc94a, 0, 0.32, 0, [Math.PI / 2, 0, 0]);
  k.box('pad', 0xffc94a, 0.5, 0.06, R * 0.9, 0, 0.32, 0);
  k.box('pad', 0xffc94a, R * 0.9, 0.06, 0.5, 0, 0.32, 0);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    k.box('pad', i % 2 ? 0x7df0ff : 0xff6a4a, 0.4, 0.2, 0.4, Math.cos(a) * (R - 0.4), 0.38, Math.sin(a) * (R - 0.4));
  }
  return { x: f.x, z: f.z, y: f.floor + 0.3, yaw: f.yaw };
}

// Container stacks under a gantry crane plus a tall tower crane.
export function cargoYard(b, yard, rng) {
  const c = Math.cos(yard.yaw), s = Math.sin(yard.yaw);
  const at = (lx, lz) => ({ x: yard.x + c * lx + s * lz, z: yard.z - s * lx + c * lz });
  for (let r = 0; r < 4; r++) {
    for (let q = 0; q < 5; q++) {
      const p = at((q - 2) * 3.4, (r - 1.5) * 7.4), f = b.place(p.x, p.z, yard.yaw, 3.3, { x: 0, z: 3.4 }), n = 1 + rng.int(3);
      b.kit.box('hull', 0x3a3f48, 2.8, f.depth + 0.2, 6.4, 0, -f.depth / 2, 0);
      for (let i = 0; i < n; i++) b.kit.box('hull', rng.pick(CRATES), 2.6, 2.55, 6.1, 0, 1.3 + i * 2.6, 0);
    }
  }
  const f = b.place(yard.x, yard.z, yard.yaw, 1);
  b.colliders.pop();
  gantry(b.kit, f);
  towerCrane(b, at(0, -22), yard.yaw);
}

function gantry(k, f) {
  for (const x of [-10, 10]) {
    for (const z of [-12, 12]) k.box('hull', 0xf2c14e, 0.7, 18, 0.7, x, 5, z);
    k.box('hull', 0xf2c14e, 0.8, 0.8, 25, x, 14, 0);
  }
  for (const z of [-3, 3]) k.box('hull', 0xf2c14e, 21, 1, 1, 0, 14.4, z);
  k.box('hull', 0x3b424c, 3, 1.6, 7, 3, 13.2, 0);
  k.box('lamp', 0xffd08a, 0.5, 0.3, 0.5, 3, 12.2, 0);
}

function towerCrane(b, p, yaw) {
  const f = b.place(p.x, p.z, yaw + 0.8, 1.5), k = b.kit;
  k.box('hull', 0xe07030, 1.3, 32 + f.depth, 1.3, 0, (32 - f.depth) / 2, 0);
  k.box('hull', 0xe07030, 1, 1, 26, 0, 32.5, 8);
  k.box('hull', 0x3b424c, 2.2, 2.4, 3, 0, 31, -3.8);
  k.box('hull', 0x3b424c, 1.8, 1.6, 2, 0, 30.8, -1.6);
  k.beam('hull', 0x222222, [0, 32, 18], [0, 12, 18], 0.06, 4);
  k.box('hull', 0xd4ac0d, 2.6, 2.5, 6, 0, 10.8, 18);
  k.box('neon', 0xff3a3a, 0.4, 0.4, 0.4, 0, 33.3, 20.8);
}
