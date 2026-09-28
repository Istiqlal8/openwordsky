// Fishing village pieces: wooden piers on posts, beached boats and fish drying racks.
import * as THREE from 'three';

const PLANK = 0x9a7a55, POST = 0x5a4430;
export const BOAT_COLORS = [0x2f7fd0, 0xe04a3a, 0x3fb06a, 0xf2c14e, 0xffffff];

// Local z where the shore meets the water, marching from z0 toward -Z (null when no water within reach).
export function shoreZ(b, lx, z0 = 0, reach = 70) {
  const t = b.planet.terrain;
  for (let z = z0; z > z0 - reach; z -= 1.5) if (b.groundAt(lx, z) <= t.waterY + 0.05) return z;
  return null;
}

// Pier from the shore (local lx, zs) out to sea by len m. Returns { deck, end: world point } for fishers.
export function buildPier(b, lx, zs, len) {
  const t = b.planet.terrain, deck = t.waterY + 1.1, kit = b.kit;
  const a = b.world(lx, zs + 3), e = b.world(lx, zs - len);
  kit.at(0, 0, 0, 0);
  const plank = new THREE.BoxGeometry(2.2, 0.16, len + 3);
  plank.rotateY(b.frame.yaw).translate((a.x + e.x) / 2, deck, (a.z + e.z) / 2);
  kit.addWorld('hull', plank, PLANK);
  for (let z = zs + 2; z >= zs - len; z -= 3) {
    for (const s of [-1, 1]) {
      const p = b.world(lx + s * 1.05, z), floor = b.ground(p.x, p.z) - 1.5;
      kit.at(p.x, floor, p.z, 0);
      kit.cyl('hull', POST, 0.12, 0.14, deck - floor + 0.6, 5, 0, 0, 0);
    }
  }
  b.zone(lx, zs - len / 2, 2);
  return { deck, end: b.world(lx, zs - len + 1.5), side: b.world(lx + 2.8, zs - len * 0.6) };
}

// A small outrigger boat mesh, built at the kit frame (bow toward +Z).
export function boatParts(kit, hex) {
  const hull = new THREE.CylinderGeometry(0.75, 0.45, 5, 8, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(-Math.PI / 2);
  kit.add('hull', hull, hex, 0, 0.35, 0);
  kit.add('hull', new THREE.ConeGeometry(0.45, 1.2, 6).rotateX(Math.PI / 2), hex, 0, 0.1, 3.1);
  kit.box('hull', 0xf4f4f0, 1.3, 0.1, 0.9, 0, 0.3, -0.4);
  for (const s of [-1, 1]) kit.beam('hull', 0x8a6a45, [s * 0.2, 0.45, 0.6], [s * 1.8, 0.2, 0.6], 0.05, 4);
  kit.beam('hull', 0x8a6a45, [1.8, 0.1, -1.2], [1.8, 0.1, 2], 0.09, 5);
  kit.beam('hull', 0x8a6a45, [-1.8, 0.1, -1.2], [-1.8, 0.1, 2], 0.09, 5);
}

// Boat pulled up on the sand at a local point.
export function beachedBoat(b, lx, lz, face, hex) {
  b.onGround(lx, lz, face);
  boatParts(b.kit, hex);
  b.zone(lx, lz, 3.5);
}

// Bamboo rack with drying fish at a local point.
export function dryingRack(b, lx, lz, face) {
  b.onGround(lx, lz, face);
  const kit = b.kit;
  for (const x of [-1.6, 1.6]) kit.beam('hull', 0xc8a86a, [x, -0.3, 0], [x, 1.6, 0], 0.06, 4);
  kit.beam('hull', 0xc8a86a, [-1.7, 1.5, 0], [1.7, 1.5, 0], 0.05, 4);
  for (let i = 0; i < 6; i++) kit.box('hull', 0xb8b8c0, 0.18, 0.55, 0.05, -1.3 + i * 0.52, 1.18, 0);
  b.zone(lx, lz, 2.2);
}
