// Mech hardware carried over from the ship: backpack thrusters, wing binders and the beam rifle.
// Thruster flames reuse the ship's flame material so setFlames() drives them.
import * as THREE from 'three';
import { part } from '../view/ship/ship-materials.js';
import { block, blade, rod } from './mech-geo.js';

// One nozzle whose local +Z is the exhaust direction (same layout as the ship's engines).
export function nozzle(r, len, mats) {
  const g = new THREE.Group();
  g.add(part(rod(r, len, 10).rotateX(Math.PI / 2), mats.hull, 0, 0, -len * 0.5));
  g.add(part(new THREE.CylinderGeometry(r * 1.12, r * 0.9, r * 0.6, 12, 1, true).rotateX(Math.PI / 2), mats.dark, 0, 0, r * 0.2));
  g.add(part(new THREE.CircleGeometry(r * 0.8, 14), mats.glow, 0, 0, r * 0.1));
  const flameGeo = new THREE.ConeGeometry(r * 0.72, 1, 12, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  const flame = part(flameGeo, mats.flame, 0, 0, r * 0.15);
  const sprite = new THREE.Sprite(mats.sprite);
  sprite.position.z = r * 0.4;
  flame.userData = { sprite, r: r * 0.5 }; // glow sprites stay smaller than the ship's
  g.add(flame, sprite);
  return { group: g, flame };
}

function binderWing(m, mats, side) {
  const b = m.binder, g = new THREE.Group();
  const geo = blade(b.span, b.chord, b.chord * 0.45, b.chord * (b.shape === 'forward' ? -0.4 : 0.35), b.chord * 0.14);
  g.add(part(geo, mats.hull, 0, 0, 0));
  g.add(part(blade(b.span * 0.98, b.chord * 0.22, b.chord * 0.12, b.chord * 0.3, b.chord * 0.2), mats.trim, 0, b.chord * 0.3, 0));
  g.rotation.set(Math.PI / 2, 0, side > 0 ? 0 : Math.PI);
  g.scale.z = side;
  return g;
}

// Backpack: armour box, thruster cluster, wing binders and (exotic ships) a floating ring.
export function buildBackpack(m, mats) {
  const d = m.d, g = new THREE.Group(), t = m.thrust, flames = [];
  const w = d.chestW * 1.5, h = d.chestH * 0.72, dep = d.chestD * 1.15;
  g.add(part(block(w * 2, h, dep * 2, 0.85, 6), mats.hull, 0, h * 0.15, dep));
  g.add(part(block(w * 1.3, h * 0.3, dep * 1.2, 0.8), mats.dark, 0, h * 0.62, dep * 1.1));
  const cols = Math.min(2, t.count), rows = Math.ceil(t.count / cols);
  for (let i = 0; i < t.count; i++) {
    const cx = (i % cols) - (cols - 1) / 2, cy = Math.floor(i / cols);
    const n = nozzle(t.r * (t.big && cy === 0 ? 1.35 : 1), t.len, mats);
    n.group.position.set(cx * w * 1.05, h * 0.1 - cy * t.r * 2.6, dep * 1.8 + rows * 0);
    n.group.rotation.x = 0.28 + cy * 0.12;
    g.add(n.group);
    flames.push(n.flame);
  }
  const binders = [];
  if (m.binder) {
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group(); // folded flat against the pack during the transform
      pivot.position.set(side * w * 0.95, h * 0.35, dep * 1.3);
      pivot.add(binderWing(m, mats, side));
      binders.push(pivot);
      g.add(pivot);
    }
  }
  if (m.ring) {
    const ring = part(new THREE.TorusGeometry(d.chestW * 1.7, d.chestW * 0.1, 6, 32), mats.glow, 0, h * 0.4, dep * 2.2);
    ring.rotation.x = 0.25;
    g.add(ring);
  }
  return { group: g, flames, binders };
}

// Calf thrusters: one per shin, exhaust pointing down-back. Returns the flames to animate.
export function buildCalfThruster(m, mats, shin) {
  const d = m.d, r = m.thrust.r * 0.62;
  const n = nozzle(r, d.shinL * 0.3, mats);
  n.group.position.set(0, -d.shinL * 0.72, d.armR * 1.9);
  n.group.rotation.x = 1.05;
  shin.add(n.group);
  return n.flame;
}

// Beam rifle held in the right hand: body, barrel, scope, magazine and a glowing muzzle.
export function buildRifle(m, mats) {
  const d = m.d, g = new THREE.Group(), L = d.upperL + d.foreL;
  const r = d.armR * 0.5;
  g.add(part(block(r * 2, r * 2.2, L * 0.55, 0.9), mats.hull, 0, r * 0.4, -L * 0.1));
  g.add(part(rod(r * 0.8, L * 0.62, 10).rotateX(Math.PI / 2), mats.dark, 0, r * 0.5, -L * 0.5));
  g.add(part(new THREE.TorusGeometry(r * 0.95, r * 0.2, 6, 14), mats.glow, 0, r * 0.5, -L * 0.78));
  g.add(part(block(r * 1.2, r * 1.1, L * 0.16), mats.trim, 0, r * 1.7, -L * 0.18)); // scope
  g.add(part(block(r * 1.4, r * 2.4, L * 0.14, 0.9), mats.dark, 0, -r * 1.1, L * 0.02)); // magazine
  g.add(part(block(r * 1.1, r * 1.8, L * 0.12), mats.dark, 0, -r * 0.9, L * 0.16)); // grip
  return { group: g, muzzle: new THREE.Vector3(0, r * 0.5, -L * 0.86) };
}
