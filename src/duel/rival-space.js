// A rival mobile suit duelling the player inside a star system. It is pushed into
// combat.pirates, so it carries exactly the shape SpaceCombat already expects from a Pirate:
// every ship gun, mech gun, rocket, splash and lock-on works on it with no change in src/combat/.
// The frame itself is a real mech rig, flown by src/duel/rival-space-ai.js.
import * as THREE from 'three';
import { MechPose } from '../mech/mech-pose.js';
import { FlightAttitude } from '../mech/mech-flight.js';
import { buildRival, disposeRival, buildGuard, GuardCycle } from './rival-mech.js';
import { RivalSpaceAI } from './rival-space-ai.js';
import { stageOf } from './duel-data.js';

const HEIGHT = 7;            // frame height in space units: a pirate fighter is about 8 long
const BOLT_LIFE = 2.6;
const UP = new THREE.Vector3(0, 1, 0);
const ORIGIN = new THREE.Vector3();
const _to = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _want = new THREE.Vector3();
const _from = new THREE.Vector3();
const _local = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();

export class RivalSpace {
  // env: { space, combat, player, sfx }; hooks: { onDamage, onGuard, onDefeat }
  constructor(def, env, at, hooks = {}) {
    this.def = def;
    this.env = env;
    this.hooks = hooks;
    this.mech = buildRival(def);
    this.scale = HEIGHT / this.mech.design.d.H;
    this.root = new THREE.Group();
    this.root.name = `rival:${def.id}`;
    this.mech.group.scale.setScalar(this.scale);
    this.mech.group.position.y = -HEIGHT * 0.55;   // the root sits on the torso: that is the hit centre
    this.mech.group.rotation.order = 'YXZ';
    this.mech.setWorldScale(this.scale);
    this.root.add(this.mech.group);
    this.root.position.copy(at);
    env.space.scene.add(this.root);
    this.pose = new MechPose(this.mech);
    this.att = new FlightAttitude();
    this.ai = new RivalSpaceAI(def);
    this.guard = new GuardCycle(def.guard);
    this.bubble = buildGuard(this.root, def.glow, HEIGHT * 0.72);
    this.vel = new THREE.Vector3();
    // ---- the Pirate contract SpaceCombat reads ----
    this.pos = this.root.position;
    this.group = this.root;
    this.radius = HEIGHT * 0.45;
    this.kind = { name: def.name };
    this.maxHp = def.hp.space;
    this.hp = this.maxHp;
    this.alive = true;
    this.gone = false;
    this.dead = false;
    this.deadT = 0;
  }

  get stage() { return stageOf(this.hp, this.maxHp); }
  get shielded() { return this.guard.on; }

  hpBar() { return { now: Math.max(0, this.hp), max: this.maxHp }; }

  // Called by SpaceCombat every frame while the rival is listed.
  // ctx: { shipPos, shipVel, bolts, bodies, holdFire, onFire }
  update(dt, ctx) {
    _to.subVectors(ctx.shipPos, this.pos);
    const dist = _to.length();
    this.ai.think(dt, ctx, this.pos, dist, _to, this.stage, _want);
    this.vel.lerp(_want, 1 - Math.exp(-2.6 * dt));
    this.pos.addScaledVector(this.vel, dt);
    this.face(_to, dt);
    if (this.guard.update(dt, !ctx.holdFire)) this.guardChanged();
    this.fly(dt);
    this.weapons(dt, ctx, dist);
  }

  face(toShip, dt) {
    if (toShip.lengthSq() < 1e-4) return;
    _dir.copy(toShip).normalize().negate();      // the frame looks down its own -Z, like the player's
    _m.lookAt(_dir, ORIGIN, UP);
    _q.setFromRotationMatrix(_m);
    const prev = this.lastQ ??= this.root.quaternion.clone();
    this.root.quaternion.slerp(_q, 1 - Math.exp(-3.4 * dt));
    this.turn = yawRate(this.root.quaternion, prev, dt);
    prev.copy(this.root.quaternion);
  }

  // Attitude, pose and thrusters: the rival leans into its run exactly as the player's mech does.
  fly(dt) {
    _local.copy(this.vel).applyQuaternion(_q.copy(this.root.quaternion).invert());
    const boost = this.ai.state === 'dash';
    this.att.update(dt, { fwd: -_local.z, side: _local.x, climb: _local.y,
      cap: this.def.speed.space, boost, turn: this.turn ?? 0, air: true });
    this.pose.fly(dt, this.att.drive, this.att);
    this.pose.weapons(dt);
    const g = this.mech.group;
    g.rotation.set(this.att.pitch, this.att.yaw, this.att.roll);
    this.mech.setThrust(this.att.flare, this.att.boost);
    this.mech.pack.group.rotation.x = this.att.nozzle;
  }

  weapons(dt, ctx, dist) {
    if (this.ai.shoot) this.shoot(ctx, dist);
    if (this.ai.swing && !this.pose.swinging) this.pose.startSwing();
    if (this.pose.swingHit) this.bladeHit(dist);
  }

  shoot(ctx, dist) {
    const g = this.def.gun;
    this.mech.group.updateMatrixWorld(true);
    this.mech.rifleMuzzle(_from);
    _to.copy(ctx.shipPos).addScaledVector(ctx.shipVel, dist / g.speed);   // lead the ship
    _dir.subVectors(_to, _from).normalize();
    const spread = 0.02 + dist * 0.00009;
    _dir.set(_dir.x + jitter(spread), _dir.y + jitter(spread), _dir.z + jitter(spread)).normalize();
    ctx.bolts.fire(_from, _dir.multiplyScalar(g.speed), g.damage, BOLT_LIFE);
    this.env.combat.fx?.sparks(_from, this.def.glow, 4, 0.3);
    ctx.onFire?.(this);
  }

  bladeHit(dist) {
    const b = this.def.blade;
    this.mech.group.updateMatrixWorld(true);
    this.mech.saberTip(_from);
    this.env.combat.fx?.sparks(_from, this.def.glow, 14, 1.2);
    if (dist > HEIGHT * b.reach * 5) return;
    this.pose.saberImpact();
    this.env.combat.hurtShip(b.damage, _from);
    this.env.space.shake?.(0.7);
  }

  guardChanged() {
    this.bubble.set(this.guard.on);
    if (this.guard.on) this.hooks.onGuard?.(this.def);
  }

  // SpaceCombat calls this from every bolt, rocket, splash and beam hit. Returning false keeps
  // the generic pirate death path (loot, 'pirate' act event) out of the way.
  hit(damage) {
    if (!this.alive) return false;
    const landed = this.guard.soaked(damage);
    this.hp -= landed;
    this.hooks.onDamage?.(Math.round(landed), this.guard.on);
    if (Math.random() < 0.45) this.ai.evade();
    if (this.hp > 0) return false;
    this.hp = 0;
    this.alive = false;         // SpaceCombat drops it from the list on its next pass
    this.dead = true;
    this.bubble.set(false);
    this.hooks.onDefeat?.(this.pos.clone());
    return false;
  }

  // Once dead the rival is no longer in combat.pirates: SpaceDuel keeps the wreck ticking.
  tickDeath(dt) {
    this.deadT += dt;
    const fx = this.env.combat?.fx;
    if (this.deadT < 2.4 && Math.random() < 0.55) {
      _from.copy(this.pos).addScaledVector(_dir.randomDirection(), HEIGHT * 0.5);
      fx?.explode(_from, { color: this.def.glow, size: 1.4 + Math.random() * 2 });
      this.env.sfx?.explosion?.(0.6, _from);
    }
    this.pos.addScaledVector(this.vel, dt);
    this.vel.multiplyScalar(Math.exp(-1.2 * dt));
    this.root.rotation.z += dt * 1.6;
    this.root.scale.setScalar(Math.max(0.05, 1 - this.deadT / 3));
    return this.deadT > 3;
  }

  // Player respawn: never keep a duellist parked on top of the fresh ship.
  relocate(center, distance) {
    this.pos.copy(center).addScaledVector(_dir.randomDirection(), distance);
    this.vel.set(0, 0, 0);
    this.ai.state = 'approach';
    this.ai.gunT = 4;
  }

  dispose() {
    this.bubble.dispose();
    this.pose.dispose();
    disposeRival(this.mech);
    this.root.removeFromParent();
  }
}

const jitter = (a) => (Math.random() - 0.5) * 2 * a;

// Signed yaw change between two frames, in rad/s.
function yawRate(now, prev, dt) {
  _q.copy(prev).invert().multiply(now);
  const y = 2 * Math.atan2(_q.y, _q.w);
  return Math.max(-3, Math.min(3, ((y + Math.PI * 3) % (Math.PI * 2) - Math.PI) / Math.max(dt, 1e-3)));
}
