// The alien-grown whale carrier and the spined battle-cruiser.
import * as THREE from 'three';
import { buildBay } from './freighter-bay.js';
import { nozzle, turret, portholes, greebles, runningLights, tower, mast } from './freighter-details.js';
import { engineGrid, nose } from './freighter-hulls-long.js';

// Whale body: overlapping ellipsoids from bow to tail. Returns x-radius at z along y = 0.
function body(p, rng, L, Rb) {
  const n = 6, segs = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, r = Rb * Math.sin(Math.PI * (0.16 + 0.78 * t)) ** 0.8 * rng.range(0.97, 1.03);
    const z = -L / 2 + L * t, a = (L / n) * 1.15;
    p.add('hull', new THREE.SphereGeometry(1, 22, 14), 0, 0, z, null, [r, r * 0.84, a]);
    p.solid({ t: 'cyl', axis: 'z', c: [0, 0, z], r: r * 0.8, h: a * 0.8 });
    segs.push({ z, r, a });
  }
  return (z) => Math.max(0, ...segs.map((s) => {
    const u = (z - s.z) / s.a;
    return Math.abs(u) < 1 ? s.r * Math.sqrt(1 - u * u) : 0;
  }));
}

// Flattened ellipsoid (fins, flukes, lips) that is also roughly solid.
function lobe(p, key, x, y, z, sx, sy, sz, rot = null) {
  p.add(key, new THREE.SphereGeometry(1, 16, 10), x, y, z, rot, [sx, sy, sz]);
}

function glowSpots(p, rng, L, rAt) {
  for (let i = 0; i < 150; i++) {
    const z = rng.range(-0.42, 0.42) * L, a = rng.range(-0.9, 0.9) + (i % 2 ? 0 : Math.PI), r = rAt(z);
    const s = rng.range(1.2, 3);
    if (r > 4) p.instance('ball', 'bio', Math.cos(a) * r * 0.99, Math.sin(a) * r * 0.83, z, s, s, s);
  }
}

export const whale = {
  id: 'whale', title: 'Paus', organic: true,
  build(p, rng) {
    const L = rng.range(300, 430), Rb = rng.range(40, 56), rAt = body(p, rng, L, Rb);
    const bz = rng.range(0.02, 0.12) * L, rB = Math.max(rAt(bz - 30), rAt(bz), rAt(bz + 30));
    const bay = buildBay(p, { x: rB + 27, y: 0, z: bz, W: 38, H: 30 });
    for (const s of [-1, 1]) lobe(p, 'hull', rB + 8, s * 15, bz, 22, 5, 34);
    const fz = -0.25 * L, fr = rAt(fz);
    for (const s of [-1, 1]) lobe(p, 'plate', s * (fr + 26), -fr * 0.35, fz, 34, 3, 18, [0, s * 0.5, s * -0.35]);
    for (const s of [-1, 1]) lobe(p, 'plate', s * Rb * 0.9, 0, L / 2 + 10, Rb * 1.2, 3.5, 20, [0, s * -0.4, 0]);
    lobe(p, 'bio', 0, -Rb * 0.25, -L / 2 + 6, Rb * 0.45, Rb * 0.12, 6);
    for (let i = 0; i < 9; i++) {
      const z = -0.35 * L + i * 0.07 * L, h = rng.range(8, 20);
      p.cyl('plate', 0.6, 5, h, 0, rAt(z) * 0.82 + h / 2 - 2, z, 'y', 6);
    }
    for (let i = 0; i < 6; i++) {
      const x = rng.range(-0.5, 0.5) * Rb, z = rng.range(-0.3, 0.3) * L, y = -rAt(z) * 0.7, len = rng.range(30, 70);
      p.beam('plate', [x, y, z], [x * 1.3, y - len, z + len * 0.4], 1.4, 5);
      p.instance('ball', 'bio', x * 1.3, y - len, z + len * 0.4, 5, 5, 5);
    }
    glowSpots(p, rng, L, rAt);
    for (const s of [-1, 1]) nozzle(p, s * Rb * 0.35, 0, L / 2 - 14, Rb * 0.22, 10);
    runningLights(p, fr + 55, -fr * 0.5, fz, -L / 2 - 2, 0);
    p.light(0, Rb * 0.84 + 18, 0, 0xd8a0ff, 'pulse');
    return { bay, top: Rb + 60 };
  },
};

// Wedge hull split into stepped collision boxes.
function wedge(p, W, H, len, zb) {
  nose(p, 'hull', W, H, len, 0, 0, zb);
  for (let j = 0; j < 4; j++) {
    const f = (j + 0.5) / 4 * 0.95, z = zb - len + len * (j + 0.5) / 4;
    p.solidBox(0, 0, z, W * f, H * f, len / 4);
  }
  return (z) => Math.max(0, (z - (zb - len)) / len);
}

// Aft block with the hangar in its starboard face.
function aft(p, rng, W, H, zb, zs) {
  const bay = buildBay(p, { x: W / 2, y: 0, z: rng.range(zb + 32, zs - 32), W: 40, H });
  const { z0, z1 } = bay.spec;
  p.block('plate', W - 40, H, zs - zb, -20, 0, (zb + zs) / 2);
  if (z0 > zb) p.block('plate', 40, H, z0 - zb, W / 2 - 20, 0, (zb + z0) / 2);
  if (zs > z1) p.block('plate', 40, H, zs - z1, W / 2 - 20, 0, (z1 + zs) / 2);
  p.box('accent', W + 1, 2.5, zs - zb - 4, 0, H * 0.3, (zb + zs) / 2);
  portholes(p, rng, 50, [0, 0, (zb + zs) / 2], [W, H * 0.7, zs - zb - 4], ['-x', '-x', '+x'],
    { min: [W / 2 - 42, -H, z0 - 4], max: [W, H, z1 + 4] });
  return bay;
}

export const cruiser = {
  id: 'cruiser', title: 'Penjelajah',
  build(p, rng) {
    const W = rng.range(90, 124), H = rng.range(32, 42), len = rng.range(170, 230), zb = rng.range(-40, -10);
    const zs = zb + rng.range(95, 130), frac = wedge(p, W, H, len, zb), bay = aft(p, rng, W, H, zb, zs);
    const fins = 8 + rng.int(8);
    for (let i = 0; i < fins; i++) {
      const z = zb - len * 0.8 + (i / fins) * (len * 0.8 + (zs - zb) * 0.6), y = H / 2 * Math.min(1, frac(z));
      p.box('accent', 1.6, rng.range(10, 24), rng.range(8, 14), 0, y + 6, z, [0.35, 0, 0]);
    }
    p.box('dark', 3, 6, len * 0.8 + (zs - zb), 0, H / 2 * 0.7, (zb - len * 0.8 + zs) / 2);
    for (let i = 0; i < 6 + rng.int(6); i++) {
      const z = zb - len * rng.range(0.15, 0.75), f = frac(z), x = (i % 2 ? 1 : -1) * W * f * rng.range(0.15, 0.35);
      turret(p, x, (H / 2) * f * (i % 3 === 2 ? -1 : 1), z, rng.range(1.1, 1.7), i % 3 === 2);
    }
    greebles(p, rng, 150, [0, 0, zb - len * 0.35], [W * 0.5, H * 0.5, len * 0.6], ['+y', '-y']);
    const tip = tower(p, 0, H / 2, zs - 30, rng.range(1.1, 1.5));
    p.block('hull', W * 0.8, H * 0.9, 16, 0, 0, zs + 8);
    engineGrid(p, rng, zs + 16, 0, W * 0.75, H * 0.85);
    for (const s of [-1, 1]) nozzle(p, s * W * 0.46, -H * 0.2, zs + 4, 9, 18);
    const m = mast(p, -W * 0.3, H / 2, zs - 10, rng.range(16, 30));
    runningLights(p, W / 2, 0, zb - 2, zb - len - 2, 0);
    p.light(...tip, 0xffffff, 'strobe');
    p.light(...m, 0xff5040, 'pulse');
    return { bay, top: H / 2 + 90 };
  },
};
