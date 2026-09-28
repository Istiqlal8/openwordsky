// NPC health and self-defence: registers the NPC as an actor that animals can hunt, takes bites,
// then decides to flee (unarmed) or fight (armed: blaster bolts at the attacker). At 0 hp the NPC
// lies down and gets back up later with part of its health: nobody dies for good.
import * as THREE from 'three';
import { actors, aliveRef } from './actors.js';

const RANGE = 38;        // shooting range
const REGEN = 2;         // hp per second while calm
const _muzzle = new THREE.Vector3();
const rand = (a, b) => a + Math.random() * (b - a);

// Shootable body for an attacker record { group, ref }.
export function bodyOf(att) {
  const ref = att.ref;
  return ref.body ?? (att.body ??= { root: ref.root, radius: ref.radius ?? 1, ref, hp: ref.maxHp ?? 60 });
}

export class Vitals {
  // owner: { feet: {x,y,z} }; opts: { maxHp, armed, faction, radius, color, damage, rate }
  constructor(owner, opts = {}) {
    this.owner = owner;
    this.pos = owner.feet;
    this.maxHp = this.hp = opts.maxHp ?? 100;
    this.armed = Boolean(opts.armed);
    this.faction = opts.faction ?? 'villager';
    this.radius = opts.radius ?? 0.45;
    this.color = opts.color ?? 0xffa040;
    this.damage = opts.damage ?? 8;
    this.rate = opts.rate ?? 0.8;
    this.beam = Boolean(opts.beam); // mining beam instead of blaster bolts
    Object.assign(this, { mode: null, modeT: 0, target: null, hunter: null, down: false, hidden: false,
      active: false, flinch: 0, cd: 0 });
    actors.register(this);
  }

  bitten(dmg, att) {
    if (this.down) return;
    this.hp -= dmg;
    this.flinch = 0.3;
    if (this.hp <= 0) return this.fall();
    this.target = att;
    const brave = this.armed && this.hp > this.maxHp * 0.3;
    this.setMode(brave ? 'fight' : 'flee', brave ? 14 : 9);
  }

  // A neighbour is attacked: armed NPCs join in.
  help(att) {
    if (this.down || this.hidden) return;
    this.target = att;
    this.setMode('fight', 12);
  }

  fall() {
    this.hp = 0;
    this.down = true;
    this.target = null;
    this.setMode('down', rand(12, 20));
  }

  setMode(mode, t) { this.mode = mode; this.modeT = t; }

  // -> null (normal routine) | 'down' | 'up' | 'fight' | 'flee' | 'cheer'
  update(dt) {
    this.flinch = Math.max(0, this.flinch - dt);
    this.cd -= dt;
    if (!this.mode) { this.hp = Math.min(this.maxHp, this.hp + REGEN * dt); return null; }
    this.modeT -= dt;
    if (this.mode === 'down' && this.modeT <= 0) { this.down = false; this.hp = this.maxHp * 0.6; this.setMode('up', 1.4); }
    else if (this.mode === 'fight' && !aliveRef(this.target?.ref)) this.setMode('cheer', this.target ? 1.8 : 0);
    else if (this.modeT <= 0 && this.mode !== 'down') { this.mode = null; this.target = null; this.hidden = false; }
    return this.mode;
  }

  // Distance to the current target's body (Infinity without one).
  targetDistance() {
    const t = this.target?.ref?.root?.position;
    return t ? Math.hypot(t.x - this.pos.x, t.z - this.pos.z) : Infinity;
  }

  // Fires a bolt from a hand at height `y` toward the target when the cooldown allows.
  shoot(y = 1.35) {
    if (this.cd > 0 || !this.target || !actors.bolts || this.targetDistance() > RANGE) return false;
    this.cd = this.rate * rand(0.8, 1.3);
    _muzzle.set(this.pos.x, this.pos.y + y, this.pos.z);
    const hit = { group: this.target.group, body: bodyOf(this.target) };
    if (this.beam) actors.bolts.zap(_muzzle, hit, this.color, this.damage * 0.7);
    else actors.bolts.fire(_muzzle, hit, this.color, this.damage);
    return true;
  }

  dispose() { actors.unregister(this); }
}
