// Body parts of the mech: pelvis, chest, head, arms and legs. Every builder returns a Group
// whose origin is the joint it hangs from, so mech-pose.js can drive plain rotations.
import * as THREE from 'three';
import { part } from '../view/ship/ship-materials.js';
import { block, wedge, blade, rod, pin } from './mech-geo.js';

// Chest, collar, vents, cockpit hatch and the glowing power core.
export function buildChest(m, mats) {
  const d = m.d, g = new THREE.Group(), ch = d.chestH, cw = d.chestW, cd = d.chestD;
  g.add(part(block(cw * 2, ch * 0.92, cd * 2, 1.34, 6), mats.hull, 0, ch * 0.48, 0));
  g.add(part(block(cw * 1.05, ch * 0.26, cd * 1.5, 0.7), mats.dark, 0, ch * 0.02, 0));
  g.add(part(block(cw * 2.5, ch * 0.16, cd * 1.7, 0.8, 6), mats.trim, 0, ch * 0.9, 0)); // collar
  for (const s of [-1, 1]) {
    const vent = part(block(cw * 0.5, ch * 0.34, cd * 0.4), mats.dark, s * cw * 0.72, ch * 0.5, -cd * 1.15);
    vent.rotation.x = 0.25;
    g.add(vent);
    g.add(part(block(cw * 0.78, ch * 0.42, cd * 0.5, 0.75), mats.trim, s * cw * 1.28, ch * 0.62, -cd * 0.5));
  }
  const hatch = part(block(cw * 0.95, ch * 0.34, cd * 0.4, 0.8, 6), mats.canopy, 0, ch * 0.68, -cd * 1.2);
  hatch.rotation.x = 0.2;
  g.add(hatch, part(new THREE.OctahedronGeometry(cw * 0.3, 0), mats.glow, 0, ch * 0.3, -cd * 1.15));
  if (m.stripe) g.add(part(block(cw * 0.22, ch * 0.8, cd * 0.12), mats.trim, 0, ch * 0.5, -cd * 1.28));
  return g;
}

// Pelvis block plus the armour skirt that hangs around the hips.
export function buildPelvis(m, mats) {
  const d = m.d, g = new THREE.Group(), ph = d.pelvisH, hw = d.hipW;
  g.add(part(block(d.waistW * 2, ph * 0.7, d.chestD * 1.2, 1.25), mats.dark, 0, ph * 0.3, 0));
  g.add(part(block(hw * 2, ph * 0.7, d.chestD * 1.6, 0.85, 6), mats.hull, 0, -ph * 0.15, 0));
  const n = m.skirt, span = Math.PI * 1.7;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + span * (i / (n - 1) - 0.5);
    const p = part(block(hw * 1.05, ph * 1.15, ph * 0.3, 0.85), mats.trim,
      Math.cos(a) * hw * 1.05, -ph * 0.45, Math.sin(a) * hw * 1.05);
    p.rotation.set(0, -a - Math.PI / 2, 0);
    p.rotation.z = Math.cos(a) * 0.18;
    g.add(p);
  }
  return g;
}

function crest(m, mats, r) {
  const g = new THREE.Group();
  if (m.crest === 'halo') {
    const ring = part(new THREE.TorusGeometry(r * 1.9, r * 0.12, 6, 28), mats.glow, 0, r * 0.4, r * 1.2);
    ring.rotation.x = 0.35;
    g.add(ring);
  } else if (m.crest === 'horn') {
    g.add(part(new THREE.ConeGeometry(r * 0.3, r * 1.5, 6), mats.trim, 0, r * 1.5, -r * 0.2));
  } else if (m.crest === 'sensor') {
    g.add(part(rod(r * 0.09, r * 2.2, 6), mats.dark, r * 0.5, r * 1.5, r * 0.3));
    g.add(part(new THREE.SphereGeometry(r * 0.16, 8, 6), mats.glow, r * 0.5, r * 2.6, r * 0.3));
    if (m.dish) {
      const dish = part(new THREE.CylinderGeometry(r * 0.55, r * 0.12, r * 0.2, 12, 1, true), mats.trim, -r * 0.7, r * 1.2, r * 0.3);
      dish.rotation.set(0.6, 0, 0.5);
      g.add(dish);
    }
  }
  if (m.crest !== 'horn') {
    for (const s of [-1, 1]) {
      const fin = part(blade(r * 1.5, r * 0.34, r * 0.1, r * 0.35, r * 0.08), mats.trim, s * r * 0.45, r * 0.75, -r * 0.5);
      fin.rotation.set(Math.PI / 2, 0, s * (Math.PI / 2 - 0.55));
      g.add(fin);
    }
  }
  g.add(part(new THREE.OctahedronGeometry(r * 0.2, 0), mats.glow, 0, r * 0.85, -r * 0.85));
  return g;
}

// Head: neck, faceted helmet, visor band with two glowing eyes, cheek vents and the crest.
export function buildHead(m, mats) {
  const d = m.d, r = d.headR, g = new THREE.Group();
  g.add(part(rod(r * 0.42, d.neckL * 2.2, 8), mats.dark, 0, d.neckL * 0.2, 0));
  const head = new THREE.Group();
  head.position.y = d.neckL + r;
  head.add(part(block(r * 1.7, r * 1.9, r * 1.8, 0.82, 6), mats.hull, 0, 0, 0));
  head.add(part(wedge(r * 1.2, r * 0.5, r * 0.7, r * 0.25), mats.trim, 0, -r * 0.75, -r * 0.5)); // chin
  const visor = part(block(r * 1.5 * m.visor, r * 0.46, r * 0.5), mats.canopy, 0, r * 0.18, -r * 0.82);
  head.add(visor);
  for (const s of [-1, 1]) {
    head.add(part(block(r * 0.34, r * 0.2, r * 0.16), mats.glow, s * r * 0.4, r * 0.2, -r * 1.02));
    head.add(part(block(r * 0.22, r * 0.9, r * 0.9, 0.8), mats.dark, s * r * 0.92, -r * 0.1, 0));
  }
  head.add(crest(m, mats, r));
  g.add(head);
  return g;
}

// One arm hanging from the shoulder: pauldron, upper arm, elbow, forearm and a blocky hand.
export function buildArm(m, mats, side) {
  const d = m.d, g = new THREE.Group(), pr = d.padR, ar = d.armR;
  const pad = part(block(pr * 2.0, pr * 1.45, pr * 2.1, 0.68, 6), mats.hull, side * pr * 0.45, pr * 0.42, 0);
  pad.rotation.z = -side * 0.12;
  g.add(pad, part(pin(pr * 0.55, pr * 0.9), mats.dark, 0, 0, 0));
  g.add(part(block(pr * 2.2, pr * 0.26, pr * 2.2, 0.7, 6), mats.trim, side * pr * 0.45, pr * 1.14, 0));
  if (m.spikes) {
    const spike = part(new THREE.ConeGeometry(pr * 0.22, pr * 1.5, 6), mats.trim, side * pr * 1.5, pr * 0.6, 0);
    spike.rotation.z = -side * Math.PI * 0.42;
    g.add(spike);
  }
  const upper = new THREE.Group();
  upper.position.y = -pr * 0.35;
  upper.add(part(block(ar * 1.7, d.upperL, ar * 1.7, 0.86), mats.hull, 0, -d.upperL * 0.5, 0));
  const fore = new THREE.Group();
  fore.position.y = -d.upperL;
  fore.add(part(pin(ar * 0.95, ar * 1.7), mats.dark, 0, 0, 0));
  fore.add(part(block(ar * 2.05, d.foreL, ar * 2.1, 0.86), mats.hull, 0, -d.foreL * 0.52, 0));
  fore.add(part(block(ar * 0.5, d.foreL * 0.8, ar * 1.5, 0.8), mats.trim, side * ar * 1.2, -d.foreL * 0.5, 0));
  const hand = new THREE.Group();
  hand.position.y = -d.foreL - ar * 0.2;
  hand.add(part(block(ar * 1.5, d.handL, ar * 1.7, 0.9), mats.dark, 0, -d.handL * 0.5, 0));
  for (let i = 0; i < 3; i++) {
    hand.add(part(block(ar * 0.34, d.handL * 0.7, ar * 0.42), mats.hull, (i - 1) * ar * 0.45, -d.handL * 1.2, -ar * 0.4));
  }
  hand.add(part(block(ar * 0.36, d.handL * 0.6, ar * 0.4), mats.hull, side * ar * 0.6, -d.handL * 0.8, ar * 0.25));
  fore.add(hand);
  upper.add(fore);
  g.add(upper);
  return { group: g, upper, fore, hand, pad };
}

// One leg from the hip: thigh, knee cap, armoured shin with a calf thruster, ankle and foot.
export function buildLeg(m, mats, side) {
  const d = m.d, g = new THREE.Group(), lr = d.armR * 1.15;
  g.add(part(pin(lr * 1.05, lr * 1.6), mats.dark, 0, 0, 0));
  g.add(part(block(lr * 2.0, d.thighL, lr * 2.4, 0.88), mats.hull, 0, -d.thighL * 0.52, 0));
  const shin = new THREE.Group();
  shin.position.y = -d.thighL;
  shin.add(part(pin(lr * 0.95, lr * 1.8), mats.dark, 0, 0, 0));
  shin.add(part(wedge(lr * 1.9, lr * 1.2, lr * 1.4, lr * 0.5), mats.trim, 0, -lr * 0.1, -lr * 1.2)); // knee cap
  shin.add(part(block(lr * 2.35, d.shinL * 0.95, lr * 2.8, 0.72), mats.hull, 0, -d.shinL * 0.5, 0));
  shin.add(part(block(lr * 1.5, d.shinL * 0.45, lr * 0.9, 0.85), mats.trim, 0, -d.shinL * 0.3, -lr * 1.7));
  if (m.legFin) {
    const fin = part(blade(lr * 1.6, d.shinL * 0.4, d.shinL * 0.18, d.shinL * 0.1, lr * 0.14), mats.trim,
      side * lr * 1.4, -d.shinL * 0.45, 0);
    fin.rotation.set(Math.PI / 2, 0, side > 0 ? 0 : Math.PI);
    shin.add(fin);
  }
  const foot = new THREE.Group();
  foot.position.y = -d.shinL;
  foot.add(part(pin(lr * 0.7, lr * 1.3), mats.dark, 0, 0, 0));
  foot.add(part(wedge(d.footW * 2, d.footH * 1.25, d.footL, d.footL * 0.2), mats.hull, 0, -d.footH * 0.4, -d.footL * 0.08));
  foot.add(part(block(d.footW * 1.5, d.footH * 0.8, d.footL * 0.4, 0.8), mats.trim, 0, -d.footH * 0.55, -d.footL * 0.42));
  foot.add(part(block(d.footW * 1.0, d.footH * 0.8, d.footL * 0.28, 0.8), mats.dark, 0, -d.footH * 0.45, d.footL * 0.44));
  shin.add(foot);
  g.add(shin);
  return { group: g, shin, foot, kneeY: -d.thighL, ankleY: -d.shinL };
}
