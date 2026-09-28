// How the mech carries itself in the air. Raw velocity in, flying attitude out: nose down into the
// run, nearly horizontal at full boost, banking through turns, leaning into a strafe and rearing
// back on the brakes. Every axis is a spring, so the frame overshoots a little and settles instead
// of snapping — and a hover never sits perfectly still. Allocates nothing per frame.
//
// The controllers feed the result to mech.group (pitch / yaw / roll), to the thruster flare and to
// MechPose.fly(), which reads `drive` and `boost` to trail the legs and tuck the arms.
const LEAN = 0.36;              // nose-down at cruise
const LEAN_BOOST = 0.82;        // ...and on top of it at full boost: the superhero lean
const PITCH_MAX = 1.24;
const ROLL_TURN = 0.62;
const ROLL_STRAFE = 0.66;
const YAW_STRAFE = 0.26;
const SPRING = 84, DAMP = 12;   // under-damped on purpose: weight, overshoot and recovery

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (a, b, dt, k) => a + (b - a) * (1 - Math.exp(-k * dt));

export class FlightAttitude {
  constructor() {
    this.pitch = 0; this.roll = 0; this.yaw = 0;
    this.vp = 0; this.vr = 0; this.vy = 0;
    this.drive = 0; this.boost = 0; this.air = 0; this.lat = 0; this.run = 0;
    this.t = Math.random() * 10;
    this.last = 0;
    this.pop = 0;               // 0..1 kick when the boost first bites
    this.wasBoost = 0;
  }

  // Thruster level: idle glow while hovering, long plumes once it is moving.
  get flare() { return Math.min(1, 0.16 + this.drive * 0.6 + this.boost * 0.55); }
  // Hover drift, in mech heights, so the frame is never dead still in the air.
  get bob() { return Math.sin(this.t * 1.6) * 0.022 * (1 - this.drive) * this.air; }
  // Nozzles swing against the lean, so the exhaust still points behind the direction of travel.
  get nozzle() { return -this.pitch * 0.6; }
  get streak() { return this.drive * this.drive * this.air; }
  // How far the wing binders throw open: wide in a hard lateral break, tucked cruising straight.
  get splay() { return Math.min(1, Math.abs(this.lat) * 1.35 + this.boost * 0.25) * this.air; }

  // f: { fwd, side, climb, cap, boost, turn, air } — fwd/side/climb are world units per second,
  // `turn` is the frame's yaw rate in rad/s and `air` is false the moment the feet are down.
  update(dt, f) {
    this.t += dt;
    const cap = Math.max(1, f.cap);
    const run = clamp(f.fwd / cap, -1, 1);
    const side = clamp(f.side / cap, -1, 1);
    const rise = clamp(f.climb / (cap * 0.7), -1, 1);
    this.air = approach(this.air, f.air ? 1 : 0, dt, 7);
    const push = Math.min(1, Math.hypot(run, side));        // speed in any direction, not just ahead
    this.drive = approach(this.drive, push, dt, 3.2);
    this.run = approach(this.run, run, dt, 3.2);             // signed, forward only: the nose-down lean
    this.lat = approach(this.lat, side * this.air, dt, 4);   // signed strafe: drives the broken stance
    const on = f.boost ? 1 : 0;
    if (on && !this.wasBoost) this.pop = 1;
    this.wasBoost = on;
    this.pop = Math.max(0, this.pop - dt * 2.4);
    this.boost = approach(this.boost, on * push, dt, 2.6);
    const brake = clamp((this.last - f.fwd) / (cap * Math.max(dt, 1e-3)), 0, 1);
    this.last = f.fwd;
    this.aim(dt, side, rise, brake, f.turn ?? 0);
  }

  // Spring each axis toward the attitude the velocity is asking for.
  aim(dt, side, rise, brake, turn) {
    const lean = LEAN * Math.abs(this.run) + LEAN_BOOST * this.boost;
    const pitchT = this.air * (-lean * (this.run < -0.02 ? -1 : 1) + rise * 0.44 + brake * 0.62 - 0.06);
    const rollT = this.air * (-side * ROLL_STRAFE - clamp(turn, -2.5, 2.5) * ROLL_TURN);
    const yawT = this.air * (-side * YAW_STRAFE);
    this.vp += (-(this.pitch - clamp(pitchT, -PITCH_MAX, PITCH_MAX)) * SPRING - this.vp * DAMP) * dt;
    this.vr += (-(this.roll - rollT) * SPRING - this.vr * DAMP) * dt;
    this.vy += (-(this.yaw - yawT) * SPRING - this.vy * DAMP) * dt;
    this.pitch = clamp(this.pitch + this.vp * dt, -PITCH_MAX, PITCH_MAX);
    this.roll += this.vr * dt;
    this.yaw += this.vy * dt;
  }

  // Back to standing: called the moment the mech lands or folds away.
  reset() {
    this.pitch = this.roll = this.yaw = 0;
    this.vp = this.vr = this.vy = 0;
    this.drive = this.boost = this.air = this.pop = this.lat = this.run = 0;
  }
}
