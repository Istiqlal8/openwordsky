// Shoulder hardware: a rocket launcher on each shoulder that hinges up and forward into firing
// position — end caps swinging clear — when the pilot selects rockets or missiles, and folds back
// flat against the pauldron for everything else. Launches alternate left, right, left.
//
// The mech's firing code asks for muzzle positions through mech.shoulderMuzzle(); those come from
// the live tube transforms, so the rockets always leave the tube that is actually pointing.
import * as THREE from 'three';
import { part } from '../view/ship/ship-materials.js';
import { block, rod } from './mech-geo.js';
import { BAZOOKA, POD } from './mech-weapons.js';

const STOW = 2.55;               // pivot pitch when folded back flat along the shoulder
const RATE = 3.6;                // deploy speed: about a third of a second, and visibly mechanical

function buildTube(pr, mats, x, y) {
  const g = new THREE.Group();
  g.position.set(x, y, 0);
  g.add(part(rod(pr * 0.34, pr * 2.6, 10).rotateX(Math.PI / 2), mats.dark, 0, 0, -pr * 0.1));
  g.add(part(new THREE.TorusGeometry(pr * 0.36, pr * 0.08, 6, 12), mats.trim, 0, 0, -pr * 1.38));
  return g;
}

// One launcher: a hinged body with four tubes and a cap door over their mouths.
function buildPod(m, mats, side) {
  const pr = m.d.padR;
  const root = new THREE.Group();
  root.position.set(side * pr * 0.34, pr * 1.02, pr * 0.2);
  const pivot = new THREE.Group();
  root.add(pivot);
  pivot.add(part(block(pr * 1.5, pr * 2.5, pr * 1.6, 0.86, 6), mats.hull, 0, 0, -pr * 0.2));
  pivot.add(part(block(pr * 1.75, pr * 0.4, pr * 1.8, 0.9), mats.trim, 0, 0, -pr * 0.1));
  pivot.add(part(block(pr * 0.5, pr * 1.2, pr * 1.1, 0.8), mats.dark, side * pr * 0.85, 0, pr * 0.45));
  const tubes = [];
  for (const [x, y] of [[-0.38, 0.5], [0.38, 0.5], [-0.38, -0.5], [0.38, -0.5]]) {
    const t = buildTube(pr, mats, x * pr, y * pr);
    pivot.add(t);
    tubes.push(t);
  }
  const cap = new THREE.Group();
  cap.position.set(0, pr * 1.2, -pr * 1.4);
  cap.add(part(block(pr * 1.6, pr * 0.22, pr * 2.5, 0.9), mats.trim, 0, 0, -pr * 1.1));
  pivot.add(cap);
  pivot.rotation.x = STOW;
  return { root, pivot, cap, tubes, side, muzzle: new THREE.Vector3(0, 0, -pr * 1.5),
    vent: new THREE.Vector3(0, 0, pr * 1.2) };
}

// -> the pair plus the little state machine that deploys them. Nothing allocates per frame.
export function buildShoulderPods(m, mats) {
  const api = podApi([-1, 1].map((side) => buildPod(m, mats, side)));
  api.update(1, 0);
  return api;
}

function podApi(pods) {
  const api = {
    pods, t: 0, want: 0, side: 1, shot: 0, mode: null,
    get deployed() { return api.t > 0.55; },
    get firing() { return api.deployed && api.mode === BAZOOKA; },

    setMode(id) {
      api.mode = id;
      api.want = id === BAZOOKA || id === POD ? 1 : 0;
    },

    // Hinge up and forward, caps swinging clear as the tubes come level.
    update(dt, force) {
      const target = force ?? api.want;
      api.t += (target - api.t) * (1 - Math.exp(-RATE * dt));
      if (Math.abs(api.t - target) < 0.002) api.t = target;
      const e = api.t * api.t * (3 - 2 * api.t);
      for (const p of pods) {
        p.pivot.rotation.x = STOW * (1 - e);
        p.pivot.rotation.z = p.side * 0.22 * (1 - e);
        p.cap.rotation.x = -STOW * (1 - e) - Math.max(0, e * 1.35 - 0.35) * 1.75;
        p.root.visible = api.t > 0.004;
      }
    },

    // Alternate shoulders after every launch.
    next() { api.side = api.side ? 0 : 1; },

    // World point of the tube that fires next on pod `i`.
    tube(i, out) {
      const p = pods[i] ?? pods[0];
      return p.tubes[api.shot ?? 0].localToWorld(out.copy(p.muzzle));
    },

    vent(i, out) {
      const p = pods[i] ?? pods[0];
      return p.tubes[api.shot ?? 0].localToWorld(out.copy(p.vent));
    },

    setVisible(on) { for (const p of pods) p.root.visible = on && api.t > 0.004; },

    dispose() { for (const p of pods) p.root.removeFromParent(); },
  };
  const step = api.next;
  api.next = () => { step(); if (api.side === 1) api.shot = (api.shot + 1) % 4; };
  return api;
}
