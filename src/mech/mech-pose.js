// Mech animation: a biped walk/run cycle with IK feet planted on the terrain, a hovering flight
// pose for space, and the weapon layer (mech-aim.js for guns, mech-saber.js for the blade).
// Reuses the creature IK solver (src/view/life/anatomy/ik.js); nothing here allocates per frame.
import { solve2 } from '../view/life/anatomy/ik.js';
import { MechAim } from './mech-aim.js';
import { SaberCombo } from './mech-saber.js';

const BETA = 0.62;                   // fraction of the cycle a foot spends on the ground
const PLANT = 0.22;                  // how much wider the leading foot plants in a sidestep
// Mechanical limits. Without them a foot target on a rock above the hip folds the leg double and
// the skinned mesh tears; these are the angles the frame can actually reach.
const ROLL_MAX = 0.42;               // hip abduction
const HIP_MIN = -1.25, HIP_MAX = 1.4;
const KNEE_MIN = -2.1, KNEE_MAX = 0.05;
const STAND = 0.55;                  // a foot never climbs closer than this fraction of the reach
const _sol = { hip: 0, knee: 0 };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
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
    this.side = 0;       // smoothed lateral movement, +1 = stepping to its own right
    this.back = 0;       // smoothed reverse walk
    this.contact = [false, false];
    this.onStep = null;
    this.aim = new MechAim(mech);
    this.combo = new SaberCombo(mech);
  }

  get aimT() { return this.aim.aimT; }
  set aimT(v) { this.aim.aimT = v; }

  // Walking on a planet. env: { speed, runSpeed, groundAt(x, z), root, airborne, fwd, side } —
  // fwd/side are the movement direction in the mech's own frame (+side is its right), so a strafe
  // steps sideways instead of playing the forward march while the body slides.
  walk(dt, env) {
    const k = Math.min(1, env.speed / Math.max(1, env.runSpeed));
    const side = env.side ?? 0, fwd = env.fwd ?? 1;
    this.move = approach(this.move, env.speed > 0.4 ? 1 : 0, dt, 8);
    this.run = approach(this.run, k, dt, 4);
    this.side = approach(this.side, side * this.move, dt, 6);
    this.back = approach(this.back, Math.max(0, -fwd) * this.move, dt, 6);
    const strideNow = this.stride * (0.8 + 0.7 * this.run) * (1 - this.brace * 0.35) * (1 - this.back * 0.32);
    if (!env.airborne) this.phase = (this.phase + (dt * env.speed) / (strideNow * 2)) % 1;
    const dip = this.crouch * (this.d.thighL + this.d.shinL) * 0.24;
    this.bob = this.move * strideNow * 0.05 * Math.cos(this.phase * Math.PI * 4) - dip;
    for (let i = 0; i < 2; i++) this.stepLeg(i, env, strideNow, fwd, side);
    this.armSwing(dt);
    this.groundBody(dt);
  }

  // Everything above the hips while the feet are down: breathing at rest, lean into the pace, and
  // the hip / shoulder counter-rotation that makes a sidestep read as a sidestep.
  groundBody(dt) {
    this.hover += dt;
    const lat = this.side, m = this.mech;
    const still = (1 - this.move) * (1 - this.aimT);      // idle breathing, gone once it moves or aims
    const sway = Math.sin(this.hover * 1.15) * still;
    const lean = this.move * (0.05 + this.run * 0.14) + sway * 0.028 + this.back * 0.2;
    m.torso.rotation.x = approach(m.torso.rotation.x, lean, dt, 6);
    m.torso.rotation.z = Math.sin(this.hover * 0.71) * 0.026 * still - lat * 0.1;
    m.hips.rotation.y = approach(m.hips.rotation.y, lat * 0.38, dt, 7);
    this.lean = -lat * 0.46;                              // mech-aim.js twists the shoulders back
    m.setWings?.(dt, Math.abs(lat) * 0.6 + this.back * 0.4, this.move * (0.3 + this.run * 0.7), 0);
    m.hips.position.y = this.d.hipY + this.bob + sway * this.d.hipY * 0.008 - Math.abs(lat) * this.d.hipY * 0.03;
  }

  // One leg. The step travels along the movement direction in the mech's own frame: stance sweeps
  // the planted foot against it, swing carries the foot along it with a lift. Sideways, the leading
  // leg also reaches out and plants wide while the trailing one draws in under the body.
  stepLeg(i, env, stride, fwd, side) {
    const leg = this.mech.legs[i], d = this.d, reach = d.thighL + d.shinL;
    const ph = (this.phase + (i ? 0.5 : 0)) % 1;
    const swing = ph >= BETA, u = swing ? (ph - BETA) / (1 - BETA) : 0;
    let travel = swing ? stride * (ease(u) - 0.5) : stride * (0.5 - ph / BETA);
    const lift = swing ? Math.sin(Math.PI * u) * d.shinL * 0.45 : 0;
    travel *= this.move;
    const lead = clamp(leg.side * side, -1, 1);
    let dx = clamp(travel * side + side * stride * PLANT * lead * this.move, -reach * 0.38, reach * 0.38);
    let dz = travel * fwd;
    let ankleY;
    if (env.airborne) {                 // legs tucked under the body during a jet hop
      ankleY = d.hipY - reach * 0.68;
      dz = (i ? 0.25 : -0.1) * d.shinL;
      dx = 0;
    } else {
      const fx = leg.group.position.x + dx;
      const ground = env.groundAt(env.root.x + fx * env.cos - dz * env.sin, env.root.z - fx * env.sin - dz * env.cos);
      ankleY = ground + d.footH + lift * this.move - env.root.y;
    }
    const roll = this.solveLeg(dx, dz, Math.min(ankleY - d.hipY - this.bob, -reach * STAND), reach);
    leg.group.rotation.x = clamp(_sol.hip, HIP_MIN, HIP_MAX);
    leg.group.rotation.z = leg.side * this.brace * 0.16 + roll;
    leg.shin.rotation.x = clamp(_sol.knee, KNEE_MIN, KNEE_MAX);
    leg.foot.rotation.x = -(_sol.hip + _sol.knee) - (swing ? 0.35 * this.move : 0);
    leg.foot.rotation.z = -this.side * 0.34;      // ankles roll with the sidestep
    if (!swing && !this.contact[i] && this.move > 0.2 && !env.airborne) this.onStep?.(i);
    this.contact[i] = !swing;
  }

  // Abduct the hip toward the foot, then solve the rest inside the leg's own swing plane, with the
  // target pulled inside the leg's reach. Fills _sol and returns the abduction. -> roll
  solveLeg(dx, dz, dy, reach) {
    const roll = clamp(Math.atan2(dx, -dy), -ROLL_MAX, ROLL_MAX);
    const c = Math.cos(roll), s = Math.sin(roll);
    let inY = -dx * s + dy * c;
    let inZ = dz;
    const len = Math.hypot(inZ, inY);
    if (len > reach * 0.985) { const q = (reach * 0.985) / len; inZ *= q; inY *= q; }
    solve2(this.d.thighL, this.d.shinL, inZ, inY, 1, _sol);
    return roll;
  }

  // Arms counter-swing with the legs; the gun arm swings less and yields to aiming. In a sidestep
  // they stop mirroring each other: the leading arm opens out, the trailing one crosses the chest.
  armSwing(dt) {
    const lat = this.side, wide = Math.abs(lat);
    const s = Math.sin(this.phase * Math.PI * 2) * (0.35 + this.run * 0.35) * this.move
      + Math.sin(this.hover * 1.15) * 0.035 * (1 - this.move);
    for (let i = 0; i < 2; i++) {
      const arm = this.mech.arms[i], sign = i ? -1 : 1;
      const k = clamp(arm.side * lat, -1, 1);
      const hold = i === 1 ? this.aim.aimT : Math.max(this.combo.drawT, this.aim.aimT * 0.6);
      arm.upper.rotation.x = approach(arm.upper.rotation.x, (sign * s - k * 0.34 * wide) * (1 - hold), dt, 12);
      arm.upper.rotation.z = approach(arm.upper.rotation.z,
        -arm.side * (0.1 + this.run * 0.06 + k * 0.62 * wide) * (1 - hold), dt, 8);
      arm.fore.rotation.x = approach(arm.fore.rotation.x,
        -0.25 - (0.2 * this.move + Math.max(0, -k) * 0.85 * wide) * (1 - hold), dt, 10);
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
    this.lean = -lat * 0.32;                    // mech-aim.js twists the shoulders onto it
    this.mech.hips.rotation.y = approach(this.mech.hips.rotation.y, lat * 0.2, dt, 6);
    this.mech.setWings?.(dt, att ? att.splay : 0, drive, boost);
    const t = this.mech.torso;
    t.rotation.x = approach(t.rotation.x, 0.1 + drive * 0.2 + boost * 0.1 - this.crouch * 0.3 + sway * 0.03 * idle, dt, 4);
    t.rotation.z = roll * 0.035 * idle * (1 - this.aimT);
    if (this.aimT < 0.01) this.mech.head.rotation.x = approach(this.mech.head.rotation.x, -drive * 0.18, dt, 5);
    this.mech.hips.position.y = approach(this.mech.hips.position.y,
      d.hipY - this.crouch * d.hipY * 0.16 + sway * d.hipY * 0.012 * idle, dt, 6);
  }

  // Hover: knees up, ankles relaxed, a lazy alternating sway. Boost: legs straight out behind,
  // toes pointed, dead still.
  flyLegs(dt, drive, boost, spread, idle, lat) {
    for (const leg of this.mech.legs) {
      const beat = Math.sin(this.hover * 1.17 + (leg.side > 0 ? 0 : 1.7)) * 0.13 * idle;
      const k = Math.max(-1, Math.min(1, leg.side * lat));   // +1 on the side it is breaking toward
      const hip = -(0.22 + drive * 0.38 + boost * 0.16) - spread * 0.24 + beat + k * 0.42;
      const knee = 0.5 - drive * 0.26 - boost * 0.12 + spread * 0.4 - beat * 0.6
        + Math.max(0, k) * 0.5 - Math.max(0, -k) * 0.24;     // lead knee folds up, trail leg extends
      leg.group.rotation.x = approach(leg.group.rotation.x, hip, dt, 5);
      leg.group.rotation.z = approach(leg.group.rotation.z,
        leg.side * (0.05 * idle + spread * 0.2) + lat * 0.13, dt, 5);
      leg.shin.rotation.x = approach(leg.shin.rotation.x, knee, dt, 5);
      leg.foot.rotation.x = approach(leg.foot.rotation.x, -(0.34 + drive * 0.3 + boost * 0.14) + k * 0.2, dt, 5);
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
