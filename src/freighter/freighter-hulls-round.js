// Vertical citadel (stacked tiers standing on downward engines) and the saucer carrier.
import * as THREE from 'three';
import { buildBay } from './freighter-bay.js';
import { nozzle, turret, portholes, greebles, mast, dish } from './freighter-details.js';

const OCT = Math.cos(Math.PI / 8);

// One tier of the citadel: a box or an octagonal prism, with windows and plating.
function tier(p, rng, t, oct, skip) {
  const key = t.i % 2 ? 'plate' : 'hull';
  if (oct) {
    p.add(key, new THREE.CylinderGeometry(t.w / 2 / OCT, t.w / 2 / OCT, t.h, 8), 0, t.y, 0, [0, Math.PI / 8, 0]);
    p.solid({ t: 'cyl', axis: 'y', c: [0, t.y, 0], r: t.w / 2, h: t.h / 2 });
  } else p.block(key, t.w, t.h, t.d, 0, t.y, 0);
  p.box('accent', t.w + 1, 2, (oct ? t.w : t.d) + 1, 0, t.y + t.h / 2 - 2, 0);
  const size = [t.w, t.h - 6, oct ? t.w * 0.8 : t.d];
  portholes(p, rng, Math.round(t.h * 1.4), [0, t.y, 0], size, ['+x', '-x', '+z', '-z'], skip);
  greebles(p, rng, 30, [0, t.y, 0], [t.w, t.h, oct ? t.w * 0.8 : t.d], ['+y', '-x', '+z', '-z'], skip);
}

// Tier holding the hangar: bay block in the middle, fillers fore and aft.
function bayTier(p, rng, t) {
  const bay = buildBay(p, { x: t.w / 2, y: t.y, z: 0, W: t.w, H: t.h });
  const f = (t.d - bay.spec.len) / 2;
  for (const s of [-1, 1]) p.block('hull', t.w, t.h, f, 0, t.y, s * (bay.spec.len + f) / 2);
  portholes(p, rng, 40, [0, t.y, 0], [t.w, t.h - 6, t.d], ['-x', '+z', '-z']);
  return bay;
}

function engines(p, rng, y0, R) {
  p.cyl('dark', R * 0.9, R, 26, 0, y0 - 13, 0, 'y', 8);
  p.solid({ t: 'cyl', axis: 'y', c: [0, y0 - 13, 0], r: R, h: 13 });
  const n = rng.pick([4, 5, 6]);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    nozzle(p, Math.cos(a) * R * 0.6, y0 - 26, Math.sin(a) * R * 0.6, R * 0.26, 16, '-y');
  }
  nozzle(p, 0, y0 - 26, 0, R * 0.3, 20, '-y');
}

export const citadel = {
  id: 'citadel', title: 'Benteng',
  build(p, rng) {
    const n = 4 + rng.int(3), oct = rng.chance(0.5), tiers = [];
    let w = rng.range(84, 110), y = 0;
    for (let i = 0; i < n; i++) {
      const h = i === 1 ? rng.range(32, 40) : rng.range(36, 64);
      tiers.push({ i, w, h, d: Math.max(w, 70), y: y + h / 2 });
      y += h;
      w *= rng.range(0.78, 0.92);
    }
    const off = y / 2 + 20;
    for (const t of tiers) t.y -= off;
    const bay = bayTier(p, rng, tiers[1]), skip = null;
    tiers.forEach((t) => { if (t.i !== 1) tier(p, rng, t, oct, skip); });
    engines(p, rng, -off, tiers[0].w * 0.45);
    const top = tiers[n - 1], yTop = top.y + top.h / 2, spire = rng.range(40, 90);
    p.cyl('hull', 2, top.w * 0.3, spire, 0, yTop + spire / 2, 0, 'y', 6);
    const tip = mast(p, 0, yTop + spire, 0, rng.range(20, 40));
    for (const s of [-1, 1]) p.block('accent', 6, tiers[0].h + tiers[1].h, 18, s * 20, tiers[1].y - tiers[1].h / 2, s * (tiers[0].d / 2 + 6));
    dish(p, -top.w / 2 - 4, yTop - 4, 0, 10, [0, 0, 1.2]);
    for (let i = 2; i < n; i++) turret(p, -tiers[i - 1].w / 2 + 10, tiers[i].y - tiers[i].h / 2, 0, 1.2);
    const wide = tiers[0];
    p.light(0, wide.y, -wide.d / 2 - 1, 0xff3a2a, 'port');
    p.light(0, wide.y, wide.d / 2 + 1, 0x3aff6a, 'star');
    p.light(...tip, 0xffffff, 'strobe');
    for (const t of tiers) p.light(-t.w / 2, t.y + t.h / 2, 0, 0xffb040, 'pulse');
    return { bay, top: yTop + spire + 50 };
  },
};

// Saucer: lathed disc, bridge dome, rim lights, hangar pod on the +X rim, engines astern.
function disc(p, rng, R, T) {
  const prof = [[0, -T * 0.5], [R * 0.3, -T * 0.5], [R * 0.85, -T * 0.3], [R, 0], [R * 0.85, T * 0.25], [R * 0.35, T * 0.55], [0, T * 0.6]];
  p.add('hull', new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 48));
  p.add('accent', new THREE.TorusGeometry(R * 0.93, 1.6, 6, 64), 0, T * 0.06, 0, [Math.PI / 2, 0, 0]);
  p.solid({ t: 'cyl', axis: 'y', c: [0, 0, 0], r: R, h: T * 0.2 });
  p.solid({ t: 'cyl', axis: 'y', c: [0, 0, 0], r: R * 0.75, h: T * 0.5 });
  for (let i = 0; i < 160; i++) {
    const a = rng.range(0, Math.PI * 2), rr = i % 2 ? R * 0.9 : R * rng.range(0.4, 0.8);
    const y = i % 2 ? T * 0.12 : T * (0.55 - 0.6 * (rr / R - 0.35));
    p.instance('box', 'window', Math.cos(a) * rr, y, Math.sin(a) * rr, 1.8, 0.6, 1.8);
  }
}

export const saucer = {
  id: 'saucer', title: 'Cakram',
  build(p, rng) {
    const R = rng.range(128, 172), T = rng.range(20, 30), D = R * rng.range(0.2, 0.28);
    disc(p, rng, R, T);
    p.add('plate', new THREE.SphereGeometry(D, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0, T * 0.55, 0, null, [1, 0.55, 1]);
    p.add('window', new THREE.SphereGeometry(D * 0.35, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, T * 0.55 + D * 0.5, 0, null, [1, 0.6, 1]);
    p.solid({ t: 'cyl', axis: 'y', c: [0, T * 0.55, 0], r: D, h: D * 0.55 });
    const bay = buildBay(p, { x: R + 30, y: 0, z: 0, W: 40, H: 30 });
    const n = rng.pick([3, 4, 5]), ew = n * 16 + 10;
    p.block('dark', ew, 22, 30, 0, 0, R - 2);
    for (let i = 0; i < n; i++) nozzle(p, (i - (n - 1) / 2) * 16, 0, R + 13, 7, 10);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.65 + 0.35 * i), rr = R * 0.6;
      turret(p, Math.cos(a) * rr, T * 0.4, Math.sin(a) * rr, 1.3);
    }
    const tip = mast(p, 0, T * 0.55 + D * 0.62, 0, rng.range(24, 40));
    dish(p, -R * 0.45, T * 0.45, R * 0.3, 12);
    p.light(-R - 1, 0, -R * 0.2, 0xff3a2a, 'port');
    p.light(R * 0.96, 2, -R * 0.3, 0x3aff6a, 'star');
    p.light(0, 2, -R - 1, 0xffffff, 'strobe');
    p.light(...tip, 0xffffff, 'strobe');
    for (let i = 0; i < 6; i++) p.light(Math.cos(i * 1.047 + 0.5) * R * 0.98, -2, Math.sin(i * 1.047 + 0.5) * R * 0.98, 0xffb040, 'pulse');
    return { bay, top: T + D + 55 };
  },
};
