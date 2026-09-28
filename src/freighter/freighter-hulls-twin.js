// Twin-hull catamaran joined by bridges, and the ring ship with a rotating habitat ring.
import * as THREE from 'three';
import { Parts } from './freighter-parts.js';
import { buildBay } from './freighter-bay.js';
import { nozzle, tower, containers, portholes, greebles, runningLights, mast, dish } from './freighter-details.js';
import { cuts, engineGrid, nose, sections } from './freighter-hulls-long.js';

// One catamaran hull centred on x; the starboard one carries the hangar.
function twinHull(p, rng, x, W, H, k, bayZ) {
  const zs = [-150 * k, 140 * k];
  let bay = null;
  if (bayZ !== null) {
    bay = buildBay(p, { x: x + W / 2, y: 0, z: bayZ, W, H });
    const skip = { min: [x, -H, bay.spec.z0 - 4], max: [x + W, H, bay.spec.z1 + 4] };
    sections(p, rng, W, H, cuts(zs[0], bay.spec.z0, 3), skip, x);
    sections(p, rng, W, H, cuts(bay.spec.z1, zs[1], 3), skip, x);
  } else sections(p, rng, W, H, cuts(zs[0], zs[1], 6), null, x);
  nose(p, 'hull', W, H, 38 * k, x, 0, zs[0]);
  engineGrid(p, rng, zs[1], 0, W * 0.9, H, x);
  return bay;
}

export const catamaran = {
  id: 'catamaran', title: 'Kembar',
  build(p, rng) {
    const k = rng.range(0.85, 1.2), W = rng.range(26, 34), H = rng.range(28, 36), sep = rng.range(42, 60);
    const bay = twinHull(p, rng, sep, W, H, k, rng.range(-50, 20) * k);
    twinHull(p, rng, -sep, W, H, k, null);
    const span = 2 * sep - W + 2, nb = rng.pick([2, 3, 3, 4]);
    for (const z of cuts(-100 * k, 110 * k, nb - 1)) {
      p.block('plate', span, 10, rng.range(16, 26), 0, H * 0.18, z);
      p.box('window', span - 6, 1.4, 0.6, 0, H * 0.18, z - 13.5);
    }
    const podZ = -100 * k;
    p.cyl('hull', 14, 18, 16, 0, H * 0.18 + 12, podZ, 'y', 8);
    p.add('window', new THREE.SphereGeometry(13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, H * 0.18 + 20, podZ, null, [1, 0.5, 1]);
    p.solidBox(0, H * 0.18 + 14, podZ, 36, 22, 36);
    const tip = tower(p, 0, H * 0.18 + 5, 110 * k, rng.range(0.8, 1.1));
    containers(p, rng, [-sep - 8, -sep + 8].map((x) => x * 1), H / 2, -120 * k, 100 * k, 2);
    for (let z = -60 * k; z < 60 * k; z += 20) p.instance('box', 'crate', 0, -H * 0.3, z, span - 10, 5, 12, rng.pick([0x8a8f99, 0xb8452e, 0x2f6fa8]));
    runningLights(p, sep + W / 2, H / 2, -120 * k, -150 * k - 42 * k, 0);
    p.light(...tip, 0xffffff, 'strobe');
    p.light(-sep, H / 2 + 2, -150 * k, 0xffffff, 'strobe');
    return { bay, top: H / 2 + 70 };
  },
};

// Habitat ring (its own group so it can rotate about Z) with spokes and lit windows.
function habitat(mats, rng, R, r, Rs) {
  const q = new Parts(), spokes = rng.pick([3, 4, 6]);
  q.add('hull', new THREE.TorusGeometry(R, r, 10, 72));
  q.add('accent', new THREE.TorusGeometry(R + r * 0.7, r * 0.35, 6, 72));
  q.cyl('plate', Rs + 7, Rs + 7, r * 2.2, 0, 0, 0, 'z', 16);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    q.beam('plate', [c * (Rs + 6), s * (Rs + 6), 0], [c * (R - r * 0.8), s * (R - r * 0.8), 0], r * 0.32);
  }
  for (let i = 0; i < 140; i++) {
    const a = rng.range(0, Math.PI * 2), side = i % 3, rr = side ? R : R + r * 0.98;
    const z = side ? (side === 1 ? 1 : -1) * r * 0.95 : rng.range(-0.5, 0.5) * r;
    q.instance('box', 'window', Math.cos(a) * (rr + (side ? rng.range(-0.6, 0.6) * r : 0)), Math.sin(a) * rr, z, 1.6, 1.6, 1.6);
  }
  return q.build(mats);
}

export const ringShip = {
  id: 'ring', title: 'Cincin',
  build(p, rng, mats) {
    const k = rng.range(0.85, 1.25), Rs = rng.range(14, 19), R = rng.range(88, 118), r = rng.range(7, 11);
    const zf = -150 * k, za = 140 * k, rz = rng.range(15, 55) * k;
    p.cyl('hull', Rs, Rs, za - zf, 0, 0, (zf + za) / 2, 'z', 12);
    p.solid({ t: 'cyl', axis: 'z', c: [0, 0, (zf + za) / 2], r: Rs, h: (za - zf) / 2 });
    p.add('plate', new THREE.SphereGeometry(Rs * 1.25, 12, 8), 0, 0, zf, null, [1, 1, 1.8]);
    p.solid({ t: 'cyl', axis: 'z', c: [0, 0, zf], r: Rs * 1.25, h: Rs * 1.8 });
    for (let z = zf + 25; z < za - 20; z += 22) p.cyl('accent', Rs + 1.2, Rs + 1.2, 2.5, 0, 0, z, 'z', 12);
    const bay = buildBay(p, { x: Rs + 28, y: 0, z: rng.range(-110, -75) * k, W: 36, H: 30 });
    greebles(p, rng, 120, [0, 0, 0], [Rs * 1.9, Rs * 1.9, za - zf - 20], ['+y', '-y', '-x']);
    portholes(p, rng, 70, [0, 0, (zf + za) / 2], [Rs * 1.9, Rs * 1.9, za - zf - 20], ['+y', '-x', '-y']);
    tanks(p, rng, Rs, 75 * k);
    p.cyl('plate', Rs * 1.8, Rs * 1.1, 26, 0, 0, za - 10, 'z', 12);
    p.solid({ t: 'cyl', axis: 'z', c: [0, 0, za - 10], r: Rs * 1.8, h: 13 });
    nozzle(p, 0, 0, za + 3, Rs * 1.3, 14);
    for (let i = 0; i < 4; i++) nozzle(p, Math.cos(i * 1.571 + 0.785) * Rs * 1.8, Math.sin(i * 1.571 + 0.785) * Rs * 1.8, za - 4, 5, 12);
    const ring = habitat(mats, rng, R, r, Rs);
    ring.position.z = rz;
    p.solid({ t: 'torus', c: [0, 0, rz], R, r });
    const tip = mast(p, 0, Rs, zf + 30, rng.range(24, 40));
    dish(p, 0, -Rs - 6, 20 * k, 9, [Math.PI - 0.5, 0, 0]);
    runningLights(p, Rs + 1, 0, zf + 20, zf - Rs * 2.3, 0);
    p.light(...tip, 0xffffff, 'strobe');
    return { bay, top: R + 40, spinners: [{ obj: ring, axis: 'z', speed: rng.pick([-1, 1]) * rng.range(0.05, 0.12) }] };
  },
};

// Paired fuel tanks along the aft spine.
function tanks(p, rng, Rs, z0) {
  const r = Rs * 0.75;
  for (let i = 0; i < 2; i++) for (const s of [-1, 1]) {
    const z = z0 - i * r * 2.4;
    p.add('plate', new THREE.SphereGeometry(r, 12, 8), 0, s * (Rs + r * 0.7), z, null, [1, 1, 1.1]);
    p.solidBox(0, s * (Rs + r * 0.7), z, r * 1.8, r * 1.8, r * 2);
  }
}
