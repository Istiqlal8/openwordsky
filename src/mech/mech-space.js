// The mech while flying inside a star system. It rides the ship's own flight rig (so the chase
// camera, collisions and the star system all keep working) but flies like a mecha: hovers,
// strafes, stops dead, turns hard and tops out well below the ship.
import { MechPose } from './mech-pose.js';
import { Transform } from './mech-transform.js';
import { MechSpaceGuns } from './mech-space-guns.js';
import { MorphFx } from './mech-morph-fx.js';
import { transformSfx } from './mech-sfx.js';
import { MechCamera } from './mech-camera.js';
import { FlightAttitude } from './mech-flight.js';
import * as THREE from 'three';

const SHIP_SCALE = 0.14;        // src/view/ship/ship-rig.js: model metres -> space units
const FRAME = 1.12;             // mech height relative to the ship's length on screen
const CRUISE = 46, BOOST = 190; // u/s, against the ship's 60 / 320
const STOP = 3.4;               // velocity damping when nothing is pressed (stop dead)
const FOV_KICK = 13;
const BODY_YAW = 0.45;          // hips bladed to the camera; the torso twists back onto the aim line
const MOVE_KEYS = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyR', 'KeyC'];
const BOOST_FOV = 9;            // the view widens as the frame leans into the run
const _mid = new THREE.Vector3();
const _world = new THREE.Vector3();
const _vel = new THREE.Vector3();
const _q = new THREE.Quaternion();

export class MechSpace {
  constructor({ space, player, sfx }) {
    Object.assign(this, { space, player, sfx });
    this.mech = null;
    this.pose = null;
    this.guns = null;
    this.tr = new Transform();
    this.cam = new MechCamera();
    this.att = new FlightAttitude();
    this.active = false;
  }

  get busy() { return this.tr.busy; }
  get weapon() { return this.guns?.weapon ?? '—'; }
  get weaponHud() { return this.guns?.hud() ?? null; }

  // Starts the unfolding sequence; the mech is live from the first frame.
  enter(mech, combat) {
    this.mech = mech;
    this.pose = new MechPose(mech);
    this.guns = new MechSpaceGuns(this.space, this.player, this.sfx, mech);
    this.guns.aimCamera = this.cam.aim;     // the crosshair ignores the free-look orbit
    this.guns.attach(combat);
    const rig = this.space.rig;
    this.shipScale = rig.model?.group.scale.x ?? 1; // the rig scales the model; restore it exactly
    this.wasCockpit = rig.mode === 'cockpit';
    if (this.wasCockpit) rig.toggleMode();
    this.scale = (SHIP_SCALE * (this.space.design?.parts?.length ?? 8) * FRAME) / mech.design.d.H;
    mech.group.scale.setScalar(this.scale);
    mech.setWorldScale(this.scale);
    // Off to the left and below the crosshair: the camera then sees the mech three-quarter from
    // behind, so the arm that holds the weapon reads instead of hiding behind the torso.
    const h = mech.design.d.H * this.scale;
    this.home = { x: -h * 0.46, y: -h * 0.74, z: -0.1 };
    mech.group.position.set(this.home.x, this.home.y, this.home.z);
    mech.group.rotation.set(0, BODY_YAW, 0);
    rig.ship.add(mech.group);
    this.baseFov = rig.baseFov;
    this.morph = new MorphFx(rig.ship, mech.design.palette?.glow ?? 0x9fd8ff);
    this.active = true;
    this.tr.t = 0;
    this.tr.start(1);
    transformSfx(this.sfx, true);
  }

  leave() {
    this.tr.start(-1);
    transformSfx(this.sfx, false);
  }

  // Called once the fold-back finishes (or on death / mode change).
  detach() {
    const rig = this.space.rig;
    this.mech?.group.removeFromParent();
    if (this.wasCockpit && rig.mode === 'chase') rig.toggleMode();
    if (rig.model) rig.model.group.visible = rig.mode === 'chase';
    if (rig.model) rig.model.group.scale.setScalar(this.shipScale ?? 1);
    if (rig.model) { rig.model.group.rotation.set(0, 0, 0); rig.model.setLegs?.(false); rig.model.setThrust?.(0); }
    this.morph?.dispose();
    this.morph = null;
    rig.baseFov = this.baseFov ?? rig.baseFov;
    this.att.reset();
    this.pose?.dispose();
    this.pose = null;
    this.guns?.dispose();
    this.guns = null;
    this.mech = null;
    this.active = false;
    this.tr.finish(false);
  }

  update(dt, input, combat) {
    if (!this.active) return;
    this.step(dt, input, combat);
    if (this.active) this.cam.space(this.space.rig.camera, this.space.rig, this.mech, this.mech.design.d.H * this.scale);
  }

  step(dt, input, combat) {
    this.guns.attach(combat);
    const rig = this.space.rig, tr = this.tr;
    this.cam.orbit.update(dt, input);
    this.cam.holdHeading(rig);
    this.cam.aim.position.copy(rig.camera.position);
    this.cam.aim.quaternion.copy(rig.camera.quaternion);
    tr.update(dt);
    this.applyTransform(rig, dt);
    if (tr.t <= 0 && !tr.busy) { this.detach(); return; }
    if (tr.t < 1) return;
    this.flight(dt, input);
    const thrust = MOVE_KEYS.some((k) => input.down(k)) ? 1 : 0;
    this.attitude(dt, input, rig, thrust);
    this.pose.fly(dt, thrust, this.att);
    this.pose.weapons(dt, this.guns.ctlFor(0, 0, BODY_YAW)); // pose first: the muzzle FX must match this frame
    this.guns.update(dt, input, this.pose);
    this.mech.sync?.();          // the GLB skin copies the rig it has just been posed into
    this.mech.setThrust(Math.min(1, thrust * 0.4 + this.att.flare), this.att.boost);
    this.mech.pack.group.rotation.x = this.att.nozzle;
  }

  // Velocity in the frame's own axes, then the attitude: pitch into the run, bank through turns.
  attitude(dt, input, rig, thrust) {
    _vel.copy(this.space.velocity).applyQuaternion(_q.copy(rig.ship.quaternion).invert());
    const turn = yawRate(rig.ship.quaternion, this.lastQ ??= rig.ship.quaternion.clone(), dt);
    this.lastQ.copy(rig.ship.quaternion);
    this.att.update(dt, { fwd: -_vel.z, side: _vel.x, climb: _vel.y, cap: BOOST * 0.55,
      boost: input.down('ShiftLeft') && thrust, turn, air: true });
    if (this.att.pop > 0.01) this.space.shake?.(this.att.pop * 0.5);
  }

  // The hull pitches up, spins, stretches and bursts; the mech spins out of the flash.
  applyTransform(rig, dt) {
    const tr = this.tr;
    if (rig.model) this.morphShip(rig, tr);
    this.mech.group.visible = tr.mechVisible;
    this.mech.setDeploy(tr.deploy);
    const a = this.att;
    this.mech.group.rotation.set(a.pitch, BODY_YAW + tr.spinIn + a.yaw, a.roll);
    this.slideHome(tr);
    if (tr.t < 1) this.mech.sync?.();   // update() returns early while the frame is still unfolding
    rig.baseFov = this.baseFov + tr.kick * FOV_KICK + tr.flash * 11 + a.boost * BOOST_FOV
      + a.pop * 5 + (this.guns?.fovPulse ?? 0);
    this.drawMorph(dt, tr);
  }

  morphShip(rig, tr) {
    const g = rig.model.group, k = Math.max(0.001, tr.shipScale) * (this.shipScale ?? 1);
    g.visible = tr.shipVisible && rig.mode === 'chase';
    g.scale.set(k, k, k * tr.shipStretch);
    g.rotation.set(-tr.shipPitch, 0, tr.shipSpin);
    rig.model.setLegs?.(tr.shipLegs);
    rig.model.setThrust?.(tr.charge);
  }

  // The mech is born where the hull was and slides out to its resting framing as it stands up.
  slideHome(tr) {
    const k = Math.max(0, Math.min(1, (tr.t - 0.5) / 0.42)), h = this.home;
    const e = k * k * (3 - 2 * k), unit = this.mech.design.d.H * this.scale;
    this.mech.group.position.set(h.x * e, -unit * 0.5 + (h.y + unit * 0.5) * e + this.att.bob * unit, h.z * e);
  }

  drawMorph(dt, tr) {
    if (!this.morph) return;
    const unit = this.mech.design.d.H * this.scale;
    _mid.copy(this.mech.group.position);
    _mid.y += unit * 0.5;
    _world.copy(_mid).applyMatrix4(this.space.rig.ship.matrixWorld);
    this.morph.update(dt, tr, _mid, unit, this.guns?.combat?.fx, _world);
    if (tr.burst) this.space.shake?.(0.9);
  }

  // Mecha flight: hard speed cap, and letting go of the sticks brings it to a full stop.
  flight(dt, input) {
    const v = this.space.velocity;
    const cap = input.down('ShiftLeft') ? BOOST : CRUISE;
    const len = v.length();
    if (len > cap) v.setLength(cap + (len - cap) * Math.exp(-5 * dt));
    if (!MOVE_KEYS.some((k) => input.down(k)) && !this.space.pulsing) v.multiplyScalar(Math.exp(-STOP * dt));
  }
}

export const MECH_SPACE_CAP = { CRUISE, BOOST };

// Signed yaw change between two frames, in rad/s: how hard the frame is turning.
function yawRate(now, prev, dt) {
  _q.copy(prev).invert().multiply(now);
  const y = 2 * Math.atan2(_q.y, _q.w);
  return Math.max(-3, Math.min(3, ((y + Math.PI * 3) % (Math.PI * 2) - Math.PI) / Math.max(dt, 1e-3)));
}
