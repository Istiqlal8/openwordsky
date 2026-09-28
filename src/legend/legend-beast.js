// A legendary monster as an extra Wildlife group: shootable through Wildlife.raycast/damage
// (blaster, every weapon, splash), so no weapon code needs to know about it.
// Group contract used by Wildlife: bodies(), provoke(ref), kill(ref), update(dt, player), nearest(), dispose().
import * as THREE from 'three';
import { buildCreatureTemplate, riggedParts } from '../view/life/creature-builder.js';
import { glowTexture } from '../gameplay/glow-loot.js';
import { legendGenes } from './legend-data.js';
import { LegendBrain } from './legend-brain.js';

export class LegendBeast {
  // hooks: { onDefeat(point), onRoar(), onStomp() }
  constructor(ctx, def, lair, hooks) {
    this.ctx = ctx;
    this.def = def;
    this.hooks = hooks;
    this.calm = 0; // Wildlife.calmDown() sets this after landing / respawn
    const tpl = buildCreatureTemplate({ genes: legendGenes(def, ctx.planet.seed) });
    this.materials = tpl.materials;
    this.root = tpl.root;
    this.root.name = `legend-${def.id}`;
    this.parts = riggedParts(this.root);
    this.root.scale.setScalar(def.scale);
    this.glowUp();
    const plan = this.parts.plan;
    this.radius = Math.max(plan.rh, plan.bodyY * 0.9, 0.8) * def.scale;
    this.ref = { hp: def.hp, pos: new THREE.Vector3(lair.x, 0, lair.z), name: def.name, sp: null, legend: def.id };
    this.body = { root: this.root, radius: this.radius, ref: this.ref, hp: def.hp };
    this.list = [this.body];
    this.addHalo();
    ctx.surface.scene.add(this.root);
    this.brain = new LegendBrain(this, ctx);
    this.walkT = 0;
    this.dead = false;
    this.deadT = 0;
    this.place();
  }

  // Emissive tint on the (template-owned) materials so the giant glows in its biome colour.
  glowUp() {
    for (const m of this.materials) {
      if (!m.isMeshStandardMaterial) continue;
      m.emissive = new THREE.Color(this.def.glow);
      m.emissiveIntensity = 0.28;
    }
  }

  addHalo() {
    this.tex = glowTexture();
    this.haloMat = new THREE.SpriteMaterial({ map: this.tex, color: this.def.glow, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false });
    const halo = new THREE.Sprite(this.haloMat), h = this.parts.plan.bodyY;
    halo.position.y = h;
    halo.scale.setScalar(h * 3 + 2);
    this.root.add(halo);
  }

  get alive() { return !this.dead; }
  get shake() { return this.brain.shake; }
  get state() { return this.brain.state; }

  bodies() { return this.list; }

  provoke() { this.brain.provoke(); }

  // Called by Wildlife.damage when hp reaches 0.
  kill() {
    if (this.dead) return;
    this.dead = true;
    this.list = [];
    this.brain.enter('dead');
    this.hooks.onDefeat?.(this.root.position.clone());
  }

  roar() { this.hooks.onRoar?.(); }
  stomped() { this.hooks.onStomp?.(); }
  fleeing(on) { this.hooks.onFlee?.(on); }

  nearest() { return null; } // keeps the HUD/scan on ordinary species

  update(dt) {
    if (!this.root) return;
    this.calm -= dt;
    if (this.dead) { this.sink(dt); return; }
    const moving = this.brain.update(dt);
    this.animate(dt, moving);
    this.place();
  }

  animate(dt, moving) {
    const p = this.parts;
    this.walkT += dt * (moving ? 2.2 + moving * 1.6 : 0.8);
    const amp = moving ? 0.55 : 0.05;
    for (const leg of p.legs) leg.rotation.z = Math.sin(this.walkT + (leg.userData.phase ?? 0)) * amp;
    if (p.tail) p.tail.rotation.y = Math.sin(this.walkT * 0.6) * 0.4;
    if (p.body) p.body.rotation.z = (p.body.userData.pitch ?? 0) + (this.brain.state === 'rear' ? 0.35 : 0);
    this.haloMat.opacity = 0.35 + Math.sin(this.walkT * 1.3) * 0.12;
  }

  place() {
    const p = this.ref.pos;
    this.root.position.set(p.x, this.ctx.surface.floorAt(p.x, p.z), p.z);
  }

  // Defeated: roll onto its side and sink away.
  sink(dt) {
    this.deadT += dt;
    const r = this.root.rotation;
    r.z += (1.35 - r.z) * Math.min(1, dt * 2);
    if (this.deadT > 6) this.root.position.y -= dt * 1.5;
    this.root.visible = this.deadT < 14;
  }

  dispose() {
    if (!this.root) return;
    this.root.removeFromParent();
    this.root.traverse((o) => o.geometry?.dispose());
    this.materials.forEach((m) => m.dispose());
    this.haloMat.dispose();
    this.tex.dispose();
    this.brain.dispose();
    this.root = null;
    this.list = [];
  }
}
