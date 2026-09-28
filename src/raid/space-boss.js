// A space boss: one huge procedural model whose turrets, generators, plates and core are pushed
// into combat.pirates as BossParts. Every existing ship weapon therefore damages it, and the
// HUD/minimap already treat it as a hostile. Phases march through def.groups and end at the core.
import * as THREE from 'three';
import { BossPart } from './boss-part.js';
import { BossAttacks } from './space-attacks.js';
import { SPACE_MODELS, disposeModel } from './space-models.js';

const ENGAGE = 1400;   // starts shooting inside this range
const LEAVE = 3600;    // beyond this it goes quiet: the player can always run
const MAX_ESCORTS = 5;
const tmp = new THREE.Vector3();

export class SpaceBoss {
  // ctx: { space, combat, player, sfx }, hooks: { onDamage, onPhase, onDefeat, onNotice }
  constructor(def, ctx, at, hooks = {}) {
    this.def = def;
    this.c = ctx;
    this.hooks = hooks;
    this.model = SPACE_MODELS[def.id](def.radius);
    this.model.root.position.copy(at);
    ctx.space.scene.add(this.model.root);
    this.attacks = new BossAttacks({ ...ctx, boss: this });
    this.parts = [];
    this.buildParts();
    this.stage = 0;
    this.escorts = [];
    this.atkT = 4;
    this.spawnT = 8;
    this.t = 0;
    this.dead = false;
    this.deadT = 0;
    this.enraged = false;
    this.sync();
    this.listStage();
  }

  buildParts() {
    const { def, model } = this;
    for (const g of def.groups) {
      for (const node of model.slots[g.id] ?? []) {
        this.parts.push(new BossPart(this, node, { id: g.id, label: `${g.label} · ${def.short}`, hp: g.hp, radius: def.radius * 0.17 }));
      }
    }
    this.corePart = new BossPart(this, model.slots.core,
      { id: 'core', label: `${def.core.label} · ${def.short}`, hp: def.core.hp, radius: def.radius * 0.3, core: true });
    this.parts.push(this.corePart);
  }

  get position() { return this.model.root.position; }
  get stageLabel() { return this.def.phases[Math.min(this.stage, this.def.phases.length - 1)]; }
  get shipDist() { return this.position.distanceTo(this.c.space.shipObject.position); }

  // Parts of the current phase only: the core stays sealed until its armour is gone.
  stageParts() {
    const g = this.def.groups[this.stage];
    if (!g) return this.parts.filter((p) => p.core && p.alive);
    return this.parts.filter((p) => p.partId === g.id && p.alive);
  }

  listStage() {
    const list = this.c.combat.pirates;
    for (const p of this.stageParts()) {
      if (p.listed) continue;
      p.listed = true;
      list.push(p);
    }
  }

  hp() {
    let now = 0, max = 0;
    for (const p of this.parts) { now += p.hp; max += p.maxHp; }
    return { now, max };
  }

  tookDamage(part, amount) {
    this.hooks.onDamage?.(Math.round(amount), part.pos, part.core);
  }

  partDown(part) {
    const { fx } = this.c.combat;
    fx.explode(part.pos, { color: this.def.glow, size: 2.2 });
    this.c.sfx.explosion?.(0.6);
    part.node.visible = false;
    if (part.core) { this.defeat(); return; }
    if (this.stageParts().length) return;
    this.stage++;
    this.listStage();
    this.hooks.onPhase?.(this.stage, this.stageLabel);
  }

  update(dt) {
    this.t += dt;
    this.sync();
    this.animate(dt);
    this.attacks.updateBeam(dt);
    if (this.dead) { this.deadT += dt; this.cinematic(); return; }
    this.escorts = this.escorts.filter((p) => p.alive && !p.gone);
    const d = this.shipDist;
    if (d > LEAVE || this.c.player.dead) { this.atkT = Math.max(this.atkT, 2); return; }
    this.checkEnrage();
    if (d < ENGAGE) this.fight(dt);
  }

  sync() {
    for (const p of this.parts) p.syncWorld();
  }

  animate(dt) {
    const m = this.model;
    for (const s of m.spin) s.rotation.z += dt * (this.enraged ? 0.5 : 0.22);
    m.root.rotation.y += dt * 0.05;
    const pulse = 1 + Math.sin(this.t * (this.enraged ? 6 : 2.2)) * 0.06;
    m.slots.core.scale.setScalar(pulse);
    // The core only burns once its armour is gone, so "what do I shoot now" is readable.
    const open = this.stage >= this.def.groups.length;
    m.coreMat.emissiveIntensity = open ? (this.enraged ? 2.6 : 1.7) * pulse : 0.12;
    for (const p of this.parts) {
      if (p.flash <= 0 || p.core) continue;
      p.flash -= dt;
      p.node.scale.setScalar(p.flash > 0 ? 1.08 : 1);
    }
  }

  checkEnrage() {
    if (this.enraged || this.corePart.hp > this.def.core.hp * 0.4 || this.stage < this.def.groups.length) return;
    this.enraged = true;
    this.hooks.onPhase?.(this.def.phases.length - 1, this.def.phases[this.def.phases.length - 1]);
    this.hooks.onNotice?.(`${this.def.name} mengamuk!`);
    this.c.space.shake?.(0.8);
  }

  fight(dt) {
    this.atkT -= dt;
    this.spawnT -= dt;
    if (this.def.escorts && this.spawnT <= 0) this.launchEscorts();
    if (this.atkT > 0) return;
    const rush = this.enraged ? 0.68 : 1;
    this.atkT = (3.2 + Math.random() * 2.4) * rush;
    this.pickAttack();
  }

  pickAttack() {
    const live = this.stageParts();
    const from = (live[0] ?? this.corePart).pos;
    const r = Math.random();
    const boost = this.enraged ? 1.35 : 1;
    if (r < 0.45 && live.length) this.attacks.volley(live, Math.round(7 * boost));
    else if (r < 0.75) this.attacks.artillery(from, this.enraged ? 4 : 2, Math.round(16 * boost));
    else this.attacks.startBeam(this.model.slots.core.getWorldPosition(tmp), Math.round(26 * boost));
  }

  launchEscorts() {
    this.spawnT = this.enraged ? 12 : 22;
    if (this.escorts.length >= MAX_ESCORTS) return;
    const n = Math.min(MAX_ESCORTS - this.escorts.length, this.enraged ? 3 : 2);
    const bay = this.model.bays?.[0] ?? this.model.slots.core;
    this.escorts.push(...this.attacks.summon(bay.getWorldPosition(tmp), this.def.escorts, n));
    this.hooks.onNotice?.(`${this.def.short} melepas ${n} pengawal`);
  }

  defeat() {
    if (this.dead) return;
    this.dead = true;
    this.deadT = 0;
    this.unlist();
    this.hooks.onDefeat?.(this.position.clone());
  }

  // Chain of blasts walking down the hull, then the model fades out.
  cinematic() {
    const { fx } = this.c.combat, t = this.deadT;
    if (t > 3.2) { this.model.root.visible = false; return; }
    if (t < 2.6 && Math.random() < 0.5) {
      tmp.copy(this.position).addScaledVector(new THREE.Vector3().randomDirection(), this.def.radius * 0.7);
      fx.explode(tmp, { color: this.def.glow, size: 2 + Math.random() * 3 });
      this.c.sfx.explosion?.(0.7);
      this.c.space.shake?.(0.4);
    }
    this.model.root.scale.setScalar(Math.max(0.05, 1 - t / 3.4));
  }

  unlist() {
    const list = this.c.combat.pirates;
    for (const p of this.parts) {
      p.alive = false;
      p.listed = false;
      const i = list.indexOf(p);
      if (i >= 0) list.splice(i, 1);
    }
  }

  dispose() {
    this.unlist();
    disposeModel(this.model);
  }
}
