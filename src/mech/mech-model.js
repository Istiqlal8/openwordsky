// Assembles one mech from a mech design. Built once per ship design and cached (mech-cache.js).
// The returned rig is what mech-pose.js animates; setDeploy() folds it back into transport form.
import * as THREE from 'three';
import { shipMaterials } from '../view/ship/ship-materials.js';
import { setFlames } from '../view/ship/ship-engines.js';
import { buildChest, buildPelvis, buildHead, buildArm, buildLeg } from './mech-parts.js';
import { buildBackpack, buildCalfThruster } from './mech-gear.js';
import { buildBlade } from './mech-blade.js';
import { buildRack } from './mech-weapon-gear.js';
import { buildShoulderPods } from './mech-shoulder-pods.js';

const lerp = (a, b, t) => a + (b - a) * t;

function disposeTree(root) {
  const mats = new Set();
  root.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) mats.add(o.material);
  });
  for (const m of mats) m.dispose(); // the glow sprite texture is cached in textures.js
}

function assemble(m, mats) {
  const d = m.d, root = new THREE.Group();
  root.name = `mech:${m.name}`;
  const hips = new THREE.Group();
  hips.position.y = d.hipY;
  hips.add(buildPelvis(m, mats));
  const legs = [-1, 1].map((side) => {
    const leg = buildLeg(m, mats, side);
    leg.group.position.set(side * d.hipW * 0.78, 0, 0);
    leg.side = side;
    hips.add(leg.group);
    return leg;
  });
  const torso = new THREE.Group();
  torso.position.y = d.pelvisH * 0.55;
  torso.add(buildChest(m, mats));
  const head = buildHead(m, mats);
  head.position.y = d.chestH * 0.95;
  torso.add(head);
  const pack = buildBackpack(m, mats);
  pack.group.position.y = d.chestH * 0.42;
  torso.add(pack.group);
  const arms = [-1, 1].map((side) => {
    const arm = buildArm(m, mats, side);
    arm.group.position.set(side * d.shoulderX, d.chestH * 0.75, 0);
    arm.side = side;
    torso.add(arm.group);
    return arm;
  });
  hips.add(torso);
  root.add(hips);
  return { root, hips, torso, head, legs, arms, pack };
}

export function buildMech(m) {
  const mats = shipMaterials(m.palette, m.cls);
  const r = assemble(m, mats);
  const calf = r.legs.map((leg) => buildCalfThruster(m, mats, leg.shin));
  const flames = [...r.pack.flames, ...calf];
  const rack = buildRack(m, mats, r.arms[1].hand);
  const pods = buildShoulderPods(m, mats);
  r.arms.forEach((arm, i) => arm.group.add(pods.pods[i].root));
  const saber = buildBlade(m, mats, m.palette?.glow ?? 0x9fd8ff);
  const mount = sheathMount(m, r.pack.group);
  r.arms[0].hand.add(saber.group);
  saber.group.position.set(0, -m.d.handL * 0.9, 0);
  const fill = new THREE.PointLight(0xdfe8ff, 2.2, m.d.H * 2.6, 1); // keeps the far side readable
  fill.position.set(0, m.d.H * 0.78, -m.d.H * 0.62);
  r.root.add(fill);
  const base = { shoulderX: m.d.shoulderX, headY: r.head.position.y, hipY: m.d.hipY };
  const mech = {
    design: m, mats, group: r.root, hips: r.hips, torso: r.torso, head: r.head,
    legs: r.legs, arms: r.arms, pack: r.pack, rack, pods, saber, flames, calf, base, deploy: 1, sheathed: false,
  };
  wireMech(mech, { m, mats, r, rack, pods, saber, mount, flames, fill });
  mech.setThrust(0);
  mech.setDeploy(1);
  return mech;
}

// The mech's public surface: what the pose, gun and transform code is allowed to ask of it.
function wireMech(mech, { m, mats, r, rack, pods, saber, mount, flames, fill }) {
  mech.setWorldScale = (k) => { fill.distance = m.d.H * 2.6 * k; };
  // `boost` 0..1 stretches the plumes further than the flame curve alone allows, so a hard run
  // reads as a hard run rather than just a bright nozzle.
  mech.setBinders = (k) => r.pack.binders.forEach((b, i) => {
    const s = i ? 1 : -1;
    b.rotation.z = s * k * 0.95;
    b.rotation.y = -s * k * 0.55;
  });
  mech.setThrust = (t, boost = 0) => {
    setFlames(flames, THREE.MathUtils.clamp(t, 0, 1), mats);
    if (boost <= 0) return;
    for (const f of flames) f.scale.z *= 1 + boost * 2.1;
  };
  mech.setSaber = (t) => saber.setLit(t);
  mech.setDeploy = (t) => setDeploy(mech, THREE.MathUtils.clamp(t, 0, 1));
  mech.setWeapon = (id) => { rack.select(id); pods.setMode(id); };
  mech.stepPods = (dt) => pods.update(dt);
  mech.rifleMuzzle = (out) => (pods.firing ? pods.tube(pods.side, out) : rack.muzzle(out));
  mech.nextTube = () => pods.next();
  mech.gunVent = (out) => (pods.firing ? pods.vent(pods.side, out) : rack.vent(out));
  mech.gunEject = (out) => rack.eject(out);
  mech.saberTip = (out) => saber.group.localToWorld(out.copy(saber.tip));
  mech.saberBase = (out) => saber.group.localToWorld(out.set(0, saber.tip.y - saber.length, 0));
  mech.drawSaber = (t) => drawSaber(mech, saber, mount, t);
  mech.sheathSaber = (on) => setSheath(mech, saber, mount, on);
  mech.shoulderMuzzle = (i, out) => pods.tube(i, out);
  mech.footWorld = (i, out) => r.legs[i].foot.getWorldPosition(out);
  mech.dispose = () => {
    disposeTree(r.root);
    for (const k in mats) mats[k].dispose?.();
    for (const k in saber.mats) saber.mats[k].dispose();
  };
}

// Where the hilt rides when it is not in the hand: clipped to the left of the backpack.
function sheathMount(m, pack) {
  const d = m.d, w = d.chestW * 1.5, h = d.chestH * 0.72, dep = d.chestD * 1.15;
  return { parent: pack, x: -w * 1.2, y: h * 0.05, z: dep * 1.35, hand: -d.handL * 0.9 };
}

const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler(0.18, 0, -0.5);
const GRIP = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

// The draw, as a motion rather than a swap: the hand takes the hilt at once and the sword slides
// out of the backpack rack along the reach, arriving in the grip halfway through.
function drawSaber(mech, saber, mount, t) {
  if (t <= 0.02) { setSheath(mech, saber, mount, true); return; }
  setSheath(mech, saber, mount, false);
  const g = saber.group, hand = g.parent;
  hand.updateWorldMatrix(true, false);
  mount.parent.updateWorldMatrix(true, false);
  _m.makeRotationFromEuler(_e).setPosition(mount.x, mount.y, mount.z);      // hilt on the rack
  _m2.multiplyMatrices(mount.parent.matrixWorld, _m);
  _m.copy(hand.matrixWorld).invert().multiply(_m2);                         // ...in the hand's frame
  _m.decompose(_p, _q, _s);
  const k = Math.min(1, (t - 0.02) / 0.52), e = k * k * (3 - 2 * k);
  g.position.set(_p.x * (1 - e), _p.y + (mount.hand - _p.y) * e, _p.z * (1 - e));
  g.quaternion.copy(_q).slerp(GRIP, e);
}

// Draw and sheathe: the hilt is reparented between the backpack rack and the left hand.
function setSheath(mech, saber, mount, on) {
  if (mech.sheathed === on) return;
  mech.sheathed = on;
  const g = saber.group;
  if (on) {
    mount.parent.add(g);
    g.position.set(mount.x, mount.y, mount.z);
    g.rotation.set(0.18, 0, -0.5);
  } else {
    (mech.handMount?.[0] ?? mech.arms[0].hand).add(g);   // the GLB skin moves the grip onto a bone
    g.position.set(0, mount.hand, 0);
    g.rotation.set(-Math.PI / 2, 0, 0);
  }
}

// deploy 1 = standing mech, 0 = folded transport block roughly the size of the ship.
//
// Once the frame is fully unfolded this stops writing joints: mech-pose.js owns them from there.
// Re-applying the t = 1 fold every frame used to reset every limb to zero just before the pose
// sprang toward its target, so the walk and the flight pose only ever reached a tenth of it.
function setDeploy(mech, t) {
  const settled = mech.deploy === t && t >= 1;
  mech.deploy = t;
  mech.saber.group.visible = t > 0.6;
  mech.rack.setVisible(t > 0.5);
  mech.pods.setVisible(t > 0.5);
  if (settled) return;
  fold(mech, t);
}

function fold(mech, t) {
  const u = 1 - t, b = mech.base;
  for (const leg of mech.legs) {
    leg.group.rotation.x = u * 1.95;
    leg.group.rotation.z = -leg.side * u * 0.6;      // knees swing out of the hull, then snap in
    leg.group.position.x = leg.side * mech.design.d.hipW * 0.78 * (0.6 + 0.4 * t);
    leg.shin.rotation.x = -u * 2.7;
    leg.foot.rotation.x = u * 1.1;
  }
  for (const arm of mech.arms) {
    arm.group.position.x = arm.side * b.shoulderX * (0.55 + 0.45 * t);
    arm.group.rotation.y = arm.side * u * 1.15;      // shoulders rotate forward out of the block
    arm.upper.rotation.z = -arm.side * u * 1.5;
    arm.upper.rotation.x = u * 0.5;
    arm.fore.rotation.x = -u * 2.5;
    arm.hand.rotation.y = 0;
  }
  mech.head.scale.setScalar(lerp(0.12, 1, t));
  mech.head.position.y = b.headY - u * mech.design.d.headR * 1.8;
  mech.head.rotation.set(-u * 0.6, u * 4.4, 0);      // the head spins up out of the chest
  mech.torso.rotation.set(u * 0.32, -u * 0.7, u * 0.3);
  mech.hips.position.y = lerp(b.hipY * 0.62, b.hipY, t);
  for (const pivot of mech.pack.binders) pivot.rotation.x = -u * 1.35;
}

// Height of the folded silhouette, used to line the transform up with the ship model.
export function foldedHeight(m) {
  return m.d.hipY * 0.62 + m.d.chestH + m.d.headR;
}
