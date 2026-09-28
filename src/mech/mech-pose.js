// Mech animation: a biped walk/run cycle with IK feet planted on the terrain, a hovering flight
// pose for space, and the weapon layer (mech-aim.js for guns, mech-saber.js for the blade).
// Reuses the creature IK solver (src/view/life/anatomy/ik.js); nothing here allocates per frame.
import { solve2 } from '../view/life/anatomy/ik.js';
import { MechAim } from './mech-aim.js';
import { SaberCombo } from './mech-saber.js';

const BETA = 0.62;                   // fraction of the cycle a foot spends on the ground
const _sol = { hip: 0, knee: 0 };
const ease = (u) => u * u * (3 - 2 * u);
const approach = (a, b, dt, k) => a + (b - a) * (1 - Math.exp(-k * dt));
const IDLE_CTL = { hold: 'rifle', aiming: false, pitch: 0, yawErr: 0, charge: 0, bodyYaw: 0 };

export class MechPose {
  constructor(mech) {
    this.mech = mech;
    this.d = mech.design.d;
    this.phase = 0;
    this.move = 0;
    this.run = 0;
    this.lean = 0;
    this.bob = 0;
    this.brace = 0;      // 0..1 wide firing stance
    this.crouch = 0;     // 0..1 hips dropped, knees flexed
    this.hover = 0;      // clock for the idle and flight sway
    this.lean = 0;       // extra shoulder twist the flight pose asks mech-aim.js for
    this.stride = (this.d.thighL + this.d.shinL) * 0.62;
    this.contact = [false, false];
    this.onStep = null;
    this.aim = new MechAim(mech);
    this.combo = new SaberCombo(mech);
  }

  get aimT() { return this.aim.aimT; }
  set aimT(v) { this.aim.aimT = v; }

  // Walking on a planet. env: { speed, runSpeed, groundAt(x, z), root, airborne }.
  walk(dt, env) {
    const k = Math.min(1, env.speed / Math.max(1, env.runSpeed));
    this.move = approach(this.move, env.speed > 0.4 ? 1 : 0, dt, 8);
    this.run = approach(this.run, k, dt, 4);
    const strideNow = this.stride * (0.8 + 0.7 * this.run) * (1 - this.brace * 0.35);
    if (!env.airborne) this.phase = (this.phase + (dt * env.speed) / (strideNow * 2)) % 1;
    const dip = this.crouch * (this.d.thighL + this.d.shinL) * 0.24;
    this.bob = this.move * strideNow * 0.05 * Math.cos(this.phase * Math.PI * 4) - dip;
    for (let i = 0; i < 2; i++) this.stepLeg(i, env, strideNow);
    this.armSwing(dt);
    this.hover += dt;
    const still = (1 - this.move) * (1 - this.aimT);      // idle breathing, gone once it moves or aims
    const sway = Math.sin(this.hover * 1.15) * still;
    const lean = this.move * (0.05 + this.run * 0.14) + sway * 0.028;
    this.mech.torso.rotation.x = approach(this.mech.torso.rotation.x, lean, dt, 6);
    this.mech.torso.rotation.z = Math.sin(this.hover * 0.71) * 0.026 * still;
    this.mech.hips.rotation.y = approach(this.mech.hips.rotation.y, 0, dt, 6);
    for (const leg of this.mech.legs) leg.foot.rotation.z = approach(leg.foot.rotation.z, 0, dt, 6);
    this.lean = 0;
    this.mech.setBinders?.(0);
    this.mech.hips.position.y = this.d.hipY + this.bob + sway * this.d.hipY * 0.008;
  }

  // One leg: stance sweeps the planted foot back, swing carries it forward with a lift.
  stepLeg(i, env, stride) {
    const leg = this.mech.legs[i], d = this.d;
    const ph = (this.phase + (i ? 0.5 : 0)) % 1;
    let f, lift = 0, down = true;
    if (ph < BETA) f = stride * (0.5 - ph / BETA);
    else {
      const u = (ph - BETA) / (1 - BETA);
      f = stride * (ease(u) - 0.5);
      lift = Math.sin(Math.PI * u) * d.shinL * 0.45;
      down = false;
    }
    f *= this.move;
    const hx = leg.group.position.x;
    let ankleY;
    if (env.airborne) {                 // legs tucked under the body during a jet hop
      ankleY = d.hipY - (d.thighL + d.shinL) * 0.68;
      f = (i ? 0.25 : -0.1) * d.shinL;
    } else {
      const ground = env.groundAt(env.root.x + hx * env.cos - f * env.sin, env.root.z - hx * env.sin - f * env.cos);
      ankleY = ground + d.footH + lift * this.move - env.root.y;
    }
    solve2(d.thighL, d.shinL, f, ankleY - d.hipY - this.bob, 1, _sol);
    leg.group.rotation.x = _sol.hip;
    leg.group.rotation.z = leg.side * this.brace * 0.16;
    leg.shin.rotation.x = _sol.knee;
    leg.foot.rotation.x = -(_sol.hip + _sol.knee) - (down ? 0 : 0.35 * this.move);
    if (down && !this.contact[i] && this.move > 0.2 && !env.airborne) this.onStep?.(i);
    this.contact[i] = down;
  }

  // Arms counter-swing with the legs; the gun arm swings less and yields to aiming.
  armSwing(dt) {
    const s = Math.sin(this.phase * Math.PI * 2) * (0.35 + this.run * 0.35) * this.move
      + Math.sin(this.hover * 1.15) * 0.035 * (1 - this.move);
    for (let i = 0; i < 2; i++) {
      const arm = this.mech.arms[i], sign = i ? -1 : 1;
      const hold = i === 1 ? this.aim.aimT : Math.max(this.combo.drawT, this.aim.aimT * 0.6);
      arm.upper.rotation.x = approach(arm.upper.rotation.x, sign * s * (1 - hold), dt, 12);
      arm.upper.rotation.z = approach(arm.upper.rotation.z, -arm.side * (0.1 + this.run * 0.06) * (1 - hold), dt, 8);
      arm.fore.rotation.x = approach(arm.fore.rotation.x, -0.25 - 0.2 * this.move * (1 - hold), dt, 10);
    }
  }

  // Flying. Hovering, the legs hang bent and sway; under power they trail out behind with the feet
  // pointed like a diver's and the arms fold in against the body. `att` is the FlightAttitude that
  // is also pitching the whole frame over — drive 0..1 is speed, boost 0..1 is the hard run.
  fly(dt, thrust, att = null) {
    const d = this.d, spread = this.brace;
    const drive = att ? att.drive : thrust, boost = att ? att.boost : 0;
    const lat = att ? att.lat : 0;
    this.move = approach(this.move, 0, dt, 6);
    this.hover += dt;
    const idle = 1 - drive;
    const sway = Math.sin(this.hover * 0.9), roll = Math.sin(this.hover * 1.31 + 1.1);
    this.flyLegs(dt, drive, boost, spread, idle, lat);
    this.flyArms(dt, drive, boost, sway, lat);
    this.lean = -lat * 0.6;                     // mech-aim.js twists the shoulders onto it
    this.mech.hips.rotation.y = approach(this.mech.hips.rotation.y, lat * 0.32, dt, 6);
    this.mech.setBinders?.(att ? att.splay : 0);
    const t = this.mech.torso;
    t.rotation.x = approach(t.rotation.x, 0.12 + drive * 0.34 + boost * 0.16 - this.crouch * 0.3 + sway * 0.03 * idle, dt, 4);
    t.rotation.z = roll * 0.035 * idle * (1 - this.aimT);
    if (this.aimT < 0.01) this.mech.head.rotation.x = approach(this.mech.head.rotation.x, -drive * 0.3, dt, 5);
    this.mech.hips.position.y = approach(this.mech.hips.position.y,
      d.hipY - this.crouch * d.hipY * 0.16 + sway * d.hipY * 0.012 * idle, dt, 6);
  }

  // Hover: knees up, ankles relaxed, a lazy alternating sway. Boost: legs straight out behind,
  // toes pointed, dead still.
  flyLegs(dt, drive, boost, spread, idle, lat) {
    for (const leg of this.mech.legs) {
      const beat = Math.sin(this.hover * 1.17 + (leg.side > 0 ? 0 : 1.7)) * 0.13 * idle;
      const k = Math.max(-1, Math.min(1, leg.side * lat));   // +1 on the side it is breaking toward
      const hip = -(0.30 + drive * 0.52 + boost * 0.26) - spread * 0.3 + beat + k * 0.95;
      const knee = 0.86 - drive * 0.46 - boost * 0.22 + spread * 0.55 - beat * 0.6
        + Math.max(0, k) * 1.0 - Math.max(0, -k) * 0.5;      // lead knee folds up, trail leg extends
      leg.group.rotation.x = approach(leg.group.rotation.x, hip, dt, 5);
      leg.group.rotation.z = approach(leg.group.rotation.z,
        leg.side * (0.07 * idle + spread * 0.26) + lat * 0.26, dt, 5);
      leg.shin.rotation.x = approach(leg.shin.rotation.x, knee, dt, 5);
      leg.foot.rotation.x = approach(leg.foot.rotation.x, -(0.5 + drive * 0.5 + boost * 0.25) + k * 0.4, dt, 5);
      leg.foot.rotation.z = approach(leg.foot.rotation.z, -lat * 0.3, dt, 5);
    }
  }

  // Arms are free and a little out while hovering, folded in tight at speed; aiming always wins.
  flyArms(dt, drive, boost, sway, lat) {
    const wide = Math.abs(lat);
    for (let i = 0; i < 2; i++) {
      const arm = this.mech.arms[i], hold = i ? this.aim.aimT : Math.max(this.combo.drawT, this.aim.aimT * 0.6);
      const free = 1 - hold, tuck = Math.min(1, drive + boost * 0.5);
      const k = Math.max(-1, Math.min(1, arm.side * lat));   // the two arms never mirror each other
      arm.upper.rotation.x = approach(arm.upper.rotation.x,
        (0.18 + tuck * 0.2 + sway * 0.05 * (1 - tuck) - k * 0.55) * free, dt, 6);
      arm.upper.rotation.z = approach(arm.upper.rotation.z,
        -arm.side * (0.26 - tuck * 0.2 + wide * 1.15) * free, dt, 6);   // thrown wide in a break
      arm.fore.rotation.x = approach(arm.fore.rotation.x,
        (-0.5 - tuck * 0.75 * (1 - wide * 0.75) + k * 0.34) * free, dt, 6);
    }
  }

  // Weapon layer; call after walk()/fly() so it wins. ctl comes from the gun controller.
  weapons(dt, ctl = IDLE_CTL) {
    this.combo.update(dt);
    if (this.combo.swinging) {
      this.aim.release();
      this.brace = approach(this.brace, 0.3, dt, 8);
      this.crouch = approach(this.crouch, 0.12 + this.combo.lunge * 0.2, dt, 8);
      return;
    }
    this.aim.apply(dt, this, ctl);
  }

  kick(amount) { this.aim.kick(amount); }

  startSwing() { return this.combo.start(); }
  saberImpact() { this.combo.impact(); }

  get swinging() { return this.combo.swinging; }
  get swingHit() { return this.combo.hitNow; }
  get swingStep() { return Math.max(0, this.combo.step); }
  get lunge() { return this.combo.lunge; }

  dispose() { this.combo.dispose(); }
}
