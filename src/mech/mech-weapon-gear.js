// The hardware the mech's right hand carries: beam rifle, gatling and particle cannon. The
// rockets fire from the shoulders instead (mech-shoulder-pods.js). All three are built once and
// parented to the hand; only the selected one is visible, and every weapon points down its local
// -Z, the same convention the rifle already used.
import * as THREE from 'three';
import { part } from '../view/ship/ship-materials.js';
import { block, rod } from './mech-geo.js';
import { buildRifle } from './mech-gear.js';
import { RIFLE, BAZOOKA, GATLING, CANNON, POD, SABER } from './mech-weapons.js';

// The bazooka and the missile pod fire from the shoulder launchers (mech-shoulder-pods.js), so
// the hand keeps the beam rifle as a sidearm for both.
const HELD = { [RIFLE]: RIFLE, [POD]: RIFLE, [SABER]: RIFLE, [BAZOOKA]: RIFLE, [GATLING]: GATLING, [CANNON]: CANNON };

function hotMaterial(color) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false });
}

// Rotary cannon: six barrels in a spinner plus the ammo drum that feeds it.
function buildGatling(d, mats, hot) {
  const g = new THREE.Group(), L = d.upperL + d.foreL, r = d.armR;
  g.add(part(block(r * 2.1, r * 2.1, L * 0.6, 0.9, 6), mats.hull, 0, r * 0.5, -L * 0.05));
  g.add(part(block(r * 1.2, r * 1.6, L * 0.24, 0.9), mats.dark, 0, -r * 0.8, L * 0.16)); // grip
  const drum = part(new THREE.CylinderGeometry(r * 1.5, r * 1.5, r * 1.6, 12).rotateZ(Math.PI / 2), mats.dark, r * 1.9, r * 0.35, L * 0.05);
  g.add(drum);
  const spinner = new THREE.Group();
  spinner.position.set(0, r * 0.5, -L * 0.4);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    spinner.add(part(rod(r * 0.3, L * 1.05, 6).rotateX(Math.PI / 2), mats.trim, Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, -L * 0.52));
  }
  spinner.add(part(new THREE.CylinderGeometry(r * 1.05, r * 1.05, L * 0.14, 12).rotateX(Math.PI / 2), mats.dark, 0, 0, -L * 0.95));
  g.add(spinner);
  const ring = part(new THREE.TorusGeometry(r * 1.0, r * 0.2, 6, 16).rotateX(Math.PI / 2), hot, 0, r * 0.5, -L * 1.0);
  g.add(ring);
  return { group: g, spinner, muzzle: new THREE.Vector3(0, r * 0.5, -L * 1.08),
    eject: new THREE.Vector3(r * 1.2, r * 0.1, L * 0.02), hot: ring };
}

// Particle cannon: a wide emitter bell with three condenser rings that light up while charging.
function buildCannon(d, mats, hot, glow) {
  const g = new THREE.Group(), L = d.upperL + d.foreL, r = d.armR;
  g.add(part(block(r * 2.6, r * 2.4, L * 1.1, 0.85, 6), mats.hull, 0, r * 0.55, -L * 0.1));
  g.add(part(new THREE.CylinderGeometry(r * 2.3, r * 1.15, L * 0.75, 14, 1, true).rotateX(-Math.PI / 2), mats.dark, 0, r * 0.55, -L * 0.95));
  g.add(part(block(r * 1.2, r * 1.7, L * 0.26, 0.9), mats.dark, 0, -r * 0.9, L * 0.2));   // grip
  for (const s of [-1, 1]) {                                                              // radiator fins
    const fin = part(block(r * 0.3, r * 1.7, L * 0.7, 0.7), mats.trim, s * r * 1.6, r * 1.2, -L * 0.1);
    fin.rotation.z = s * 0.3;
    g.add(fin);
  }
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = part(new THREE.TorusGeometry(r * (1.3 + i * 0.32), r * 0.16, 6, 20).rotateX(Math.PI / 2), glow,
      0, r * 0.55, -L * (0.7 + i * 0.22));
    ring.scale.setScalar(0.001);
    rings.push(ring);
    g.add(ring);
  }
  const core = part(new THREE.SphereGeometry(r * 0.75, 12, 8), hot, 0, r * 0.55, -L * 0.62);
  g.add(core);
  return { group: g, rings, core, muzzle: new THREE.Vector3(0, r * 0.55, -L * 1.34), hot: core };
}

// Builds all four, parents them to `hand`, and returns the switcher the mech exposes.
export function buildRack(m, mats, hand) {
  const d = m.d, hot = hotMaterial(0xffb060), glow = hotMaterial(0xc8a8ff);
  const root = new THREE.Group();
  hand.add(root);
  const items = {
    [RIFLE]: buildRifle(m, mats),
    [GATLING]: buildGatling(d, mats, hot),
    [CANNON]: buildCannon(d, mats, hot, glow),
  };
  const offs = { [RIFLE]: -d.armR * 0.3, [GATLING]: 0, [CANNON]: 0 };
  for (const id in items) {
    const it = items[id];
    it.group.position.set(0, -d.handL * 0.9, offs[id]);
    it.group.visible = id === RIFLE;
    root.add(it.group);
  }
  return rackApi(items, { hot, glow }, root);
}

function rackApi(items, mats, root) {
  let held = RIFLE, spin = 0;
  const api = {
    items, root, held: () => held,
    setVisible(on) { root.visible = on; },
    select(id) {
      const next = HELD[id] ?? RIFLE;
      if (next === held) return;
      items[held].group.visible = false;
      held = next;
      items[held].group.visible = true;
    },
    // Barrel spin for the gatling; `amount` 0..1 is the spin-up level.
    spinBarrels(dt, amount) {
      spin += dt * amount * 46;
      items[GATLING].spinner.rotation.z = spin;
    },
    setCharge(t) {
      const c = items[CANNON];
      for (let i = 0; i < 3; i++) {
        const k = Math.max(0.001, Math.min(1, t * 3 - i));
        c.rings[i].scale.setScalar(k);
      }
      mats.glow.opacity = Math.min(1, t * 1.3);
      mats.hot.opacity = Math.max(mats.hot.opacity, t * 0.9);
      c.core.scale.setScalar(0.4 + t * 0.9);
    },
    // Barrel heat glow, shared by every held weapon.
    setHeat(t) { mats.hot.opacity = Math.min(1, t * 1.15); },
    muzzle(out) { return items[held].group.localToWorld(out.copy(items[held].muzzle)); },
    vent(out) {
      const v = items[held].vent ?? items[held].muzzle;
      return items[held].group.localToWorld(out.copy(v));
    },
    eject(out) {
      const e = items[GATLING].eject;
      return items[GATLING].group.localToWorld(out.copy(e));
    },
  };
  return api;
}
