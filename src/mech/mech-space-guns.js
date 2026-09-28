// Mech weapons in space. Every mode resolves through the existing SpaceGunHits of SpaceCombat
// (bolts, seeker rockets, hitscan beam), so pirates, asteroids and the raid bosses take damage
// with no changes on their side. Selection, poses and muzzle work live in mech-gun-base.js.
import * as THREE from 'three';
import { GunBattery } from '../ship-systems/gun-battery.js';
import { MechGuns } from './mech-gun-base.js';
import { SABER, POD, CANNON, modeById } from './mech-weapons.js';
import { cannonSfx, saberHitSfx } from './mech-sfx.js';
import { spend as spendPower } from './mech-power.js';

const LOCK_COS = Math.cos(THREE.MathUtils.degToRad(14));
const POD_MODE = modeById(POD);
const SABER_MODE = modeById(SABER);
const _aim = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _from = new THREE.Vector3();
const _to = new THREE.Vector3();

export class MechSpaceGuns extends MechGuns {
  constructor(space, player, sfx, mech) {
    super(mech, sfx);
    Object.assign(this, { space, player });
    this.bats = null;
    this.podCd = 0;
    this.fovPulse = 0;
    this.padMode = false;
    this.beamCue = false;
    this.env = this.buildEnv();
    this.onShake = (a) => this.space.shake?.(a);
    this.onFov = (a) => { this.fovPulse = Math.min(14, this.fovPulse + a); };
  }

  buildEnv() {
    const self = this;
    return {
      weapon: null, aim: new THREE.Vector3(), baseVel: this.space.velocity, dmgMul: 1,
      get muzzles() { return self.padMode ? self.pads : self.muzzles; },
      spend: (cost) => spendPower(this.player, cost),
      pickTargets: (out, n, cone) => this.combat?.weapons?.pickTargets(out, n, cone) ?? (out.length = 0, out),
      beamCast: (from, dir, range, amount) => this.hits?.beamCast(from, dir, range, amount) ?? range,
      shake: (a) => this.space.shake?.(a),
    };
  }

  // Builds lazily against the combat system that is live right now (it is rebuilt per system).
  attach(combat) {
    if (this.combat === combat && this.bats) return;
    this.disposeBats();
    this.combat = combat;
    this.hits = combat?.weapons?.hits ?? null;
    if (!combat?.root) return;
    const opts = { fx: combat.fx, sfx: this.sfx }; // only the beam hum comes from gunSound()
    this.bats = { main: new GunBattery(combat.root, opts), pod: new GunBattery(combat.root, opts) };
    this.attachFx(combat.root);
  }

  refreshMuzzles() {
    this.mech.group.updateMatrixWorld(true);
    this.mech.rifleMuzzle(this.muzzles[0]);
    for (let i = 0; i < 2; i++) this.mech.shoulderMuzzle(i, this.pads[i]);
  }

  update(dt, input, pose) {
    this.podCd -= dt;
    this.fovPulse *= Math.exp(-6 * dt);
    if (!this.bats || !this.hits) return;
    this.refreshMuzzles();
    const held = this.inputs(input);
    this.load.update(dt, input, held, input.uiCapture);
    const cam = this.space.camera;
    this.env.dmgMul = this.space.design?.stats?.damage ?? 1;
    this.env.baseVel = this.space.velocity;
    _aim.set(0, 0, -1).applyQuaternion(cam.quaternion);
    this.env.aim.copy(cam.position).addScaledVector(_aim, 420);
    this.keepLock();
    this.fireMain(dt, pose);
    this.firePod(dt, pose);
    this.saber(dt, pose);
    this.bats.main.step(dt, this.hits);
    this.bats.pod.step(dt, this.hits);
    this.tick(dt);
  }

  // The selected mode. The saber has no battery; the pod shares the launcher with RMB.
  fireMain(dt, pose) {
    const m = this.load.mode;
    if (m.id === SABER) { this.padMode = false; return; }
    if (m.id === POD) { this.launch(dt, pose, this.fireHeld && this.load.ready, this.fireClick); return; }
    const bat = this.bats.main;
    this.padMode = false;
    this.env.weapon = m.space;
    const before = bat.cd;
    bat.trigger(dt, this.fireHeld && this.load.ready, this.fireClick, this.env);
    if (m.id === CANNON) { this.beamFeedback(dt, pose, m, bat); return; }
    if (bat.cd > before) this.shotFired(pose, m, this.muzzles[0]);
  }

  beamFeedback(dt, pose, m, bat) {
    if (bat.beamOn) {
      if (!this.beamCue) { cannonSfx(this.sfx); this.beamCue = true; }
      this.sustained(dt, pose, m);
      this.mech.rack.setCharge(1);
    } else this.beamCue = false;
  }

  // RMB quick launch, and the LMB path when the pod itself is selected.
  firePod(dt, pose) {
    if (this.load.id === POD) return;
    const ok = this.load.canFire(POD);
    this.launch(dt, pose, this.podHeld && ok, this.podClick && ok);
  }

  launch(dt, pose, held, clicked) {
    this.padMode = true;
    this.env.weapon = POD_MODE.space;
    const bat = this.bats.pod, before = bat.cd;
    bat.trigger(dt, held, clicked, this.env);
    if (bat.cd > before) this.shotFired(pose, POD_MODE, this.pads[0]);
    this.padMode = this.load.id === POD;
  }

  shotFired(pose, mode, from) {
    _dir.subVectors(this.env.aim, from).normalize();
    this.fired(pose, mode, from, _dir, this.combat?.fx, 0);
    if (mode.recoil > 1) this.space.velocity.addScaledVector(_dir, -mode.recoil * 3.2); // heavy guns shove it back
  }

  // Keeps the HUD lock indicator alive while the ship's own weapon loop is suspended.
  keepLock() {
    const w = this.combat?.weapons;
    if (!w) return;
    w.pirates = this.combat.pirates;
    w.setLock(w.bestTarget(this.combat.pirates, LOCK_COS));
  }

  saber(dt, pose) {
    if (this.swing(pose, SABER_MODE.space.cost, (c) => spendPower(this.player, c))) this.lungeTarget();
    if (pose.swingHit) this.saberHit(pose);
    if (pose.lunge > 0.01) this.lungeStep(dt, pose.lunge);
  }

  // Close the gap: the swing pushes the mech along the crosshair, harder toward a locked target.
  lungeTarget() {
    const t = this.combat?.weapons?.lockTarget;
    this.lockPos = t?.alive ? t.pos : null;
  }

  lungeStep(dt, k) {
    const v = this.space.velocity, step = SABER_MODE.space.lunge * k * dt;
    if (this.lockPos) _dir.subVectors(this.lockPos, this.space.shipObject.position).normalize();
    else _dir.set(0, 0, -1).applyQuaternion(this.space.camera.quaternion);
    v.addScaledVector(_dir, step);
  }

  // One hitscan sweep down the crosshair at the moment the blade lands.
  saberHit(pose) {
    if (!this.hits) return;
    const s = SABER_MODE.space, step = pose.swingStep;
    this.mech.group.updateMatrixWorld(true);
    this.mech.saberTip(_to);
    _from.copy(this.space.shipObject.position);
    _aim.set(0, 0, -1).applyQuaternion(this.space.camera.quaternion);
    const mul = this.space.design?.stats?.damage ?? 1;
    const range = s.reach * (STEP_REACH[step] ?? 1);
    const dist = this.hits.beamCast(_from, _aim, range, s.damage[step] * mul);
    this.combat?.fx?.sparks(_to, SABER_MODE.color, 14, this.unit * 0.2);
    if (dist >= range - 0.5) return;
    pose.saberImpact();
    saberHitSfx(this.sfx);
    this.onShake?.(0.4);
    _to.copy(_from).addScaledVector(_aim, dist);
    this.combat?.fx?.explode(_to, { color: SABER_MODE.color, size: 0.8, debris: false });
  }

  disposeBats() {
    if (this.bats) for (const k in this.bats) this.bats[k].dispose();
    this.bats = null;
    this.combat = null;
    this.hits = null;
  }

  dispose() {
    this.disposeBats();
    super.dispose();
  }
}

const STEP_REACH = [1, 1.15, 1.4];
