// On-foot boss behaviour: stalk the player, telegraph an attack, commit to it, recover.
// Every attack is announced a beat before it lands so a moving player can get out of the way.
import * as THREE from 'three';
import { Telegraph } from './raid-telegraph.js';

const AGGRO = 110;
const GIVE_UP = 320;
const WALK = 2.6, HUNT = 6.4;
const STOMP_DMG = 26, MORTAR_DMG = 22, BEAM_DMG = 30;
const BEAM_WARN = 1.2, BEAM_LIVE = 0.9, BEAM_R = 5.5;
const SHIELD_GAP = 16, SHIELD_TIME = 5;
const _v = new THREE.Vector3();

export class BossBrain {
  constructor(boss, ctx) {
    this.b = boss;
    this.ctx = ctx;
    this.state = 'sleep';
    this.t = 0;
    this.atkT = 5;
    this.shieldT = SHIELD_GAP;
    this.shielded = false;
    this.beam = null;
    this.shake = 0;
    this.moving = 0;
    this.blasts = [];
    this.tel = new Telegraph(ctx.surface.scene, boss.def.glow, (x, z) => ctx.surface.floorAt(x, z));
  }

  get feet() { return this.ctx.surface.feet; }

  distance() {
    const p = this.b.pos;
    return Math.hypot(this.feet.x - p.x, this.feet.z - p.z);
  }

  canHit() {
    const s = this.ctx.surface;
    return !this.ctx.player.dead && !s.flying && this.b.calm <= 0;
  }

  grounded() {
    const s = this.ctx.surface, f = this.feet;
    return !s.flying && f.y - s.floorAt(f.x, f.z) < 1.6;
  }

  wake() {
    if (this.state !== 'sleep') return;
    this.state = 'hunt';
    this.b.roar();
  }

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 2);
    this.t -= dt;
    const d = this.distance();
    this.stepEffects(dt);
    this.stepShield(dt);
    this.stepBeam(dt);
    this[this.state](dt, d);
    return this.moving;
  }

  // Shield window: while it is up the boss barely takes damage, so you reposition instead.
  stepShield(dt) {
    if (this.b.stage > 0 || this.state === 'sleep' || this.state === 'dead') return;
    this.shieldT -= dt;
    if (this.shieldT > 0) return;
    this.shielded = !this.shielded;
    this.shieldT = this.shielded ? SHIELD_TIME : SHIELD_GAP;
    this.b.setShield(this.shielded);
  }

  stepEffects(dt) {
    if (this.tel.stepWave(dt, this.feet, this.grounded(), 34)) this.hurt(STOMP_DMG, 'Hentakan');
    for (const m of this.tel.stepMortars(dt, this.blasts)) this.blast(m);
  }

  blast(m) {
    const y = this.ctx.surface.floorAt(m.x, m.z);
    this.ctx.fx?.explode(_v.set(m.x, y + 0.6, m.z), { color: this.b.def.glow, size: 1.2 });
    this.ctx.sfx?.explosion?.(0.4);
    const f = this.feet;
    if (Math.hypot(f.x - m.x, f.z - m.z) < m.r + 1.5) this.hurt(MORTAR_DMG, 'Mortir');
  }

  sleep(dt, d) {
    this.moving = 0;
    if (d < AGGRO && this.canHit()) this.wake();
  }

  hunt(dt, d) {
    if (d > GIVE_UP) { this.state = 'sleep'; return; }
    this.atkT -= dt;
    if (this.atkT <= 0 && this.canHit()) { this.windup(d); return; }
    this.walkTo(this.feet, d > 26 ? HUNT : WALK, dt, this.b.def.radius + 6);
  }

  windup(d) {
    this.kind = d > 70 ? 'mortar' : Math.random() < 0.45 ? 'stomp' : this.b.hasBeam ? 'beam' : 'mortar';
    this.state = 'rear';
    this.t = 1;
    this.b.roar();
    this.ctx.player.emit('notice', { text: `${this.b.def.name}: ${LABEL[this.kind]}!` });
  }

  rear(dt) {
    this.moving = 0;
    this.face(this.feet, dt * 3);
    if (this.t > 0) return;
    this[this.kind]?.();
    this.state = 'hunt';
    this.atkT = (this.b.enraged ? 2.4 : 4.5) + Math.random() * 2;
  }

  stomp() {
    const p = this.b.pos;
    this.tel.stomp(p.x, p.z, this.b.def.radius * 0.6);
    this.shake = 1;
    this.b.stomped();
  }

  mortar() {
    const f = this.feet;
    this.tel.mortar(f.x, f.z, 16, this.b.enraged ? 5 : 3, 5);
    this.ctx.sfx?.laser?.();
  }

  beam() {
    const p = this.b.pos, f = this.feet;
    const a = Math.atan2(f.z - p.z, f.x - p.x);
    this.beam = { t: 0, a0: a - 0.9, a1: a + 0.9, hit: false };
  }

  // A lance that sweeps a 100-degree arc: run perpendicular to it, or jump behind the boss.
  stepBeam(dt) {
    const b = this.beam;
    if (!b) return;
    b.t += dt;
    const warn = b.t < BEAM_WARN;
    const k = warn ? 0 : Math.min(1, (b.t - BEAM_WARN) / BEAM_LIVE);
    const a = b.a0 + (b.a1 - b.a0) * k;
    const p = this.b.pos, head = this.b.headPoint(_v.clone());
    const end = new THREE.Vector3(p.x + Math.cos(a) * 90, 0, p.z + Math.sin(a) * 90);
    end.y = this.ctx.surface.floorAt(end.x, end.z) + 1;
    this.ctx.fx?.beam(head, end, warn ? 0xffd24a : 0xff3a2a, 0.09);
    if (warn) return;
    this.beamHit(p, a);
    if (b.t > BEAM_WARN + BEAM_LIVE) this.beam = null;
  }

  beamHit(p, a) {
    const f = this.feet, dx = f.x - p.x, dz = f.z - p.z;
    const along = dx * Math.cos(a) + dz * Math.sin(a);
    if (along < 0) return;
    const off = Math.abs(-dx * Math.sin(a) + dz * Math.cos(a));
    if (off > BEAM_R || this.beam.hit) return;
    this.beam.hit = true;
    this.hurt(BEAM_DMG, 'Sinar penjaga');
  }

  dead() { this.moving = 0; }

  hurt(amount, cause) {
    if (this.canHit()) this.ctx.player.damageSuit(amount, `${cause} ${this.b.def.name}`);
  }

  walkTo(goal, speed, dt, stop) {
    const p = this.b.pos, dx = goal.x - p.x, dz = goal.z - p.z, len = Math.hypot(dx, dz);
    if (len <= stop) { this.moving = 0; this.face(goal, dt * 2); return; }
    const step = Math.min(len - stop, speed * dt);
    p.x += (dx / len) * step;
    p.z += (dz / len) * step;
    this.moving = speed > WALK ? 2 : 1;
    this.face(goal, dt * 2);
  }

  face(goal, k) {
    const p = this.b.pos;
    const yaw = Math.atan2(goal.x - p.x, goal.z - p.z);
    this.b.yaw += Math.atan2(Math.sin(yaw - this.b.yaw), Math.cos(yaw - this.b.yaw)) * Math.min(1, k);
  }

  dispose() { this.tel.dispose(); }
}

const LABEL = { stomp: 'Hentakan', mortar: 'Mortir', beam: 'Sinar' };
