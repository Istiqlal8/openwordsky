// Player guns: rapid laser bolts (LMB) and homing rockets (RMB) with crosshair lock-on.
import * as THREE from 'three';
import { muzzles, aimForward } from './ship-ref.js';

const LASER_GAP = 0.125;
const LASER_COST = 0.6;
const LASER_SPEED = 420;
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
  constructor({ space, player, sfx, fx, bolts, rockets }) {
    Object.assign(this, { space, player, sfx, fx, bolts, rockets });
    this.laserCd = 0;
    this.rocketCd = 0;
    this.muzzle = 0;
    this.lockTarget = null;
  }

  get damageMult() {
    return (this.space.shipDesign ?? this.space.design)?.stats?.damage ?? 1;
  }

  update(dt, input, pirates) {
    this.laserCd -= dt;
    this.rocketCd -= dt;
    this.setLock(this.bestTarget(pirates, LOCK_COS));
    if (input.mouseDown(0) && this.laserCd <= 0) this.tryLaser(input);
    if (input.clicked(2) && this.rocketCd <= 0) this.tryRocket(pirates);
  }

  tryLaser(input) {
    if (!this.player.useEnergy(LASER_COST)) {
      if (input.clicked(0)) this.sfx.dryFire?.();
      return;
    }
    this.laserCd = LASER_GAP;
    const list = muzzles(this.space);
    const from = list[this.muzzle++ % list.length];
    const cam = this.space.camera;
    tmpP.copy(cam.position).addScaledVector(aimForward(this.space, tmpF), CONVERGE);
    tmpV.subVectors(tmpP, from).normalize().multiplyScalar(LASER_SPEED).add(this.space.velocity);
    this.bolts.fire(from, tmpV, 10 * this.damageMult, 1.4);
    this.fx.sparks(from, 0x66ddff, 2, 0.3);
    this.sfx.laser?.();
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

  // Hostile closest to the crosshair within the cone minCos, or null.
  bestTarget(pirates, minCos) {
    const cam = this.space.camera.position;
    const fwd = aimForward(this.space, tmpF);
    let best = null;
    let bestDot = minCos;
    for (const p of pirates) {
      tmpV.subVectors(p.pos, cam);
      const d = tmpV.length();
      if (d > LOCK_RANGE || !p.alive) continue;
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
}
