// Farm pieces: crop fields and rice paddies, hay bales, the windmill tower and wind turbine masts.
import * as THREE from 'three';

const CROPS = [
  { soil: 0x6a5238, plant: 0x5f9f3a, size: 0.34, tall: 0.5, name: 'sayur' },
  { soil: 0x5a4a34, plant: 0xc8b04a, size: 0.22, tall: 1.4, name: 'jagung' },
  { soil: 0x5f8f86, plant: 0x7fbf4a, size: 0.2, tall: 0.55, name: 'padi' }, // flooded rice paddy
];

// Field of w x d (local, centred at cx, cz, rows along Z). Returns work spots [{x, z}] (world).
export function buildField(b, rng, cx, cz, w, d) {
  const crop = rng.pick(CROPS), kit = b.kit;
  const geo = new THREE.PlaneGeometry(w, d, Math.ceil(w / 3), Math.ceil(d / 3)).rotateX(-Math.PI / 2).translate(cx, 0, cz);
  b.drape('ground', geo, crop.soil, 0.12);
  const rows = Math.floor(w / 1.4), per = Math.floor(d / 1.3);
  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < per; k++) {
      const lx = cx - w / 2 + (i + 0.5) * (w / rows), lz = cz - d / 2 + (k + 0.5) * (d / per);
      b.onGround(lx, lz);
      const s = crop.size * rng.range(0.8, 1.2);
      kit.add('hull', new THREE.ConeGeometry(s, crop.tall * rng.range(0.85, 1.15), 5), crop.plant, 0, 0.12 + crop.tall / 2, 0);
    }
  }
  b.fence([[cx - w / 2 - 1, cz - d / 2 - 1], [cx + w / 2 + 1, cz - d / 2 - 1], [cx + w / 2 + 1, cz + d / 2 + 1],
    [cx + 1.5, cz + d / 2 + 1]]);
  b.zone(cx, cz, Math.hypot(w, d) / 2 + 1);
  const spots = [];
  for (let i = 0; i < 4; i++) spots.push(b.world(cx + rng.range(-w / 2 + 1, w / 2 - 1), cz + rng.range(-d / 2 + 1, d / 2 - 1)));
  return spots;
}

// Round hay bales at a local point.
export function hayBales(b, lx, lz, rng) {
  for (let i = 0; i < 3; i++) {
    b.onGround(lx + i * 1.6, lz + rng.range(-0.6, 0.6));
    b.kit.add('hull', new THREE.CylinderGeometry(0.7, 0.7, 1.1, 10), 0xd9b85a, 0, 0.65, 0, [0, 0, Math.PI / 2]);
  }
}

// Classic windmill tower (the sails are a Mover). Returns the hub point (world) and facing yaw.
export function buildWindmill(b, lx, lz, face) {
  const p = b.place(lx, lz, face, 3.2, { x: 0, z: 3.4 }), kit = b.kit;
  kit.cyl('hull', 0x8d8375, 3.2, 3.2, 0.6 + p.depth, 8, 0, -p.depth - 0.3, 0);
  kit.cyl('hull', 0xf2ead8, 1.8, 3, 9, 8, 0, 0, 0);
  kit.add('hull', new THREE.ConeGeometry(2.3, 2.4, 8), 0x7a3a2a, 0, 10.2, 0);
  kit.box('hull', 0x6b4630, 1.1, 2, 0.1, 0, 1, 2.95);
  for (const y of [3.5, 6.5]) kit.box('glow', 0xffd08a, 0.7, 0.8, 0.08, 0, y, 2.9 - y * 0.12);
  const hub = b.offset(p, 0, 2.4);
  return { x: hub.x, y: p.floor + 9.2, z: hub.z, yaw: p.yaw, beacon: { x: p.x, y: p.floor + 12, z: p.z } };
}

// Tall white wind turbine mast (the rotor is a Mover). Returns the hub point and yaw.
export function buildTurbine(b, lx, lz, face) {
  const g = b.onGround(lx, lz, face), kit = b.kit, H = 22;
  kit.cyl('hull', 0xcfd3d6, 1.4, 1.6, 0.8, 8, 0, -0.4, 0);
  kit.cyl('hull', 0xf4f6f7, 0.35, 0.6, H, 8, 0, 0, 0);
  kit.box('hull', 0xf4f6f7, 0.9, 0.9, 2.4, 0, H + 0.3, -0.3);
  kit.box('lamp', 0xff4a3a, 0.25, 0.25, 0.25, 0, H + 0.9, -0.8);
  b.colliders.push({ x: g.x, z: g.z, r: 1 });
  b.zone(lx, lz, 3);
  const yaw = b.frame.yaw + face, c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: g.x + s * 1, y: g.y + H + 0.3, z: g.z + c * 1, yaw, beacon: { x: g.x, y: g.y + H + 1.2, z: g.z } };
}
