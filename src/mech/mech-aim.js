// Firing animation. Everything the mech visibly does while shooting lives here: the torso twists
// onto the aim line, the gun arm tracks the crosshair, a recoil spring kicks the arm and rocks the
// torso back, the free hand comes up to support heavy weapons and the legs brace and flex.
// Drives bones only — no scene objects, no allocation per frame.
//
// Arm kinematics: the weapon points down the hand's -Z, which is the mech's forward only when
// shoulder.x + elbow.x is zero. So each pose is stored as a shoulder angle and the elbow that
// cancels it, and the aim pitch is then split evenly between the two joints.

// [rShoulder, rElbow, rSpread, lShoulder, lElbow, lSpread, twist, brace, crouch, kick]
// Spread is positive away from the body, so the gun arm clears the torso silhouette; the support
// hand uses a negative spread to reach across onto the weapon.
const HOLD = {
  rifle: [1.16, -1.16, 0.46, 0, 0, 0, 0.12, 0.10, 0.02, 0.55],
  shoulder: [2.45, -2.45, 0.34, 1.35, -1.35, -0.58, 0.34, 0.60, 0.16, 1.0],
  braced: [1.34, -1.34, 0.42, 1.50, -1.50, -0.52, 0.18, 0.90, 0.24, 0.35],
  charge: [1.42, -1.42, 0.40, 1.42, -1.42, -0.46, 0.0, 1.0, 0.40, 0.25],
};
const SUPPORT = { shoulder: 1, braced: 1, charge: 1 };
const approach = (a, b, dt, k) => a + (b - a) * (1 - Math.exp(-k * dt));

export class MechAim {
  constructor(mech) {
    this.mech = mech;
    this.aimT = 0;
    this.r = 0;        // recoil spring position
    this.rv = 0;
    this.hold = 'rifle';
    this.mix = 1;      // blend between the last hold and the current one
    this.prev = HOLD.rifle;
    this.cur = HOLD.rifle;
    this.twist = 0;
    this.blend = HOLD.rifle.slice();
  }

  // One impulse into the recoil spring; `amount` comes from the weapon's `recoil`.
  kick(amount) {
    this.rv += amount * 62;
  }

  setHold(hold) {
    if (hold === this.hold) return;
    this.prev = this.blend.slice();
    this.cur = HOLD[hold] ?? HOLD.rifle;
    this.hold = hold;
    this.mix = 0;
  }

  spring(dt) {
    this.rv += (-this.r * 900 - this.rv * 44) * dt;
    this.r += this.rv * dt;
    if (Math.abs(this.r) < 1e-4 && Math.abs(this.rv) < 1e-2) { this.r = 0; this.rv = 0; }
  }

  // ctl: { hold, aiming, pitch, yawErr, charge }
  apply(dt, pose, ctl) {
    this.setHold(ctl.hold);
    this.spring(dt);
    this.aimT = approach(this.aimT, ctl.aiming ? 1 : 0, dt, ctl.aiming ? 16 : 5);
    this.mix = Math.min(1, this.mix + dt * 7);
    const t = this.mix * this.mix * (3 - 2 * this.mix);
    for (let i = 0; i < 10; i++) this.blend[i] = this.prev[i] + (this.cur[i] - this.prev[i]) * t;
    this.twistTick(dt, ctl, pose);
    if (this.aimT < 0.01) { pose.brace = 0; pose.crouch = 0; return; }
    this.arms(ctl);
    this.body(dt, pose, ctl);
  }

  // mech-space.js blades the whole frame so the chase camera sees the mech three-quarter instead
  // of straight up its back. The torso unwinds only part of that; the wrist takes the rest, which
  // keeps the barrel on the aim line while the body stays angled and readable.
  twistTick(dt, ctl, pose) {
    const yaw = ctl.bodyYaw ?? 0;
    const want = this.blend[6] * this.aimT - (ctl.yawErr ?? 0) * 0.55 - yaw * 0.3 - this.r * 0.3
      + (pose?.lean ?? 0);   // the flight pose twists the shoulders into a lateral break
    this.twist = approach(this.twist, want, dt, 9);
    this.mech.torso.rotation.y = this.twist;
    this.mech.head.rotation.y = -(this.twist + yaw) * 0.75;
    this.lead = -(this.twist + yaw);
    this.mech.arms[1].hand.rotation.y = this.lead * this.aimT;
  }

  arms(ctl) {
    const b = this.blend, a = this.aimT, r = this.r, k = b[9], p = ctl.pitch;
    const right = this.mech.arms[1];
    this.joint(right, b[0] + p * 0.5 - r * k * 0.8, b[1] + p * 0.5 + r * k * 1.5, right.side * (b[2] + r * k * 0.3), a);
    if (!SUPPORT[this.hold]) return;
    const left = this.mech.arms[0], m = a * Math.min(1, this.mix * 1.4);
    this.joint(left, b[3] + p * 0.4 - r * k * 0.5, b[4] + p * 0.4 + r * k * 1.0, left.side * b[5], m);
  }

  joint(arm, shoulder, elbow, roll, k) {
    arm.upper.rotation.x += (shoulder - arm.upper.rotation.x) * k;
    arm.upper.rotation.z += (roll - arm.upper.rotation.z) * k;
    arm.fore.rotation.x += (elbow - arm.fore.rotation.x) * k;
  }

  body(dt, pose, ctl) {
    const b = this.blend, a = this.aimT, r = this.r, m = this.mech;
    m.torso.rotation.x += (ctl.pitch * 0.16 + r * 0.5 - m.torso.rotation.x) * a;
    m.head.rotation.x = ctl.pitch * 0.4 * a;
    const charge = ctl.charge ?? 0;
    pose.brace = (b[7] + charge * 0.2) * a;
    pose.crouch = (b[8] + charge * 0.16) * a + Math.max(0, r) * 0.12;
  }

  // Called when the saber takes over the torso, so the twist does not fight the swing.
  release() {
    this.twist = 0;
    this.aimT = 0;
    this.r = 0;
    this.rv = 0;
  }
}
