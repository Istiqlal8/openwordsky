// Procedural skeletal animation for the rigged animal models (they ship without clips).
// Every rotation is expressed about a model-space axis (+X forward, +Y up, +Z right, see
// model-cache.js) and converted to the bone's parent frame with the axes stored in the rig
// profile, so the same code drives every rig: bone = R(x) * R(y) * R(z) * restQuaternion.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const STRAIGHTEN = 0.7; // the whale mesh is modelled mid-breach; this levels its tail
const FLIPPERS_OUT = 0.5; // ...and lifts its hanging flippers
const qx = new THREE.Quaternion(), qy = new THREE.Quaternion(), qz = new THREE.Quaternion();

export class BoneAnimator {
  constructor(inst, seed = Math.random()) {
    this.profile = inst.profile;
    this.bones = inst.bones;
    this.angles = {};
    for (const name of Object.keys(this.profile.axes)) this.angles[name] = { x: 0, y: 0, z: 0 };
    this.phase = seed * 7;
    this.time = seed * 13;
    this.gait = 0;
    this.look = 0;
  }

  add(name, axis, angle) {
    const a = name && this.angles[name];
    if (a) a[axis] += angle;
  }

  // speed: body heights per second; look: head yaw (rad, same sense as rotation.y);
  // mode: 'walk' | 'fly' | 'glide' | 'swim'.
  update(dt, { speed = 0, look = 0, mode = 'walk' } = {}) {
    for (const a of Object.values(this.angles)) a.x = a.y = a.z = 0;
    this.time += dt;
    this.gait += (Math.min(1, speed * 2) - this.gait) * Math.min(1, dt * 4);
    this.phase += dt * Math.min(3.2, 0.6 + speed * 0.9) * (this.gait > 0.02 ? 1 : 0);
    this.look += (look - this.look) * Math.min(1, dt * 3);
    const ph = this.phase * TAU;
    if (mode === 'swim') this.swim();
    else this.legs(ph, speed, mode !== 'walk');
    if (mode === 'fly' || mode === 'glide') this.wings(mode === 'fly' ? 1 : 0.25);
    this.body(ph);
    this.head(ph);
    this.apply();
  }

  legs(ph, speed, tucked) {
    const biped = this.profile.legs.length <= 2;
    const swing = (0.3 + 0.25 * Math.min(1, speed / 3)) * this.gait;
    for (const leg of this.profile.legs) {
      if (tucked) { this.add(leg.hip, 'z', -0.9); this.add(leg.knee, 'z', 0.8); continue; }
      const offset = biped ? (leg.side > 0 ? 0 : Math.PI) : (leg.front ? 0 : Math.PI) + (leg.side > 0 ? 0 : Math.PI);
      const p = ph + offset;
      this.add(leg.hip, 'z', Math.sin(p) * swing);
      this.add(leg.knee, 'z', -Math.max(0, Math.cos(p)) * swing * 1.3);
    }
  }

  // Spine sway with the stride, idle breathing, tail follow-through.
  body(ph) {
    const { spine, tail } = this.profile;
    const breath = Math.sin(this.time * 1.7) * 0.015;
    spine.forEach((b, i) => {
      this.add(b, 'y', Math.sin(ph - i * 0.4) * 0.05 * this.gait);
      this.add(b, 'z', breath);
    });
    const amp = 0.07 + 0.1 * this.gait;
    tail.forEach((b, i) => {
      this.add(b, 'y', Math.sin(this.time * (1.3 + this.gait * 2) - i * 0.7) * amp);
      this.add(b, 'z', Math.sin(this.time * 0.8 - i * 0.5) * 0.03);
    });
  }

  // Head bob with the stride, slow idle glances, and yaw toward a look target.
  head(ph) {
    const neck = this.profile.neck;
    if (!neck.length) return;
    const idle = Math.sin(this.time * 0.37) * 0.25 * (1 - this.gait);
    const yaw = Math.max(-1.1, Math.min(1.1, this.look + idle)) / neck.length;
    neck.forEach((b, i) => {
      this.add(b, 'y', yaw);
      this.add(b, 'z', i === 0 ? Math.sin(ph * 2) * 0.05 * this.gait + Math.sin(this.time * 0.9) * 0.02 : 0);
    });
  }

  // Wing beat about the forward axis; outer bones lag behind for a whip-like follow-through.
  wings(strength) {
    const t = this.time * (strength > 0.5 ? 5.5 : 1.5);
    for (const w of this.profile.wings) {
      w.bones.forEach((b, i) => {
        const amp = (i === 0 ? 0.55 : 0.18) * strength;
        this.add(b, 'x', -w.side * Math.sin(t - i * 0.45) * amp);
      });
    }
  }

  // Whale: vertical fluke undulation growing toward the tail, flippers rowing gently.
  swim() {
    const tail = this.profile.tail;
    tail.forEach((b, i) => {
      const k = (i + 1) / tail.length;
      this.add(b, 'z', Math.sin(this.time * 1.4 - i * 0.8) * 0.2 * k + STRAIGHTEN * k);
    });
    for (const w of this.profile.wings) this.add(w.bones[0], 'x', -w.side * (FLIPPERS_OUT + Math.sin(this.time * 0.9) * 0.15));
  }

  apply() {
    const axes = this.profile.axes;
    for (const [name, a] of Object.entries(this.angles)) {
      const bone = this.bones[name], ax = axes[name];
      if (!bone) continue;
      qx.setFromAxisAngle(ax.x, a.x);
      qy.setFromAxisAngle(ax.y, a.y);
      qz.setFromAxisAngle(ax.z, a.z);
      bone.quaternion.copy(qx).multiply(qy).multiply(qz).multiply(ax.q0);
    }
  }
}
