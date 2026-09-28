// GunBattery: fires a ship's primary weapon (bolts, seeker missiles or a continuous beam) and steps
// its pooled projectiles. Shared by space combat and atmospheric flight; the caller supplies an
// `env` (where/how to shoot) and `hits` (how projectiles resolve against its world).
//
// env: { weapon, muzzles: Vector3[] (world), aim: Vector3 (world point the guns converge on),
//        baseVel: Vector3, dmgMul, spend(cost) -> bool, pickTargets(out, n, coneDeg) -> out,
//        beamCast(from, dir, range, amount) -> hit distance, shake?(amount) }
// hits: { bolt(b) -> bool consumed, seeker(r) -> bool detonate, detonate(r) }
import * as THREE from 'three';
import { BoltPool } from '../combat/bolts.js';
import { RocketPool } from '../combat/rockets.js';
import { ShipBeam } from './ship-beam.js';
import { gunSound } from './ship-gun-sfx.js';

const tmpD = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpE = new THREE.Vector3();
const jitter = (a) => (Math.random() - 0.5) * 2 * a;

export class GunBattery {
  constructor(parent, { fx, sfx, laserPool = null }) {
    Object.assign(this, { parent, fx, sfx });
    this.shared = laserPool;
    this.bolts = laserPool ? { laser: laserPool } : {};
    this.seekers = {};
    this.beam = null;
    this.cd = 0;
    this.muzzle = 0;
    this.beamTick = 0;
    this.beamOn = false;
    this.targets = [];
  }

  // trigger + step in one call.
  update(dt, firing, clicked, env, hits) {
    this.trigger(dt, firing, clicked, env);
    this.step(dt, hits);
  }

  // firing: trigger held; clicked: pressed this frame (dry-fire click feedback).
  trigger(dt, firing, clicked, env) {
    this.cd -= dt;
    const w = env?.weapon;
    if (w?.mode === 'beam') this.updateBeam(dt, firing, clicked, env);
    else this.stopBeam();
    if (w && w.mode !== 'beam' && firing && this.cd <= 0) this.fire(w, clicked, env);
  }

  // Moves projectiles in flight (a shared laser pool is stepped by its owner).
  step(dt, hits) {
    for (const id in this.bolts) if (this.bolts[id] !== this.shared) this.bolts[id].update(dt, hits.bolt);
    for (const id in this.seekers) this.seekers[id].update(dt, this.fx, hits.seeker, hits.detonate);
  }

  fire(w, clicked, env) {
    if (!env.spend(w.cost)) {
      if (clicked) this.sfx?.dryFire?.();
      return;
    }
    this.cd = w.gap;
    if (w.mode === 'seeker') this.fireSeekers(w, env);
    else this.fireBolts(w, env);
    env.shake?.(w.shake ?? 0.08);
    gunSound(this.sfx, w.id);
  }

  nextMuzzle(env) {
    const list = env.muzzles;
    return list[this.muzzle++ % list.length];
  }

  fireBolts(w, env) {
    const pool = this.boltPool(w);
    const from = this.nextMuzzle(env);
    tmpD.subVectors(env.aim, from).normalize();
    for (let i = 0; i < w.pellets; i++) {
      tmpV.set(tmpD.x + jitter(w.spread), tmpD.y + jitter(w.spread), tmpD.z + jitter(w.spread)).normalize();
      tmpV.multiplyScalar(w.speed * (w.pellets > 1 ? 0.9 + Math.random() * 0.2 : 1)).add(env.baseVel);
      const b = pool.fire(from, tmpV, w.damage * env.dmgMul, w.life * (w.pellets > 1 ? 0.8 + Math.random() * 0.4 : 1));
      if (b) b.splash = w.splash;
    }
    this.fx.sparks(from, w.flash, w.splash ? 12 : 6, w.splash ? 1.6 : 0.9);
  }

  fireSeekers(w, env) {
    const pool = this.seekerPool(w);
    const targets = env.pickTargets(this.targets, w.volley, w.cone);
    const speed = w.speed + env.baseVel.length();
    for (let i = 0; i < w.volley; i++) {
      const from = this.nextMuzzle(env);
      tmpD.subVectors(env.aim, from).normalize();
      if (w.volley > 1) tmpD.set(tmpD.x + jitter(0.35), tmpD.y + jitter(0.35) + 0.12, tmpD.z + jitter(0.35)).normalize();
      const r = pool.fire(from, tmpD, speed, targets.length ? targets[i % targets.length] : null);
      if (!r) continue;
      r.damage = w.damage * env.dmgMul;
      r.radius = w.radius;
      r.age = -i * 0.04; // staggered volley: later missiles steer a touch later
      this.fx.sparks(from, w.flame, 4, 0.6);
    }
  }

  // Continuous hitscan: drains energy per second, damages in fixed ticks.
  updateBeam(dt, firing, clicked, env) {
    const w = env.weapon;
    if (!firing || !env.spend(w.cost * dt)) {
      if (firing && clicked) this.sfx?.dryFire?.();
      this.stopBeam();
      return;
    }
    this.beam ??= new ShipBeam(this.parent, w.color, w.core);
    tmpC.set(0, 0, 0);
    for (const m of env.muzzles) tmpC.add(m);
    tmpC.divideScalar(env.muzzles.length);
    tmpD.subVectors(env.aim, tmpC).normalize();
    this.beamTick -= dt;
    let amount = 0;
    if (this.beamTick <= 0) { this.beamTick = Math.max(0, this.beamTick + w.tick); amount = w.damage * env.dmgMul * w.tick; }
    const dist = env.beamCast(tmpC, tmpD, w.range, amount);
    tmpE.copy(tmpC).addScaledVector(tmpD, dist);
    this.beam.show(env.muzzles, tmpE, w.width, dt);
    if (!amount) return;
    if (dist < w.range - 1) this.fx.sparks(tmpE, w.color, 5, 0.7);
    gunSound(this.sfx, 'beam');
    this.beamOn = true;
  }

  stopBeam() {
    if (!this.beam) return;
    this.beam.hide();
    this.beamOn = false;
  }

  boltPool(w) {
    this.bolts[w.id] ??= new BoltPool(this.parent, { color: w.color, length: w.length, width: w.width,
      capacity: w.pellets > 1 ? 220 : 120, shape: w.shape });
    return this.bolts[w.id];
  }

  seekerPool(w) {
    this.seekers[w.id] ??= new RocketPool(this.parent, { capacity: w.capacity, maxSpeed: w.maxSpeed, turn: w.turn,
      life: w.life, scale: w.scale, flame: w.flame, trail: w.volley > 1 ? 0xa890c0 : 0xb4b4bc, trailGap: w.volley > 1 ? 0.07 : 0.035 });
    return this.seekers[w.id];
  }

  clear() {
    for (const id in this.bolts) this.bolts[id].clear();
    for (const id in this.seekers) this.seekers[id].clear();
    this.stopBeam();
  }

  // Frees owned pools (a shared laser pool stays with its owner).
  dispose() {
    for (const id in this.bolts) if (this.bolts[id] !== this.shared) this.bolts[id].dispose();
    for (const id in this.seekers) this.seekers[id].dispose();
    this.beam?.dispose();
    this.bolts = {};
    this.seekers = {};
    this.beam = null;
  }
}
