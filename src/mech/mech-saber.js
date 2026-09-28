// Beam saber: drawn from the backpack rack, then a three-hit combo — overhead, horizontal sweep,
// thrust — each with its own wind-up, snap and follow-through, a blade trail and a hit-stop on
// contact. Drives the left arm, the torso and the hips; the gun controllers only ask it to swing.
import * as THREE from 'three';
import { BladeTrail } from './mech-trail.js';

// [upper.x, upper.z, fore.x, torso.y, torso.x, torso.z]
const STEPS = [
  { name: 'Tebasan Atas', dur: 0.46, wind: 0.30, hit: 0.58, lunge: 0.55, reach: 1.0,
    a: [-2.55, 0.62, -1.05, -0.44, -0.24, -0.22],
    b: [0.85, 0.12, -0.15, 0.24, 0.40, 0.26],
    c: [0.40, 0.28, -0.50, 0.08, 0.16, 0.10] },
  { name: 'Sabetan', dur: 0.40, wind: 0.28, hit: 0.56, lunge: 0.7, reach: 1.15,
    a: [-1.25, 1.40, -1.30, 0.88, 0.02, 0.14],
    b: [-1.50, -0.95, -0.18, -0.86, 0.04, -0.16],
    c: [-1.10, -0.55, -0.60, -0.48, 0.06, -0.06] },
  { name: 'Tusukan', dur: 0.56, wind: 0.34, hit: 0.54, lunge: 1.0, reach: 1.4,
    a: [-0.50, 0.90, -2.05, 0.58, -0.18, 0.16],
    b: [-1.66, 0.08, -0.04, -0.10, 0.26, -0.04],
    c: [-1.40, 0.16, -0.35, -0.04, 0.14, 0.0] },
];
const DRAW_TIME = 0.26;
const CHAIN = 0.3;      // seconds after a hit in which the next swing chains
const SHEATH_IDLE = 2.6;
const REST = [0.35, 0.16, -0.30, 0, 0, 0];

const ease = (u) => u * u * (3 - 2 * u);
const snap = (u) => 1 - (1 - u) ** 3;
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

export class SaberCombo {
  constructor(mech) {
    this.mech = mech;
    this.trail = new BladeTrail(mech.group, mech.mats.glow.color?.getHex?.() ?? 0xffffff);
    this.pose = REST.slice();
    this.step = -1;
    this.t = 0;
    this.queued = false;
    this.drawT = 0;
    this.sheathed = true;
    this.idle = 0;
    this.freeze = 0;
    this.hitNow = false;
    this.lunge = 0;
    this.onStep = null;
    this.lit = 0;
    mech.sheathSaber(true);
  }

  get swinging() { return this.step >= 0; }
  // True when start() would be accepted: idle, or past the hit of a step that can still chain.
  get canSwing() {
    if (this.step < 0) return true;
    return !this.queued && this.t >= this.spec.hit && this.step < STEPS.length - 1;
  }
  get active() { return this.step >= 0 || this.drawT > 0; }
  get spec() { return STEPS[Math.max(0, this.step)]; }

  // Returns true when the swing (or the chained follow-up) was accepted.
  start() {
    this.idle = 0;
    if (this.step < 0) { this.begin(0); return true; }
    if (this.queued || this.t < this.spec.hit) return false;
    this.queued = true;
    return true;
  }

  begin(i) {
    this.step = i;
    this.t = 0;
    this.queued = false;
    this.landed = false;
    this.from = this.pose.slice();
    this.onStep?.(i, STEPS[i]);
  }

  // Freeze the arc for a moment when the blade bites into something.
  impact() {
    this.freeze = 0.075;
  }

  update(dt) {
    this.hitNow = false;
    if (this.freeze > 0) { this.freeze -= dt; this.sample(); return; }
    this.drawTick(dt);
    if (this.step < 0) { this.rest(dt); return; }
    this.t += dt / this.spec.dur;
    this.arc();
    this.apply();
    this.sample();
    if (this.t >= 1) this.finish();
  }

  // Reach over the shoulder, grab the hilt, ignite. Sheathes itself again after a lull.
  drawTick(dt) {
    if (this.step >= 0 || this.queued) this.drawT = Math.min(1, this.drawT + dt / DRAW_TIME);
    else {
      this.idle += dt;
      if (this.idle > SHEATH_IDLE) this.drawT = Math.max(0, this.drawT - dt / DRAW_TIME);
    }
    const want = this.drawT < 0.5;
    if (want !== this.sheathed) { this.sheathed = want; this.mech.sheathSaber(want); }
    this.lit = this.sheathed ? Math.max(0, this.lit - dt * 6) : Math.min(1, this.lit + dt * 9);
    this.mech.setSaber(this.lit);
  }

  arc() {
    const s = this.spec, u = Math.min(1, this.t);
    if (u < s.wind) this.blend(this.from, s.a, ease(u / s.wind));
    else if (u < s.hit) {
      const k = (u - s.wind) / (s.hit - s.wind);
      this.blend(s.a, s.b, snap(k));
      this.lunge = Math.sin(Math.PI * k);
      if (!this.landed && k > 0.6) { this.landed = true; this.hitNow = true; }
    } else {
      this.blend(s.b, s.c, ease((u - s.hit) / (1 - s.hit)));
      this.lunge = 0;
    }
  }

  blend(from, to, k) {
    for (let i = 0; i < 6; i++) this.pose[i] = from[i] + (to[i] - from[i]) * k;
  }

  // Settle back to a ready stance and let the trail die out.
  rest(dt) {
    const k = Math.min(1, dt * 7);
    for (let i = 0; i < 6; i++) this.pose[i] += (REST[i] - this.pose[i]) * k;
    this.lunge = 0;
    if (this.drawT > 0.5) this.apply();
    this.trail.fade(dt);
  }

  apply() {
    const arm = this.mech.arms[0], p = this.pose, drawn = this.drawT;
    const reach = (1 - drawn) * 1.0;
    arm.upper.rotation.x = p[0] * drawn + reach * 0.9;
    arm.upper.rotation.z = p[1] * drawn + reach * 0.55;
    arm.fore.rotation.x = p[2] * drawn - reach * 2.1;
    if (this.step < 0) return;
    const t = this.mech.torso;
    t.rotation.y = p[3];
    t.rotation.x = p[4];
    t.rotation.z = p[5];
  }

  // One trail sample per frame from the live blade position, in the mech's own space.
  sample() {
    if (this.step < 0 || this.lit < 0.5) { this.trail.fade(0.016); return; }
    this.mech.group.updateMatrixWorld(true);
    this.mech.saberBase(_a);
    this.mech.saberTip(_b);
    this.trail.push(this.mech.group.worldToLocal(_a), this.mech.group.worldToLocal(_b));
  }

  finish() {
    const chained = this.queued && this.step < STEPS.length - 1;
    this.mech.torso.rotation.z = 0;
    if (chained) { this.begin(this.step + 1); return; }
    this.step = -1;
    this.queued = false;
    this.idle = 0;
    this.chain = CHAIN;
  }

  dispose() {
    this.trail.dispose();
  }
}

export const SABER_STEPS = STEPS.length;
