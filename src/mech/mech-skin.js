// Drives the Gundam GLB from the procedural mech rig. mech-pose.js / mech-aim.js / mech-saber.js
// keep animating the plain Groups they always did; this layer copies each of those joints onto the
// matching bone, so walking, the flight pose, aim tracking, recoil, bracing and the saber combo all
// carry over to the model without a second animation system.
//
// Retargeting is done in world rotations, which is what makes it work at all: the model's rest pose
// is nothing like the rig's, so at bind time each bone stores the fixed offset between the two, and
// every frame the bone's world rotation becomes driverWorld * offset, converted back to its parent.
// Allocates nothing per frame.
import * as THREE from 'three';
import { cloneMechSkin, tintSkin } from './mech-glb.js';

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();
const FWD = new THREE.Vector3(0, 0, 1);

// The model was rigged in a wide A-stance. These turn the hips and shoulders back in about the
// forward axis at bind time, so the mech stands like a mecha instead of straddling the screen.
const TUCK_LEG = 0.15;
const TUCK_ARM = 0.13;

// Flat, parent-before-child list of the rig joints whose world rotation the bones follow.
function driverSlots(mech, spineCount) {
  const list = [];
  const push = (node, parent) => (list.push({ node, parent }), list.length - 1);
  const hips = push(mech.hips, -1);
  const torso = push(mech.torso, hips);
  const head = push(mech.head, torso);
  const arms = mech.arms.map((a) => {
    const g = push(a.group, torso), up = push(a.upper, g), fo = push(a.fore, up);
    return { g, up, fo, ha: push(a.hand, fo) };
  });
  const legs = mech.legs.map((l) => {
    const g = push(l.group, hips), sh = push(l.shin, g);
    return { g, sh, ft: push(l.foot, sh) };
  });
  const spine = [];                       // the rig has one torso joint; the spine shares it out
  for (let i = 0; i < spineCount; i++) {
    list.push({ node: null, a: hips, b: torso, t: (i + 1) / (spineCount + 1) });
    spine.push(list.length - 1);
  }
  return { list, hips, torso, head, arms, legs, spine };
}

export class MechSkin {
  constructor(mech, tpl) {
    this.mech = mech;
    this.inst = cloneMechSkin(tpl);
    this.rig = this.inst.rig;
    this.hipY = mech.design.d.hipY;
    tintSkin(this.inst.material, mech.design.palette, mech.design.cls);
    this.inst.scene.scale.setScalar(mech.design.d.H);
    mech.group.add(this.inst.scene);
    mech.group.updateMatrixWorld(true);
    this.drv = driverSlots(mech, this.rig.spine.length);
    this.q = this.drv.list.map(() => new THREE.Quaternion());
    this.gq = new THREE.Quaternion();
    this.headBone = this.inst.bones[this.rig.head] ?? null;
    this.link();
    this.mounts = mountGear(mech, this.inst.bones, this.rig);
  }

  // One entry per driven bone. Bones are added parents first, and each one converts its result
  // through its real parent in the skeleton — which is not always the joint above it in the rig
  // (the V-fin hangs off the spine yet has to turn with the head).
  link() {
    const r = this.rig, bone = (n) => (n ? this.inst.bones[n] : null);
    const d = this.drv, links = [], seen = new Map();
    const add = (b, slot, tuck = 0) => {
      if (!b || seen.has(b)) return;
      links.push({ bone: b, slot, tuck, parent: seen.get(b.parent) ?? -1, base: new THREE.Quaternion(),
        delta: new THREE.Quaternion(), world: new THREE.Quaternion() });
      seen.set(b, links.length - 1);
    };
    add(bone(r.root), d.hips);
    r.spine.forEach((n, i) => add(bone(n), d.spine[i]));
    add(bone(r.chest), d.torso);
    add(bone(r.head), d.head);
    r.arms.forEach((a, i) => {
      const s = d.arms[i], tuck = -this.mech.arms[i].side * TUCK_ARM;
      [[a.clav, d.torso, 0], [a.upper, s.up, tuck], [a.pad, s.g, 0], [a.fore, s.fo, 0], [a.hand, s.ha, 0]]
        .forEach(([n, slot, t]) => add(bone(n), slot, t));
    });
    r.legs.forEach((l, i) => {
      const s = d.legs[i], tuck = -this.mech.legs[i].side * TUCK_LEG;
      [[l.hip, s.g, tuck], [l.knee, s.sh, 0], [l.ankle, s.ft, 0]]
        .forEach(([n, slot, t]) => add(bone(n), slot, t));
    });
    for (const n of r.crest) add(bone(n), d.head);
    this.links = links;
    this.rest();
  }

  // Fixed rotation offset between each rig joint and its bone, measured in the neutral pose.
  rest() {
    const g = this.mech.group;
    g.updateMatrixWorld(true);
    this.gq.copy(g.getWorldQuaternion(_q)).invert();
    this.evalDriver();
    for (const l of this.links) {
      l.world.copy(this.gq).multiply(l.bone.getWorldQuaternion(_q));
      l.delta.copy(this.q[l.slot]).invert().multiply(l.world);
      if (l.tuck) {                      // a fixed turn about the mech's forward axis, in bone space
        _v.copy(FWD).applyQuaternion(_q2.copy(l.world).invert());
        l.delta.multiply(_q2.setFromAxisAngle(_v, l.tuck));
      }
      if (l.parent < 0) l.base.copy(this.gq).multiply(l.bone.parent.getWorldQuaternion(_q));
    }
  }

  evalDriver() {
    const list = this.drv.list, q = this.q;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.node) { q[i].copy(q[e.a]).slerp(q[e.b], e.t); continue; }
      if (e.parent < 0) q[i].copy(e.node.quaternion);
      else q[i].copy(q[e.parent]).multiply(e.node.quaternion);
    }
  }

  // Called after every pose update; cheap enough to run twice a frame.
  sync() {
    this.evalDriver();
    const links = this.links;
    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      l.world.copy(this.q[l.slot]).multiply(l.delta);
      _q.copy(l.parent < 0 ? l.base : links[l.parent].world).invert().multiply(l.world);
      l.bone.quaternion.copy(_q);
    }
    this.inst.scene.position.y = this.mech.hips.position.y - this.hipY;   // bob, crouch and landing
    if (this.headBone) this.headBone.scale.setScalar(this.mech.head.scale.x);
  }

  dispose() {
    const g = this.mech.group;
    for (const m of this.mounts) while (m.children.length) g.add(m.children[0]); // hand the gear back
    this.inst.scene.removeFromParent();
    this.inst.material.dispose();
  }
}

// A Group under `bone` that reproduces `frame`'s current transform; `atBone` drops it onto the
// bone's own origin instead, which is where a weapon's grip belongs.
function mount(bone, frame, atBone) {
  const g = new THREE.Group();
  bone.add(g);
  _m.copy(bone.matrixWorld).invert().multiply(frame.matrixWorld);
  _m.decompose(g.position, g.quaternion, g.scale);
  if (atBone) g.position.set(0, 0, 0);
  return g;
}

// The model brings its own backpack, so only the ship's hardware stays: the thruster nozzles that
// carry the flames, and the wings. The armour box goes and the cluster shrinks; the wings do not.
function slimPack(pack) {
  for (const child of pack.children) {
    if (child.isMesh) child.visible = false;                   // the model brings its own backpack
    else if (child.name !== 'mech-wing') child.scale.setScalar(0.72);
  }
  return pack;
}

// Moves everything the mech carries off the hidden procedural frame and onto the model's bones.
function mountGear(mech, bones, rig) {
  const out = [];
  const hands = mech.arms.map((arm, i) => mount(bones[rig.arms[i].hand], arm.hand, true));
  mech.handMount = hands;
  out.push(...hands);
  hands[1].add(mech.rack.root);
  if (mech.saber.group.parent === mech.arms[0].hand) hands[0].add(mech.saber.group);
  mech.arms.forEach((arm, i) => {
    const pad = bones[rig.arms[i].pad] ?? bones[rig.arms[i].upper];
    const m = mount(pad, arm.group, false);
    m.add(mech.pods.pods[i].root);
    out.push(m);
  });
  const chest = mount(bones[rig.chest], mech.torso, false);
  chest.add(slimPack(mech.pack.group));
  out.push(chest);
  mech.legs.forEach((leg, i) => {
    const knee = bones[rig.legs[i].knee], nozzle = mech.calf[i]?.parent;
    if (!knee || !nozzle) return;
    const m = mount(knee, leg.shin, false);
    m.add(nozzle);
    out.push(m);
  });
  mech.hips.visible = false;               // the procedural body is now only a puppet rig
  return out;
}

// Ties the loaded model to a built mech: bones follow the rig, gear moves onto the bones.
export function attachSkin(mech, tpl) {
  const skin = new MechSkin(mech, tpl);
  mech.skin = skin;
  mech.sync = () => skin.sync();
  const dispose = mech.dispose;
  mech.dispose = () => { skin.dispose(); dispose(); };
  skin.sync();
  return skin;
}
