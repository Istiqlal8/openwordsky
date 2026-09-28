// Long-hull archetypes: the classic container freighter and the hammerhead.
import * as THREE from 'three';
import { buildBay } from './freighter-bay.js';
import { nozzle, tower, containers, portholes, greebles, runningLights, mast } from './freighter-details.js';

// Split [a, b] into n sections.
export function cuts(a, b, n) {
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

// Grid of engine nozzles on a stern face at z, centred on (0, y).
export function engineGrid(p, rng, z, y, maxW, maxH, x = 0) {
  const cols = rng.pick([2, 3, 4]), rows = rng.pick([1, 2, 2]);
  const r = Math.min(maxW / cols, maxH / rows) * 0.42, len = r * 2.6;
  for (let c = 0; c < cols; c++) for (let w = 0; w < rows; w++) {
    nozzle(p, x + (c - (cols - 1) / 2) * r * 2.3, y + (w - (rows - 1) / 2) * r * 2.3, z, r, len);
  }
  p.solidBox(x, y, z + len / 2, cols * r * 2.3, rows * r * 2.3, len);
}

// Pyramid nose pointing -Z with its base (w x h) at z.
export function nose(p, key, w, h, len, x, y, z) {
  const geo = new THREE.CylinderGeometry(3, w * 0.72, len, 4).rotateY(Math.PI / 4);
  p.add(key, geo, x, y, z - len / 2, [-Math.PI / 2, 0, 0], [1, 1, h / w]);
  p.solidBox(x, y, z - len * 0.35, w * 0.6, h * 0.6, len * 0.7);
}

// Hull sections along z (centred on x) with ribs, accent stripe, portholes and greebles.
export function sections(p, rng, W, H, zs, skip, x = 0) {
  for (let i = 0; i < zs.length - 1; i++) {
    const a = zs[i], b = zs[i + 1], zc = (a + b) / 2, w = W * rng.range(0.94, 1.04), h = H * rng.range(0.92, 1.04);
    p.block(i % 2 ? 'plate' : 'hull', w, h, b - a - 1.2, x, 0, zc);
    p.box('dark', w + 1.5, 3, 1.6, x, h * 0.2, b - 0.6);
    p.box('accent', w + 0.6, 1.4, (b - a) * 0.8, x, -h * 0.32, zc);
    portholes(p, rng, Math.round((b - a) / 5), [x, 2, zc], [w, h * 0.7, b - a - 4], ['+x', '-x', '-x'], skip);
    greebles(p, rng, Math.round((b - a) / 3), [x, 0, zc], [w, h, b - a - 2], ['+y', '+x', '-x'], skip);
  }
}

export const classic = {
  id: 'classic', title: 'Kapal Induk',
  build(p, rng) {
    const k = rng.range(0.8, 1.25), W = rng.range(40, 54), H = rng.range(30, 40);
    const bay = buildBay(p, { x: W / 2, y: 0, z: rng.range(-18, 18) * k, W, H });
    const { z0, z1 } = bay.spec, skip = { min: [W / 2 - 30, -H, z0 - 4], max: [W, H, z1 + 4] };
    sections(p, rng, W, H, cuts(-140 * k, z0, 3), skip);
    sections(p, rng, W, H, cuts(z1, 150 * k, 3), skip);
    nose(p, 'hull', W, H, 44 * k, 0, 0, -140 * k);
    p.block('dark', W * 0.7, 6, 290 * k, 0, -H / 2 - 2, 5 * k);
    const tip = tower(p, 0, H / 2, 118 * k, rng.range(0.85, 1.2));
    engineGrid(p, rng, 150 * k, 0, W * 0.9, H);
    containers(p, rng, [-12, 0, 12].map((x) => x * W / 46), H / 2, -130 * k, 90 * k);
    for (let z = -120 * k; z < z0 - 8; z += 16) for (const y of [-8, 2]) if (rng.chance(0.6)) p.instance('box', 'crate', -W / 2 - 4, y, z, 7, 6, 15, 0x8a8f99);
    for (const s of [-1, 1]) p.block('plate', 10, 12, 70 * k, s * (W / 2 + 5), -4, 108 * k);
    runningLights(p, W / 2 + 10, 0, 108 * k, -140 * k - 46 * k, 2);
    p.light(...tip, 0xffffff, 'strobe');
    for (const s of [-1, 1]) p.light(s * W / 2, H / 2 + 1, 145 * k, 0xffb040, 'pulse');
    return { bay, top: H / 2 + 75 };
  },
};

// Wide forward "hammer" with the hangar in its starboard tip, thin spine, engine block astern.
function hammer(p, rng, k) {
  const hw = rng.range(90, 125), D = rng.range(66, 80), Hh = rng.range(28, 36), hz = -150 * k + D / 2;
  const bay = buildBay(p, { x: hw, y: 0, z: hz, W: 42, H: Hh });
  const { z0, z1 } = bay.spec, inner = hw - 42;
  p.block('hull', hw + inner, Hh, D, (inner - hw) / 2, 0, hz);
  p.block('plate', 42, Hh, z0 - (hz - D / 2), hw - 21, 0, (hz - D / 2 + z0) / 2);
  p.block('plate', 42, Hh, hz + D / 2 - z1, hw - 21, 0, (z1 + hz + D / 2) / 2);
  p.block('accent', 30, Hh * 1.15, D * 0.8, -hw + 10, 0, hz);
  p.box('window', 2 * hw - 60, 2, 0.6, -30, 5, hz - D / 2 - 0.3);
  portholes(p, rng, 90, [-20, 0, hz], [2 * hw - 60, Hh * 0.8, D], ['-z', '+y', '-z'], null);
  greebles(p, rng, 70, [-20, 0, hz], [2 * hw - 60, Hh, D - 4], ['+y', '-y'], null);
  for (const x of [-hw + 18, inner - 12]) nozzle(p, x, 0, hz + D / 2, rng.range(6, 9), 14);
  return { bay, hw, hz, D, Hh };
}

export const hammerhead = {
  id: 'hammerhead', title: 'Martil',
  build(p, rng) {
    const k = rng.range(0.85, 1.2), h = hammer(p, rng, k), W = rng.range(26, 34), H = rng.range(24, 30);
    const zs = cuts(h.hz + h.D / 2, 112 * k, 4);
    sections(p, rng, W, H, zs, null);
    const EW = rng.range(56, 70), EH = rng.range(36, 46);
    p.block('hull', EW, EH, 40 * k, 0, 0, 132 * k);
    p.box('accent', EW + 1, 2, 30 * k, 0, EH * 0.3, 132 * k);
    engineGrid(p, rng, 152 * k, 0, EW * 0.9, EH);
    for (const s of [-1, 1]) containers(p, rng, [s * (W / 2 + 7)], -H / 2, zs[0] + 10, zs[4] - 10, 3);
    const tip = tower(p, 0, H / 2, 60 * k, rng.range(0.8, 1.1));
    const m = mast(p, -h.hw + 10, h.Hh * 0.58, h.hz, rng.range(20, 36));
    runningLights(p, h.hw, h.Hh / 2, h.hz - h.D / 2 + 2, h.hz - h.D / 2 - 4, 0);
    p.light(...tip, 0xffffff, 'strobe');
    p.light(...m, 0xff5040, 'pulse');
    return { bay: h.bay, top: Math.max(H / 2 + 70, h.Hh / 2 + 60) };
  },
};
