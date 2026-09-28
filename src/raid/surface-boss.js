// An on-foot boss presented to the game as one extra Wildlife group. Every hittable piece is a
// Wildlife "body", so the Multitool blaster, all seven weapons, grenades and splash damage reach
// it through the paths that already exist — nothing in src/gameplay/ or src/weapons/ changes.
// Group contract used by Wildlife: bodies(), provoke(ref), kill(ref), update(dt, player), nearest(), dispose().
import * as THREE from 'three';
import { SURFACE_MODELS, disposeSurfaceModel } from './surface-models.js';
import { BossBrain } from './surface-brain.js';

const SHIELD_SOAK = 0.9; // fraction of a hit the shield gives back (Wildlife subtracts first)
const HIT_UNIT = 25;     // one Wildlife.damage() call
const _w = new THREE.Vector3();

export class SurfaceBoss {
  // hooks: { onDamage(n, pos), onPhase(i, label), onDefeat(pos), onNotice(text) }
  constructor(ctx, def, site, hooks = {}) {
    this.ctx = ctx;
    this.def = def;
    this.hooks = hooks;
    this.calm = 0;
    this.model = SURFACE_MODELS[def.id](def.radius);
    ctx.surface.scene.add(this.model.root);
    this.pos = { x: site.x, z: site.z };
    this.yaw = 0;
    this.stage = 0;
    this.enraged = false;
    this.dead = false;
    this.deadT = 0;
    this.sag = 0;
    this.walkT = 0;
    this.hasBeam = def.id === 'titan-penjaga';
    this.parts = [];
    this.buildParts();
    this.shield = this.buildShield();
    this.brain = new BossBrain(this, ctx);
    this.place(0);
  }

  buildParts() {
    const { def, model, ctx } = this;
    const add = (node, id, label, hp, r) => {
      const proxy = new THREE.Object3D();
      ctx.surface.scene.add(proxy);
      const ref = { hp, name: `${label} · ${def.short}`, sp: null, boss: def.id, part: id, hostile: true };
      // A limb's group sits at its joint; userData.hit marks the point the hit sphere belongs on.
      this.parts.push({ node, hitNode: node.userData?.hit ?? node, proxy, id, ref, root: proxy, radius: r, hp, max: hp, alive: true });
    };
    for (const g of def.groups) {
      for (const node of model.slots[g.id] ?? []) add(node, g.id, g.label, g.hp, def.radius * (g.id === 'leg' ? 0.85 : 0.4));
    }
    add(model.slots.core, 'core', def.core.label, def.core.hp, def.radius * 0.6);
    this.core = this.parts[this.parts.length - 1];
  }

  buildShield() {
    const geo = new THREE.SphereGeometry(this.def.radius * 2.1, 16, 12);
    const mat = new THREE.MeshBasicMaterial({ color: this.def.glow, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    this.model.root.add(mesh);
    mesh.position.y = this.def.radius * 1.8;
    return { geo, mat, mesh };
  }

  setShield(on) {
    this.shield.mesh.visible = on;
    if (on) this.hooks.onNotice?.(`${this.def.name} menaikkan perisai`);
  }

  get shielded() { return this.brain?.shielded ?? false; }
  get alive() { return !this.dead; }
  get shake() { return this.brain.shake; }
  get stageLabel() { return this.def.phases[Math.min(this.stage, this.def.phases.length - 1)]; }

  headPoint(out) {
    return this.model.head ? this.model.head.getWorldPosition(out) : out.set(this.pos.x, 0, this.pos.z);
  }

  // Only the phase that is currently vulnerable is shootable.
  bodies() {
    if (this.dead) return [];
    const g = this.def.groups[this.stage];
    const want = g ? g.id : 'core';
    return this.parts.filter((p) => p.alive && p.id === want);
  }

  hp() {
    let now = 0, max = 0;
    for (const p of this.parts) { now += Math.max(0, p.ref.hp); max += p.max; }
    return { now, max };
  }

  // Wildlife calls this on every landed hit, after subtracting the damage.
  provoke(ref) {
    this.brain.wake();
    if (this.shielded && ref.hp > 0) ref.hp += HIT_UNIT * SHIELD_SOAK;
    this.hooks.onDamage?.(Math.round(HIT_UNIT * (this.shielded ? 1 - SHIELD_SOAK : 1)), ref, this.shielded);
    if (!this.enraged && this.stage >= this.def.groups.length && this.core.ref.hp < this.core.max * 0.4) this.enrage();
  }

  enrage() {
    this.enraged = true;
    this.brain.shielded = false;
    this.setShield(false);
    this.hooks.onPhase?.(this.def.phases.length - 1, this.def.phases[this.def.phases.length - 1]);
    this.hooks.onNotice?.(`${this.def.name} mengamuk!`);
  }

  kill(ref) {
    const part = this.parts.find((p) => p.ref === ref);
    if (!part || !part.alive) return;
    part.alive = false;
    part.node.visible = false;
    this.ctx.fx?.explode(part.proxy.position, { color: this.def.glow, size: 1.6 });
    this.ctx.sfx?.explosion?.(0.5);
    if (part === this.core) { this.defeat(); return; }
    if (this.bodies().length) return;
    this.stage++;
    this.hooks.onPhase?.(this.stage, this.stageLabel);
  }

  defeat() {
    this.dead = true;
    this.brain.state = 'dead';
    this.setShield(false);
    this.hooks.onDefeat?.(new THREE.Vector3(this.pos.x, this.ctx.surface.floorAt(this.pos.x, this.pos.z) + this.def.radius, this.pos.z));
  }

  roar() {
    const s = this.ctx.sfx;
    if (!s?.live || !s.t || !s.n) return;
    s.t({ type: 'square', f0: 120, f1: 48, dur: 1.1, gain: 0.3, attack: 0.08 });
    s.n({ filter: 'lowpass', f0: 800, f1: 110, dur: 1.2, gain: 0.26, attack: 0.06, rate: 0.6 });
  }

  stomped() {
    this.roar();
    this.ctx.sfx?.explosion?.(0.5);
  }

  update(dt) {
    this.calm -= dt;
    if (this.dead) { this.deadT += dt; this.collapse(dt); this.sync(); return; }
    const moving = this.brain.update(dt);
    this.animate(dt, moving);
    this.place(dt);
    this.sync();
  }

  animate(dt, moving) {
    this.walkT += dt * (moving ? 1.6 + moving * 0.9 : 0.5);
    const amp = moving ? 0.5 : 0.06;
    for (const hip of this.model.slots.leg ?? []) {
      const d = hip.userData;
      hip.rotation.x = Math.sin(this.walkT + d.phase) * amp;
      d.knee.rotation.x = Math.max(0, -Math.sin(this.walkT + d.phase)) * amp * 1.4;
    }
    // Legs gone: the machine sinks onto its belly and the core comes within reach.
    const want = this.stage > 0 && this.def.groups[0]?.id === 'leg' ? 1 : 0;
    this.sag += (want - this.sag) * Math.min(1, dt * 1.5);
    const m = this.model;
    m.body.rotation.x = this.sag * 0.3;
    m.root.position.y = -this.sag * m.legLen * 1.2;
    if (m.slots.rune) for (const r of m.slots.rune) r.rotation.y += dt * 1.4;
    m.slots.core.rotation.y += dt * (this.enraged ? 3 : 1.2);
    // Dark until its phase: the glowing core is the signal that it can be hurt.
    const open = this.stage >= this.def.groups.length;
    m.coreMat.emissiveIntensity = open ? (this.enraged ? 2.6 : 1.6) : 0.1;
  }

  place() {
    const { x, z } = this.pos;
    const floor = this.ctx.surface.floorAt(x, z);
    this.model.root.position.set(x, floor + this.model.root.position.y, z);
    this.model.root.rotation.y = this.yaw + Math.PI;
  }

  // Hit proxies follow the model parts in world space; Wildlife raycasts against these.
  sync() {
    this.model.root.updateMatrixWorld(true);
    for (const p of this.parts) p.proxy.position.copy(p.hitNode.getWorldPosition(_w));
  }

  collapse(dt) {
    const m = this.model;
    m.root.rotation.z += (1.1 - m.root.rotation.z) * Math.min(1, dt * 1.2);
    if (this.deadT > 5) m.root.position.y -= dt * 2.5;
    m.root.visible = this.deadT < 12;
  }

  nearest() { return null; } // keeps the scan HUD on ordinary species

  dispose() {
    this.brain.dispose();
    for (const p of this.parts) p.proxy.removeFromParent();
    this.shield.geo.dispose();
    this.shield.mat.dispose();
    disposeSurfaceModel(this.model);
    this.parts.length = 0;
  }
}
