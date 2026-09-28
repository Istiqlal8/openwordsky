// What the space and the surface mech gun controllers share: the selected weapon, the trigger
// map, the muzzle work, the camera kick and the pose control block. The two subclasses only have
// to turn a trigger into damage through their own world's existing path.
import * as THREE from 'three';
import { Loadout } from './mech-loadout.js';
import { MuzzleFx } from './mech-muzzle.js';
import { SABER, GATLING, CANNON, BAZOOKA } from './mech-weapons.js';
import { weaponSfx, swapSfx, spinUpSfx, chargeSfx, overheatSfx, ignightSfx, saberSfx } from './mech-sfx.js';

const _v = new THREE.Vector3();
const _b = new THREE.Vector3();

export class MechGuns {
  constructor(mech, sfx) {
    this.mech = mech;
    this.sfx = sfx;
    this.load = new Loadout((m) => this.swapped(m));
    this.muzzles = [new THREE.Vector3()];
    this.pads = [new THREE.Vector3(), new THREE.Vector3()];
    this.ctl = { hold: 'rifle', aiming: false, pitch: 0, yawErr: 0, charge: 0, bodyYaw: 0 };
    this.hudState = { index: 0, name: '', short: '', gauge: 'heat', value: 0, ammo: -1,
      locked: false, reload: 0, spin: 0, swap: 0 };
    this.fx = null;
    this.spinCue = false;
    this.chargeCue = false;
    this.onShake = null;
    this.onFov = null;
  }

  get weapon() { return this.load.mode.name; }
  get mode() { return this.load.mode; }
  // World size of one mech height: every effect is sized against it so space and surface match.
  get unit() { return this.mech.design.d.H * (this.mech.group.scale.x || 1); }

  attachFx(root) {
    if (this.fxRoot === root) return;
    this.fx?.dispose();
    this.fxRoot = root;
    this.fx = root ? new MuzzleFx(root) : null;
  }

  swapped(mode) {
    this.mech.setWeapon(mode.id);
    swapSfx(this.sfx);
  }

  // Trigger map: LMB fires the selected mode (or swings when the saber is selected),
  // RMB is always the missile pod, middle mouse is always the saber.
  inputs(input) {
    const saber = this.load.id === SABER;
    this.fireHeld = input.mouseDown(0) && !saber;
    this.fireClick = input.clicked(0) && !saber;
    this.podHeld = input.mouseDown(2);
    this.podClick = input.clicked(2);
    this.swingNow = input.clicked(1) || (saber && input.clicked(0));
    return this.fireHeld;
  }

  // Cues that depend only on the loadout state, not on the world.
  cues(dt) {
    const m = this.load.mode;
    this.mech.rack.spinBarrels(dt, this.load.spin);
    if (m.id === CANNON) this.mech.rack.setCharge(this.load.charge);
    else this.mech.rack.setHeat(this.load.st.heat);
    const spinning = m.id === GATLING && this.load.spin > 0.02;
    if (spinning && !this.spinCue) spinUpSfx(this.sfx);
    this.spinCue = spinning;
    const charging = m.id === CANNON && this.load.charge > 0.02 && this.load.charge < 1;
    if (charging && !this.chargeCue) chargeSfx(this.sfx, m.charge);
    this.chargeCue = charging;
  }

  // One shot left the barrel: flash, smoke, casing, backblast, recoil and camera kick.
  fired(pose, mode, from, dir, worldFx, gravity = 0) {
    const u = this.unit;
    this.fx?.flash(from, dir, u * mode.flashSize, mode.flash);
    worldFx?.puff(from, 0x6b6e78, u * mode.flashSize * 3.5, 0.55);
    if (mode.backblast) this.backblast(dir, worldFx, u, mode);
    if (mode.casings) this.eject(dir, u, gravity);
    pose?.kick(mode.recoil);
    pose && (pose.aimT = 1);
    this.onShake?.(mode.cam.shake);
    this.onFov?.(mode.cam.fov);
    weaponSfx(this.sfx, mode.id);
    if (this.load.spend(mode.id)) overheatSfx(this.sfx);
  }

  backblast(dir, worldFx, u, mode) {
    this.mech.gunVent(_v);
    this.fx?.blast(_v, _b.copy(dir).negate(), u * mode.flashSize, 0xffb060);
    worldFx?.puff(_v, 0x8c8a86, u * 0.6, 1.1);
    worldFx?.sparks(_v, 0xffa040, 8, u * 0.12);
  }

  eject(dir, u, gravity) {
    this.mech.gunEject(_v);
    _b.set(-dir.z, 0.35, dir.x).normalize();
    this.fx?.casing(_v, _b, u * 0.035, gravity);
  }

  // Beam weapons report per frame instead of per shot.
  sustained(dt, pose, mode) {
    pose && (pose.aimT = 1);
    this.onShake?.(mode.cam.shake * dt);
    this.onFov?.(mode.cam.fov * Math.min(1, dt * 8));
    if (this.load.sustain(dt)) overheatSfx(this.sfx);
  }

  // Pose control block: what mech-aim.js needs to drive the body this frame.
  ctlFor(pitch, yawErr, bodyYaw = 0) {
    const c = this.ctl, m = this.load.mode;
    c.bodyYaw = bodyYaw;
    c.hold = m.hold === 'melee' ? 'rifle' : m.hold;
    c.aiming = this.fireHeld || this.podHeld || this.load.charge > 0.02 || this.load.spin > 0.02;
    c.pitch = pitch;
    c.yawErr = yawErr;
    c.charge = this.load.charge;
    return c;
  }

  // Tries a saber swing; the caller pays for it. Returns the combo step that started.
  swing(pose, cost, spend) {
    if (!this.swingNow || !pose.combo.canSwing) return false;
    if (!spend(cost)) { this.sfx?.dryFire?.(); return false; }
    pose.combo.onStep ??= (i) => saberSfx(this.sfx, i);
    if (pose.combo.sheathed) ignightSfx(this.sfx);
    pose.startSwing();
    this.onShake?.(0.18);
    return true;
  }

  hud() { return this.load.hud(this.hudState); }

  tick(dt) {
    this.cues(dt);
    this.fx?.update(dt);
  }

  dispose() {
    this.load.dispose();
    this.fx?.dispose();
    this.fx = null;
    this.fxRoot = null;
  }
}

export { SABER, GATLING, CANNON, BAZOOKA };
