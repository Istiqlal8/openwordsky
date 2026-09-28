// Creature head: skull + muzzle, hinged jaw, eyes in sockets with lids, ears, nostrils; gear in head-gear.js.
import * as THREE from 'three';
import { mixHex } from '../../core/color.js';
import { loft, ellipsoid } from './anatomy/geo.js';
import { addHeadGear } from './anatomy/head-gear.js';

const NOSE = 0x241c1a;
const X = new THREE.Vector3(1, 0, 0);

// Muzzle/jaw loft along +X from x0 to x1, radius tapering r0 -> r1 (rounded tip).
function snout(x0, x1, y0, y1, r0, r1, flat = 0.85) {
  const path = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4, r = (r0 + (r1 - r0) * t) * (t === 1 ? 0.55 : 1);
    path.push({ p: [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0], rh: r * flat, rw: r });
  }
  path.push({ p: [x1 + r1 * 0.45, y1, 0], rh: r1 * 0.12, rw: r1 * 0.12 });
  return loft(path, 8);
}

// Eye positions + view directions (head frame, +X forward).
function eyeLayout(n, hs, forward) {
  if (n === 1) return [{ p: [hs * 0.72, hs * 0.2, 0], d: [1, 0.15, 0] }];
  if (n === 2) {
    const d = forward ? [0.8, 0.12, 0.5] : [0.5, 0.15, 0.85];
    return [-1, 1].map((s) => ({ p: [hs * 0.6, hs * 0.2, s * hs * 0.34], d: [d[0], d[1], s * d[2]] }));
  }
  return Array.from({ length: n }, (_, i) => {
    const a = (i / (n - 1) - 0.5) * 2.2, row = i % 2 ? 0.08 : 0;
    return { p: [hs * 0.35 + Math.cos(a) * hs * 0.5, hs * (0.24 + row), Math.sin(a) * hs * 0.44], d: [Math.cos(a), 0.2, Math.sin(a)] };
  });
}

// Eyeball with pupil/iris rings: sphere pole (+Y) turned to face dir.
function eyeball(r, iris, glow) {
  const geo = new THREE.SphereGeometry(r, 8, 6);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / r;
    c.set(y > 0.86 ? 0x050505 : y > 0.55 ? iris : glow ? iris : mixHex(iris, 0x1a120c, 0.6));
    c.toArray(col, i * 3);
  }
  return { geo, col };
}

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const rotTo = (d) => _e.setFromQuaternion(_q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _v.set(...d).normalize())).toArray().slice(0, 3);

function addEyes(p, bins, eyeY) {
  const g = p.g, h = p.head, hs = h.hs, n = g.eyes, stalk = g.eyeStalks ? hs * 0.9 : 0;
  const r = hs * (n === 1 ? 0.2 : n > 2 ? 0.1 : 0.13);
  for (const { p: at, d } of eyeLayout(n, hs, h.forward)) {
    const pos = [at[0], at[1] + stalk, at[2]];
    const { geo, col } = eyeball(r, g.glow ? g.secondary : h.iris, g.glow);
    bins.eyes.add(geo, { slot: 'eye', at: [pos[0], pos[1] - eyeY, pos[2]], rot: rotTo(d), colors: col });
    const lid = new THREE.SphereGeometry(r * 1.13, 8, 3, 0, Math.PI * 2, 0, Math.PI * 0.4);
    bins.head.add(lid, { at: pos, rot: rotTo([d[0] * 0.5, 1, d[2] * 0.5]) });
    if (n === 2 && !p.g.eyeStalks) bins.head.add(lid.clone().scale(1, 0.9, 1), { at: pos, rot: rotTo([d[0] * 0.4, -1, d[2] * 0.4]) });
    if (stalk) {
      const path = [[at[0] - hs * 0.2, at[1], at[2]], [at[0] - hs * 0.1, at[1] + stalk * 0.6, at[2]], pos];
      bins.head.add(loft(path.map((q, i) => ({ p: q, rh: r * (0.45 - i * 0.1), rw: r * (0.45 - i * 0.1) })), 6, X));
    }
  }
}

function addEars(p, bin) {
  const h = p.head, hs = h.hs, inner = mixHex(p.g.primary, 0xd89088, 0.55);
  for (const s of [-1, 1]) {
    if (h.ears === 'big') {
      bin.add(ellipsoid(hs * 0.07, hs * 0.62, hs * 0.45, 8, 5), { at: [hs * 0.05, hs * 0.3, s * hs * 0.55], rot: [s * 1.1, s * 0.5, 0.3] });
      bin.add(ellipsoid(hs * 0.04, hs * 0.5, hs * 0.34, 6, 4), { at: [hs * 0.1, hs * 0.3, s * hs * 0.52], rot: [s * 1.1, s * 0.5, 0.3], hard: true, tint: inner });
    } else if (h.ears === 'point') {
      const ear = new THREE.ConeGeometry(hs * 0.16, hs * 0.5, 7).scale(1, 1, 0.45);
      bin.add(ear, { at: [hs * 0.12, hs * 0.5, s * hs * 0.26], rot: [s * -0.45, s * 0.4, -0.25] });
    } else if (h.ears === 'round') {
      bin.add(ellipsoid(hs * 0.06, hs * 0.16, hs * 0.16, 8, 6), { at: [hs * 0.15, hs * 0.44, s * hs * 0.3], rot: [s * -0.5, 0, 0] });
    }
  }
}

// Skull, muzzle, nose; returns tip x of the muzzle.
function addSkull(p, bin) {
  const h = p.head, hs = h.hs, tip = hs * (0.7 + h.muzzle);
  bin.add(ellipsoid(hs * 0.55, hs * 0.46 * h.dome, hs * 0.45, 10, 7), { at: [hs * 0.3, hs * 0.08, 0] });
  bin.add(snout(hs * 0.4, tip, hs * 0.02, -hs * 0.08, hs * 0.36, hs * 0.2));
  if (p.skin === 'fur' || p.skin === 'hide') {
    bin.add(ellipsoid(hs * 0.08, hs * 0.1, hs * 0.13, 6, 4), { at: [tip + hs * 0.07, -hs * 0.07, 0], hard: true, tint: NOSE });
  }
  for (const s of [-1, 1]) {
    bin.add(ellipsoid(hs * 0.03, hs * 0.035, hs * 0.03, 4, 3), { at: [tip + hs * 0.1, -hs * 0.05, s * hs * 0.07], hard: true, tint: 0x080606 });
  }
  return tip;
}

function addJaw(p, head, newBin, mats, tip) {
  const hs = p.head.hs;
  const jaw = new THREE.Group();
  jaw.position.set(hs * 0.15, -hs * 0.18, 0);
  jaw.userData.tag = 'jaw';
  const bin = newBin().add(snout(0, tip - hs * 0.2, -hs * 0.02, -hs * 0.02, hs * 0.26, hs * 0.13, 0.55), { tint: 0xf0f0f0 });
  bin.add(ellipsoid(tip * 0.42, hs * 0.07, hs * 0.14, 6, 3), { at: [tip * 0.5, hs * 0.07, 0], hard: true, tint: 0x6a2a2a });
  bin.bake(jaw, mats);
  head.add(jaw);
  return jaw;
}

// One head group; local +X is forward, origin at the neck joint.
export function buildHead(p, newBin, mats) {
  const head = new THREE.Group();
  head.userData.tag = 'head';
  const hs = p.head.hs, eyeY = hs * 0.2 + (p.g.eyeStalks ? hs * 0.9 : 0);
  const bins = { head: newBin(), eyes: newBin() };
  const tip = addSkull(p, bins.head);
  addEyes(p, bins, eyeY);
  addEars(p, bins.head);
  addHeadGear(p, bins.head, tip);
  bins.head.bake(head, mats);
  const eyes = new THREE.Group();
  eyes.position.y = eyeY;
  eyes.userData.tag = 'eyes';
  bins.eyes.bake(eyes, mats);
  head.add(eyes);
  addJaw(p, head, newBin, mats, tip);
  return head;
}
