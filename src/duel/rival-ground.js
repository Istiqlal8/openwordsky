// A rival mobile suit duelling the player on a planet, presented to the game as one extra
// Wildlife group. Its torso is a Wildlife "body", so the Multitool, every hand weapon, grenades,
// splash damage and the player's own mech guns reach it through the paths that already exist.
// Group contract used by Wildlife: bodies(), provoke(ref), kill(ref), update(dt, player), nearest(), dispose().
import * as THREE from 'three';
import { MechPose } from '../mech/mech-pose.js';
import { FlightAttitude } from '../mech/mech-flight.js';
import { buildRival, disposeRival, buildGuard, GuardCycle } from './rival-mech.js';
import { RivalGroundBrain } from './rival-ground-ai.js';
import { stageOf } from './duel-data.js';

const HIT_UNIT = 25;      // one Wildlife.damage() call
const DROP_HEIGHT = 120;  // it comes down from orbit on its thrusters
const DROP_SPEED = 42;    // terminal speed of the descent...
const FLARE = 26;         // ...until it flares out this far above the ground
const LAND_SPEED = 12;
const _w = new THREE.Vector3();
const _f = new THREE.Vector3();

export class RivalGround {
  // hooks: { onDamage(n, soaked), onGuard(def), onDefeat(pos) }
  constructor(ctx, def, site, hooks = {}) {
    this.ctx = ctx;
    this.def = def;
    this.hooks = hooks;
    this.mech = buildRival(def);
    this.height = this.mech.design.d.H;
    ctx.surface.scene.add(this.mech.group);
    this.pos = new THREE.Vector3(site.x, ctx.surface.floorAt(site.x, site.z) + DROP_HEIGHT, site.z);
    this.yaw = 0;
    this.velY = 0;
    this.jets = true;
    this.landed = false;
    this.dead = false;
    this.deadT = 0;
    this.maxHp = def.hp.ground;
    this.ref = { hp: this.maxHp, name: def.name, sp: null, hostile: true, duel: def.id };
    this.proxy = new THREE.Object3D();
    ctx.surface.scene.add(this.proxy);
    this.body = { root: this.proxy, radius: this.height * 0.36, ref: this.ref, hp: this.maxHp };
    this.pose = new MechPose(this.mech);
    this.pose.onStep = (i) => this.footfall(i);
    this.att = new FlightAttitude();
    this.guard = new GuardCycle(def.guard);
    this.bubble = buildGuard(this.mech.group, def.glow, this.height * 0.72);
    this.bubble.mesh.position.y = this.height * 0.55;
    this.env = { speed: 0, runSpeed: def.speed.ground * 3.1, airborne: true, root: this.pos,
      cos: 1, sin: 0, groundAt: (x, z) => ctx.surface.floorAt(x, z), fwd: 1, side: 0 };
    this.brain = new RivalGroundBrain(this, ctx);
    this.place();
  }

  get stage() { return stageOf(this.ref.hp, this.maxHp); }
  get shielded() { return this.guard.on; }

  hpBar() { return { now: Math.max(0, this.ref.hp), max: this.maxHp }; }

  headPoint(out) { return out.set(this.pos.x, this.pos.y + this.height * 0.82, this.pos.z); }

  // ---- Wildlife group contract ----
  bodies() { return this.dead ? [] : [this.body]; }

  provoke() {
    this.brain.wake();
    if (this.guard.on) this.ref.hp += HIT_UNIT * this.guard.soak;   // a guarded blow never kills
    this.hooks.onDamage?.(Math.round(HIT_UNIT * (this.guard.on ? 1 - this.guard.soak : 1)), this.guard.on);
  }

  kill() {
    if (this.dead) return;
    this.dead = true;
    this.brain.state = 'dead';
    this.bubble.set(false);
    this.ctx.fx?.explode(this.torso(_w), { color: this.def.glow, size: 2.6 });
    this.ctx.sfx?.explosion?.(0.9);
    this.hooks.onDefeat?.(this.torso(new THREE.Vector3()));
  }

  update(dt) {
    if (this.dead) { this.deadT += dt; this.collapse(dt); this.place(); return; }
    if (this.guard.update(dt, this.landed)) this.guardChanged();
    this.brain.update(dt);
    this.gravity(dt);
    this.animate(dt);
    this.place();
  }

  nearest() { return null; }   // keeps the scan HUD on ordinary species

  // ---- movement ----
  gravity(dt) {
    const g = this.ctx.planet?.gravity || 9.8;
    const floor = this.ctx.surface.floorAt(this.pos.x, this.pos.z);
    this.velY -= g * dt * (this.jets ? 0.6 : 1.7);
    // On thrusters it never falls: it drops fast, then flares out just above the ground.
    const cap = this.pos.y - floor > FLARE ? -DROP_SPEED : -LAND_SPEED;
    if (this.jets && this.velY < cap) this.velY = cap;
    this.pos.y += this.velY * dt;
    if (this.pos.y > floor) { this.env.airborne = this.pos.y > floor + 0.5; return; }
    this.pos.y = floor;
    this.velY = 0;
    this.env.airborne = false;
    if (this.landed) return;
    this.landed = true;
    this.jets = false;
    this.touchdown();
  }

  touchdown() {
    this.ctx.fx?.puff(this.pos, 0x9a8f7e, this.height * 0.5, 1.4);
    this.ctx.sfx?.explosion?.(0.35);
    this.jolt(1.4);
    this.ctx.player.emit('notice', { text: this.def.hail });
  }

  animate(dt) {
    this.env.cos = Math.cos(this.yaw);
    this.env.sin = Math.sin(this.yaw);
    this.att.update(dt, { fwd: this.env.speed * this.env.fwd, side: 0, climb: this.velY,
      cap: this.env.runSpeed, boost: this.jets, air: this.env.airborne, turn: 0 });
    if (this.env.airborne) this.pose.fly(dt, this.jets ? 1 : 0.4, this.att);
    else this.pose.walk(dt, this.env);
    this.pose.weapons(dt);
    this.mech.setThrust(this.jets ? 1 : Math.min(1, this.env.speed / this.env.runSpeed), this.att.boost);
    this.mech.pack.group.rotation.x = this.att.nozzle;
  }

  place() {
    const g = this.mech.group;
    g.rotation.order = 'YXZ';
    g.position.copy(this.pos);
    g.position.y += this.att.bob * this.height;
    g.rotation.set(this.att.pitch, this.yaw + this.att.yaw, this.att.roll);
    g.updateMatrixWorld(true);
    this.proxy.position.copy(this.torso(_w));
  }

  torso(out) { return out.set(this.pos.x, this.pos.y + this.height * 0.55, this.pos.z); }

  // ---- combat feedback ----
  swing() { if (!this.pose.swinging) this.pose.startSwing(); }

  muzzleFlash() {
    this.mech.group.updateMatrixWorld(true);
    this.mech.rifleMuzzle(_f);
    this.ctx.fx?.sparks(_f, this.def.glow, 8, this.height * 0.06);
  }

  // Shakes the player's camera: the duel is felt, not only watched.
  jolt(amount) {
    const cam = this.ctx.surface.camera, f = this.ctx.surface.feet;
    const d = Math.hypot(this.pos.x - f.x, this.pos.z - f.z);
    const k = amount * Math.max(0, 1 - d / 90);
    if (k <= 0.01) return;
    cam.position.x += (Math.random() - 0.5) * k;
    cam.position.y += (Math.random() - 0.5) * k;
    cam.position.z += (Math.random() - 0.5) * k;
  }

  footfall(i) {
    this.mech.footWorld(i, _f);
    this.ctx.fx?.puff(_f, 0x9a8f7e, this.mech.design.d.footW * 2.2, 0.8);
    this.jolt(0.35);
  }

  guardChanged() {
    this.bubble.set(this.guard.on);
    if (this.guard.on) this.hooks.onGuard?.(this.def);
  }

  collapse(dt) {
    const g = this.mech.group;
    g.rotation.z += (1.2 - g.rotation.z) * Math.min(1, dt * 1.4);
    if (this.deadT < 2.2 && Math.random() < 0.4) {
      this.ctx.fx?.explode(this.torso(_w), { color: this.def.glow, size: 1.2 + Math.random() * 1.6 });
    }
    if (this.deadT > 6) this.pos.y -= dt * 3;
    g.visible = this.deadT < 12;
  }

  dispose() {
    this.brain.dispose();
    this.pose.dispose();
    this.bubble.dispose();
    this.proxy.removeFromParent();
    disposeRival(this.mech);
  }
}
