// Player guns: the ship's primary weapon on LMB (laser, plasma, flak, homing missiles, swarm or beam,
// chosen by the ship design; see src/ship-systems/ship-weapons.js) and homing rockets on RMB,
// with crosshair lock-on.
import * as THREE from 'three';
import { muzzles, aimForward } from './ship-ref.js';
import { GunBattery } from '../ship-systems/gun-battery.js';
import { weaponOf } from '../ship-systems/ship-weapons.js';

const ROCKET_COST = 15;
const ROCKET_GAP = 1.2;
const LOCK_COS = Math.cos(THREE.MathUtils.degToRad(14));
const ROCKET_COS = Math.cos(THREE.MathUtils.degToRad(30));
const LOCK_RANGE = 1200;
const CONVERGE = 400;
const tmpF = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpV = new THREE.Vector3();

export class PlayerWeapons {
  // root: scene group for projectiles; hits: SpaceGunHits (optional: without it only rockets fire).
  constructor({ space, player, sfx, fx, bolts, rockets, root = null, hits = null }) {
    Object.assign(this, { space, player, sfx, fx, bolts, rockets, hits });
    this.rocketCd = 0;
    this.lockTarget = null;
    this.pirates = [];
    this.design = null;
    this.battery = new GunBattery(root ?? bolts.core.parent, { fx, sfx, laserPool: bolts });
    this.env = this.buildEnv();
  }

  get damageMult() {
    return this.shipDesign?.stats?.damage ?? 1;
  }

  get shipDesign() {
    return this.space.shipDesign ?? this.space.design;
  }

  get weapon() {
    return weaponOf(this.shipDesign);
  }

  // Per-frame firing context for the battery (one object, fields refreshed in update).
  buildEnv() {
    const self = this;
    return {
      weapon: null, aim: new THREE.Vector3(), baseVel: this.space.velocity, dmgMul: 1,
      get muzzles() { return (self.frameMuzzles ??= muzzles(self.space)); }, // once per frame
      spend: (cost) => this.player.useEnergy(cost),
      pickTargets: (out, n, cone) => this.pickTargets(out, n, cone),
      beamCast: (from, dir, range, amount) => this.hits?.beamCast(from, dir, range, amount) ?? range,
      shake: (a) => this.space.shake?.(a),
    };
  }

  update(dt, input, pirates) {
    this.rocketCd -= dt;
    this.pirates = pirates;
    this.frameMuzzles = null;
    this.noticeShipChange();
    this.setLock(this.bestTarget(pirates, LOCK_COS));
    const env = this.env;
    env.weapon = this.weapon;
    env.dmgMul = this.damageMult;
    env.baseVel = this.space.velocity;
    env.aim.copy(this.space.camera.position).addScaledVector(aimForward(this.space, tmpF), CONVERGE);
    if (this.hits) this.battery.trigger(dt, input.mouseDown(0), input.clicked(0), env);
    this.triggered = true;
    if (input.clicked(2) && this.rocketCd <= 0) this.tryRocket(pirates);
  }

  // A different ship means a different gun: tell the player.
  noticeShipChange() {
    const d = this.shipDesign;
    if (d === this.design) return;
    if (this.design) this.player.emit('notice', { text: `Senjata kapal: ${weaponOf(d).label}` });
    this.design = d;
  }

  tryRocket(pirates) {
    if (!this.player.useEnergy(ROCKET_COST)) {
      this.sfx.dryFire?.();
      return;
    }
    this.rocketCd = ROCKET_GAP;
    const list = muzzles(this.space);
    tmpP.set(0, 0, 0);
    for (const m of list) tmpP.add(m);
    tmpP.divideScalar(list.length);
    const speed = 80 + this.space.velocity.length();
    const target = this.lockTarget ?? this.bestTarget(pirates, ROCKET_COS);
    this.rockets.fire(tmpP, aimForward(this.space, tmpF), speed, target);
    this.sfx.rocket?.();
  }

  // Up to n distinct hostiles in the crosshair cone, best aligned first (the lock target leads).
  pickTargets(out, n, coneDeg) {
    out.length = 0;
    if (this.lockTarget) out.push(this.lockTarget);
    const minCos = Math.cos(THREE.MathUtils.degToRad(coneDeg));
    while (out.length < n) {
      const next = this.bestTarget(this.pirates, minCos, out);
      if (!next) break;
      out.push(next);
    }
    return out;
  }

  // Hostile closest to the crosshair within the cone minCos (skipping `except`), or null.
  bestTarget(pirates, minCos, except = null) {
    const cam = this.space.camera.position;
    const fwd = aimForward(this.space, tmpF);
    let best = null;
    let bestDot = minCos;
    for (const p of pirates) {
      tmpV.subVectors(p.pos, cam);
      const d = tmpV.length();
      if (d > LOCK_RANGE || !p.alive || except?.includes(p)) continue;
      const dot = tmpV.dot(fwd) / d;
      if (dot > bestDot) { bestDot = dot; best = p; }
    }
    return best;
  }

  // Emits 'lockOn' when the lock state flips.
  setLock(target) {
    const was = Boolean(this.lockTarget);
    this.lockTarget = target;
    if (was !== Boolean(target)) this.player.emit('lockOn', { locked: Boolean(target) });
  }

  // Projectiles keep flying (and hitting) even while the player is dead.
  // A frame without update() (player dead) switches the beam off.
  step(dt) {
    if (!this.triggered) this.battery.stopBeam();
    this.triggered = false;
    if (this.hits) this.battery.step(dt, this.hits);
  }

  // New system: drop the lock and every projectile in flight.
  reset() {
    this.setLock(null);
    this.battery.clear();
  }

  dispose() {
    this.battery.dispose();
  }
}
