// Jointed legs: hip -> knee -> ankle pivots with thigh, shin and foot meshes. Rest pose solved by IK.
import * as THREE from 'three';
import { limb, ellipsoid } from './geo.js';
import { reach } from './ik.js';

const HOOF = 0x2b2622, CLAW = 0x1c1816;
const _m = new THREE.Matrix4();

// Adds a foot part expressed in a level frame at the ankle segment's end.
function footPart(bin, geo, o, d) {
  const post = _m.makeRotationZ(-d.gamma).setPosition(0, -d.l3, 0).clone();
  bin.add(geo, { ...o, post, uAxis: 1 });
}

function toes(bin, d, n, len, r, spread) {
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1) - 0.5) * spread;
    footPart(bin, limb(len, r, r * 0.45, 5), { at: [0, -r * 0.3, 0], rot: [0, a, Math.PI / 2] }, d);
    footPart(bin, new THREE.ConeGeometry(r * 0.5, r * 1.6, 5), { at: [Math.cos(a) * (len + r), -r * 0.5, -Math.sin(a) * (len + r)],
      rot: [0, a, -Math.PI / 2 - 0.3], hard: true, tint: CLAW }, d);
  }
}

function addFoot(bin, d) {
  const r = d.r * 0.36;
  if (d.foot === 'hoof') footPart(bin, limb(r * 1.4, r * 1.05, r * 1.3, 6), { hard: true, tint: HOOF }, d);
  else if (d.foot === 'pad') {
    footPart(bin, ellipsoid(r * 1.35, r * 0.7, r * 1.35, 7, 5), { at: [0, -r * 0.2, 0], tint: 0xb8b0a8 }, d);
    for (const z of [-0.7, 0, 0.7]) footPart(bin, ellipsoid(r * 0.3, r * 0.25, r * 0.3, 4, 3), { at: [r * 1.2, -r * 0.35, z * r], hard: true, tint: 0xd8cfc0 }, d);
  } else if (d.foot === 'paw') {
    footPart(bin, ellipsoid(r * 1.7, r * 0.75, r * 1.25, 7, 5), { at: [r * 0.7, -r * 0.3, 0], tint: 0xc8c8c8 }, d);
    for (const z of [-0.6, 0, 0.6]) footPart(bin, new THREE.ConeGeometry(r * 0.2, r * 0.6, 3), { at: [r * 2.35, -r * 0.55, z * r], rot: [0, 0, -Math.PI / 2], hard: true, tint: CLAW }, d);
  } else if (d.foot === 'talon') toes(bin, d, 3, r * 2.2, r * 0.5, 1.1);
  else if (d.foot === 'long') footPart(bin, ellipsoid(r * 2.6, r * 0.6, r * 1.1, 7, 5), { at: [r * 1.8, -r * 0.2, 0], tint: 0xc8c8c8 }, d);
  else footPart(bin, new THREE.ConeGeometry(r * 0.8, r * 3, 4), { at: [0, -r * 1.2, 0], rot: [Math.PI, 0, 0], hard: true, tint: CLAW }, d);
}

function pivot(tag, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.userData.tag = tag;
  return g;
}

// Bone lengths so the leg stands slightly bent at height H.
function boneLengths(s) {
  if (s.insect) {
    const span = Math.hypot(s.reach - s.l3 * Math.sin(s.gamma), s.H);
    return [span * 0.55 * s.slack, span * 0.62 * s.slack];
  }
  const drop = s.H - s.l3 * Math.cos(s.gamma), total = drop * s.slack;
  return [total * 0.5, total * 0.5];
}

function legMeshes(s, d, newBin, mats, piv) {
  const stock = s.front ? 0xd0d0d0 : 0xdcdcdc, flat = s.insect ? 1 : 0.78;
  newBin().add(limb(d.L1, s.r, s.r * 0.62, s.insect ? 5 : 7, flat, s.insect ? 0 : 0.18), { uAxis: 1 }).bake(piv.hip, mats);
  newBin().add(limb(d.L2, s.r * 0.56, s.r * 0.4, s.insect ? 5 : 6, flat), { uAxis: 1, tint: stock }).bake(piv.knee, mats);
  const low = newBin().add(limb(d.l3, s.r * 0.4, s.r * 0.34, s.insect ? 4 : 6, flat), { uAxis: 1, tint: 0xbcbcbc });
  addFoot(low, d);
  low.bake(piv.ankle, mats);
}

// Builds every leg of the plan under body; returns rigs [{ hip, knee, ankle, coxa, d }].
export function buildLegs(body, p, newBin, mats) {
  return p.legs.map((s, i) => {
    const [L1, L2] = boneLengths(s);
    const d = { tag: 'leg', i, x: s.x, y: s.y, z: s.z, side: s.side, front: s.front, pair: s.pair ?? (s.front ? 0 : 1),
      L1, L2, l3: s.l3, gamma: s.gamma, bend: s.bend, r: s.r, foot: s.foot, insect: s.insect ?? 0, fan: s.fan ?? 0,
      reach: s.reach ?? 0, H: s.H };
    const coxa = s.insect ? pivot('coxa', s.x, s.y, s.z) : null;
    const hip = s.insect ? pivot('leg', 0, 0, 0) : pivot('leg', s.x, s.y, s.z);
    const [rx, rz] = restFoot(d);
    hip.userData = { ...d, rx, rz, phase: i * 1.3 + (s.side > 0 ? 0 : Math.PI) };
    const knee = pivot('knee', 0, -L1, 0), ankle = pivot('ankle', 0, -L2, 0);
    hip.add(knee);
    knee.add(ankle);
    legMeshes(s, d, newBin, mats, { hip, knee, ankle });
    if (coxa) { coxa.add(hip); body.add(coxa); } else body.add(hip);
    const rig = { hip, knee, ankle, coxa, d: hip.userData };
    reach(rig, rx, -p.bodyY, rz, d.gamma);
    return rig;
  });
}

// Neutral foot position in the body frame (x, z).
export function restFoot(d) {
  if (!d.insect) return [d.x, d.z];
  return [d.x + Math.sin(d.fan) * d.reach, d.z + Math.cos(d.fan) * d.reach * d.side];
}
