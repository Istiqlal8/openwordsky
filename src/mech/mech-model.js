// Assembles one mech from a mech design. Built once per ship design and cached (mech-cache.js).
// The returned rig is what mech-pose.js animates; setDeploy() folds it back into transport form.
import * as THREE from 'three';
import { shipMaterials } from '../view/ship/ship-materials.js';
import { setFlames } from '../view/ship/ship-engines.js';
import { buildChest, buildPelvis, buildHead, buildArm, buildLeg } from './mech-parts.js';
import { buildBackpack, buildCalfThruster, buildSaber } from './mech-gear.js';
import { buildRack } from './mech-weapon-gear.js';

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
  const flames = [...r.pack.flames, ...r.legs.map((leg) => buildCalfThruster(m, mats, leg.shin))];
  const rack = buildRack(m, mats, r.arms[1].hand);
  const saber = buildSaber(m, mats);
  const mount = sheathMount(m, r.pack.group);
  r.arms[0].hand.add(saber.group);
  saber.group.position.set(0, -m.d.handL * 0.9, 0);
  const fill = new THREE.PointLight(0xdfe8ff, 2.2, m.d.H * 2.6, 1); // keeps the far side readable
  fill.position.set(0, m.d.H * 0.78, -m.d.H * 0.62);
  r.root.add(fill);
  const base = { shoulderX: m.d.shoulderX, headY: r.head.position.y, hipY: m.d.hipY };
  const mech = {
    design: m, mats, group: r.root, hips: r.hips, torso: r.torso, head: r.head,
    legs: r.legs, arms: r.arms, pack: r.pack, rack, saber, flames, base, deploy: 1, sheathed: false,
  };
  mech.setWorldScale = (k) => { fill.distance = m.d.H * 2.6 * k; };
  mech.setThrust = (t) => setFlames(flames, THREE.MathUtils.clamp(t, 0, 1), mats);
  mech.setSaber = (t) => { saber.beam.scale.y = saber.core.scale.y = Math.max(0.001, t); };
  mech.setDeploy = (t) => setDeploy(mech, THREE.MathUtils.clamp(t, 0, 1));
  mech.setWeapon = (id) => rack.select(id);
  mech.rifleMuzzle = (out) => rack.muzzle(out);
  mech.gunVent = (out) => rack.vent(out);
  mech.gunEject = (out) => rack.eject(out);
  mech.saberTip = (out) => saber.group.localToWorld(out.copy(saber.tip));
  mech.saberBase = (out) => saber.group.localToWorld(out.set(0, saber.tip.y - saber.length, 0));
  mech.sheathSaber = (on) => setSheath(mech, saber, mount, on);
  mech.shoulderMuzzle = (i, out) => r.arms[i].pad.localToWorld(out.set(0, m.d.padR * 0.8, -m.d.padR * 0.6));
  mech.footWorld = (i, out) => r.legs[i].foot.getWorldPosition(out);
  mech.dispose = () => { disposeTree(r.root); for (const k in mats) mats[k].dispose?.(); };
  mech.setThrust(0);
  mech.setDeploy(1);
  return mech;
}

// Where the hilt rides when it is not in the hand: clipped to the left of the backpack.
function sheathMount(m, pack) {
  const d = m.d, w = d.chestW * 1.5, h = d.chestH * 0.72, dep = d.chestD * 1.15;
  return { parent: pack, x: -w * 1.2, y: h * 0.05, z: dep * 1.35, hand: -d.handL * 0.9 };
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
    mech.arms[0].hand.add(g);
    g.position.set(0, mount.hand, 0);
    g.rotation.set(-Math.PI / 2, 0, 0);
  }
}

// deploy 1 = standing mech, 0 = folded transport block roughly the size of the ship.
function setDeploy(mech, t) {
  mech.deploy = t;
  const u = 1 - t, b = mech.base;
  for (const leg of mech.legs) {
    leg.group.rotation.x = u * 1.95;
    leg.group.position.x = leg.side * mech.design.d.hipW * 0.78 * (0.6 + 0.4 * t);
    leg.shin.rotation.x = -u * 2.7;
    leg.foot.rotation.x = u * 1.1;
  }
  for (const arm of mech.arms) {
    arm.group.position.x = arm.side * b.shoulderX * (0.55 + 0.45 * t);
    arm.upper.rotation.z = -arm.side * u * 1.5;
    arm.upper.rotation.x = u * 0.5;
    arm.fore.rotation.x = -u * 2.5;
  }
  mech.head.scale.setScalar(lerp(0.12, 1, t));
  mech.head.position.y = b.headY - u * mech.design.d.headR * 1.8;
  mech.torso.rotation.x = u * 0.32;
  mech.hips.position.y = lerp(b.hipY * 0.62, b.hipY, t);
  for (const pivot of mech.pack.binders) pivot.rotation.x = -u * 1.35;
  mech.saber.group.visible = t > 0.6;
}

// Height of the folded silhouette, used to line the transform up with the ship model.
export function foldedHeight(m) {
  return m.d.hipY * 0.62 + m.d.chestH + m.d.headR;
}
