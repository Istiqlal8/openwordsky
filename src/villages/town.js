// Town and village-square pieces: fountain, clock tower, benches, market stalls, the big shade tree.
import * as THREE from 'three';

const STONE = 0xcfc8b8, DARK = 0x3b424c, WOOD = 0x8a6a45;

// Plaza fountain at a local point (solid).
export function buildFountain(b, lx, lz) {
  const p = b.onGround(lx, lz), kit = b.kit;
  kit.cyl('hull', STONE, 3, 3.2, 1.1, 16, 0, -0.4, 0);
  kit.cyl('glass', 0x6fb8e8, 2.7, 2.7, 0.08, 16, 0, 0.6, 0);
  kit.cyl('hull', STONE, 0.45, 0.6, 1.8, 8, 0, 0.6, 0);
  kit.cyl('hull', STONE, 1.2, 0.9, 0.3, 12, 0, 2.3, 0);
  kit.add('hull', new THREE.IcosahedronGeometry(0.4, 1), 0xbfe4ff, 0, 2.9, 0);
  b.colliders.push({ x: p.x, z: p.z, r: 3.1 });
  b.zone(lx, lz, 4);
}

// Clock tower (solid); returns the beacon point on top (world).
export function buildClockTower(b, lx, lz, face) {
  const p = b.place(lx, lz, face, 2.4, { x: 0, z: 2.6 }), kit = b.kit, H = 14;
  kit.cyl('hull', 0x8d8375, 2.4, 2.4, 0.4 + p.depth, 4, 0, -p.depth - 0.2, 0);
  kit.box('hull', 0xe6d8bc, 3.2, H, 3.2, 0, H / 2, 0);
  kit.box('hull', 0x8a3b2a, 3.6, 0.4, 3.6, 0, H, 0);
  kit.add('hull', new THREE.ConeGeometry(2.6, 3.4, 4), 0x8a3b2a, 0, H + 1.9, 0, [0, Math.PI / 4, 0]);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    kit.add('lamp', new THREE.CircleGeometry(0.9, 16), 0xfff4d0, Math.sin(a) * 1.62, H - 2, Math.cos(a) * 1.62, [0, a, 0]);
    kit.add('hull', new THREE.BoxGeometry(0.08, 0.7, 0.05), DARK, Math.sin(a) * 1.66, H - 1.75, Math.cos(a) * 1.66, [0, a, 0]);
  }
  kit.box('hull', 0x6b4630, 1.2, 2.2, 0.1, 0, 1.1, 1.63);
  return { x: p.x, y: p.floor + H + 4, z: p.z };
}

// Bench at a local point facing `face` (relative yaw). Returns a seat { x, y, z, yaw } (world).
export function buildBench(b, lx, lz, face) {
  const p = b.onGround(lx, lz, face), kit = b.kit;
  kit.box('hull', WOOD, 1.8, 0.1, 0.5, 0, 0.45, 0);
  kit.box('hull', WOOD, 1.8, 0.45, 0.08, 0, 0.75, 0.24);
  for (const x of [-0.75, 0.75]) kit.box('hull', DARK, 0.08, 0.45, 0.45, x, 0.22, 0);
  // Sitters face away from the backrest (-Z of the bench = its front).
  return { x: p.x, y: p.y, z: p.z, yaw: b.frame.yaw + face };
}

// Market stall with a coloured canopy and goods (solid). Returns the vendor spot (world).
export function buildStall(b, rng, lx, lz, face) {
  const p = b.onGround(lx, lz, face), kit = b.kit, hue = rng.pick([0xe0463a, 0x3f8fd0, 0x3fb06a, 0xf0a030, 0xb05ad0]);
  for (const [x, z] of [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]]) kit.box('hull', WOOD, 0.1, 2.4, 0.1, x, 1.2, z);
  kit.add('hull', new THREE.ConeGeometry(2.4, 0.8, 4), hue, 0, 2.8, 0, [0, Math.PI / 4, 0], [1.2, 1, 0.85]);
  kit.box('hull', WOOD, 3, 0.9, 1.1, 0, 0.45, 0.4);
  const goods = [0xf2c14e, 0xe04a3a, 0x7fbf4a, 0xff9a3a, 0xa05a2a];
  for (let i = 0; i < 6; i++) kit.add('hull', new THREE.IcosahedronGeometry(0.2, 0), goods[i % 5], -1.1 + i * 0.44, 1.02, 0.4);
  b.colliders.push({ x: p.x, z: p.z, r: 1.7 });
  b.zone(lx, lz, 3);
  return b.world(lx - Math.sin(face) * 1.4, lz - Math.cos(face) * 1.4);
}

// Big shade tree (beringin) with a round bench ring; returns seats around it.
export function shadeTree(b, lx, lz, rng) {
  const p = b.onGround(lx, lz), kit = b.kit;
  kit.cyl('hull', 0x5a4030, 0.6, 1, 4.5, 7, 0, -0.5, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2, r = rng.range(1.6, 2.6);
    kit.add('hull', new THREE.IcosahedronGeometry(rng.range(1.9, 2.6), 0), 0x2f6a2a, Math.cos(a) * r, 5 + rng.range(0, 1.2), Math.sin(a) * r);
  }
  kit.add('hull', new THREE.IcosahedronGeometry(2.8, 0), 0x3f7f2e, 0, 6.6, 0);
  kit.cyl('hull', WOOD, 2.1, 2.1, 0.45, 12, 0, 0, 0);
  b.colliders.push({ x: p.x, z: p.z, r: 2.1 });
  b.zone(lx, lz, 6);
  const seats = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4, w = b.world(lx + Math.sin(a) * 2.25, lz + Math.cos(a) * 2.25);
    seats.push({ x: w.x, y: p.y + 0.02, z: w.z, yaw: b.frame.yaw + a + Math.PI });
  }
  return seats;
}
