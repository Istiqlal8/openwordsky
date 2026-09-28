// How a rival frame duels on foot: walk the player down, telegraph a beam rifle shot, then close
// with a jet dash and a sabre slash. Every attack is announced a beat before it lands, so a
// moving player can always break the line. Writes straight onto the rival (pos, yaw, velY),
// in the same spirit as src/raid/surface-brain.js.
//
// It fights two different fights. Against another mech it commits: short cooldowns, knife range,
// sabre dashes. Against a pilot on foot it holds back — it came for a duel, not for a murder —
// staying out at rifle range, firing half as hard and never dashing unless cornered.
import * as THREE from 'three';
import { mechPilot } from '../mech/mech-pilot.js';
import { yawToward, angleGap } from './rival-mech.js';

const AGGRO = 190;
const GIVE_UP = 430;
const KEEP = 34;         // preferred firing distance against another mech, in metres
const KEEP_FOOT = 62;    // ...and the wider ring it keeps around a pilot on foot
const HOLD = 0.5;        // how much of its cadence and damage a held-back rival uses
const BEAM_WARN = 0.55;
const BEAM_R = 4.2;      // how wide the shot forgives
const DASH_TIME = 1.5;
const CORNERED = 22;     // a pilot this close is dashed at anyway
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

export class RivalGroundBrain {
  constructor(rival, ctx) {
    this.r = rival;
    this.ctx = ctx;
    this.def = rival.def;
    this.state = 'wait';
    this.t = 0;
    this.gunT = this.def.gun.gap;
    this.dashT = this.def.blade.gap;
    this.beam = null;
    this.moving = 0;
  }

  get feet() { return this.ctx.surface.feet; }

  // True while the player is standing in their own mech: this is the duel it actually wants.
  get matched() { return mechPilot.active; }

  distance() {
    const f = this.feet, p = this.r.pos;
    return Math.hypot(f.x - p.x, f.z - p.z);
  }

  canHit() { return !this.ctx.player.dead && this.r.landed; }

  wake() {
    if (this.state !== 'wait') return;
    this.state = 'hunt';
    this.announce();
  }

  // Says which fight it is having, once per change, so the restraint is never invisible.
  announce() {
    const matched = this.matched;
    if (this.said === matched) return;
    this.said = matched;
    this.ctx.player.emit('notice', { text: matched ? this.def.taunt
      : `${this.def.name} menahan tembakan — naik rangkamu.` });
  }

  // The player transformed mid-fight: drop the restraint and open up.
  engage() {
    if (this.state === 'dead') return;
    this.wake();
    this.announce();
    this.gunT = Math.min(this.gunT, 0.6);
    this.dashT = Math.min(this.dashT, 1.2);
  }

  update(dt) {
    if (this.state !== 'wait') this.announce();
    const rush = (1 + this.r.stage * 0.25) * (this.matched ? 1 : HOLD);
    this.t -= dt;
    this.gunT -= dt * rush;
    this.dashT -= dt * rush;
    const d = this.distance();
    this.r.env.speed = 0;
    this.stepBeam(dt);
    this[this.state](dt, d, rush);
    this.face(dt);
    return this.moving;
  }

  wait(dt, d) {
    this.moving = 0;
    if (d < AGGRO && this.canHit()) this.wake();
  }

  hunt(dt, d, rush) {
    if (d > GIVE_UP) { this.state = 'wait'; return; }
    const keep = this.matched ? KEEP : KEEP_FOOT;
    const reach = this.matched ? 90 : CORNERED;
    if (this.canHit() && this.dashT <= 0 && d < reach) { this.startDash(); return; }
    if (this.canHit() && this.gunT <= 0 && d < this.def.gun.range * 0.25) { this.startShot(rush); return; }
    this.walk(dt, d > keep ? 1 : -0.6, d > keep * 1.6 ? 1.9 : 1);
  }

  // Standing still to shoot: the beam is drawn thin first, then it bites.
  startShot(rush) {
    this.state = 'shoot';
    this.t = BEAM_WARN + 0.25;
    this.gunT = this.def.gun.gap * 2.4 / rush;
    this.beam = { t: 0, x: this.feet.x, y: this.feet.y, z: this.feet.z, hit: false };
  }

  shoot(dt) {
    this.moving = 0;
    if (this.t <= 0) this.state = 'hunt';
  }

  startDash() {
    this.state = 'dash';
    this.t = DASH_TIME;
    this.dashT = this.def.blade.gap * 1.6;
    this.slashed = false;
    this.r.velY = Math.max(this.r.velY, 9);
    this.r.jets = true;
    this.ctx.player.emit('notice', { text: `${this.def.name}: tebasan!` });
  }

  dash(dt, d) {
    this.walk(dt, 1, 3.1);
    if (d < this.def.blade.reach * this.r.height * 0.6 && !this.slashed) this.slash(d);
    if (this.t > 0) return;
    this.state = 'hunt';
    this.slashed = false;
    this.r.jets = false;
  }

  slash(d) {
    this.slashed = true;
    this.r.swing();
    if (this.canHit() && d < this.def.blade.reach * this.r.height * 0.7) {
      this.ctx.player.damageSuit(this.def.blade.damage, `Pedang ${this.def.name}`);
      this.r.jolt(1.2);
    }
  }

  // The rifle beam: a warning line, then a lance down the same bearing.
  stepBeam(dt) {
    const b = this.beam;
    if (!b) return;
    b.t += dt;
    const warn = b.t < BEAM_WARN;
    this.r.headPoint(_a);
    _b.set(b.x, b.y + 1.2, b.z);
    this.ctx.fx?.beam(_a, _b, warn ? 0xffd24a : this.def.glow, warn ? 0.05 : 0.16);
    if (warn) return;
    if (!b.hit) this.beamHit(_a, _b);
    if (b.t > BEAM_WARN + 0.28) this.beam = null;
  }

  beamHit(from, to) {
    this.beam.hit = true;
    this.r.muzzleFlash();
    const f = this.feet;
    const dx = to.x - from.x, dz = to.z - from.z, len = Math.hypot(dx, dz) || 1;
    const px = f.x - from.x, pz = f.z - from.z;
    const along = (px * dx + pz * dz) / len;
    const off = Math.abs((-px * dz + pz * dx) / len);
    if (along < 0 || off > BEAM_R || !this.canHit()) return;
    const hit = this.def.gun.damage * (this.matched ? 1 : HOLD);
    this.ctx.player.damageSuit(hit, `Senapan ${this.def.name}`);
    this.r.jolt(0.8);
  }

  // dir +1 closes the gap, -1 backs off; `pace` scales the base walking speed.
  walk(dt, dir, pace) {
    const p = this.r.pos, f = this.feet;
    const dx = f.x - p.x, dz = f.z - p.z, len = Math.hypot(dx, dz) || 1;
    const speed = this.def.speed.ground * pace;
    p.x += (dx / len) * dir * speed * dt;
    p.z += (dz / len) * dir * speed * dt;
    this.r.env.fwd = dir >= 0 ? 1 : -1;
    this.moving = pace > 1.4 ? 2 : 1;
    this.r.env.speed = speed;
  }

  face(dt) {
    const p = this.r.pos, f = this.feet;
    const want = yawToward(f.x - p.x, f.z - p.z);
    this.r.yaw += angleGap(this.r.yaw, want) * Math.min(1, dt * 3.5);
  }

  dead() { this.moving = 0; }

  dispose() { this.beam = null; }
}
