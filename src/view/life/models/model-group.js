// Shared plumbing for groups of animals drawn with the rigged GLB models: lazy swap-in of the
// model (a procedural fallback, or nothing, shows until it is loaded), bone animation, distance
// culling with a global skinned-model budget, and the Wildlife group API (bodies/kill/nearest).
import { readyModel, cloneModel, tintedMaterial } from './model-cache.js';
import { BoneAnimator } from './bone-animator.js';

const MAX_ACTIVE = 25; // skinned models drawn per frame across all groups
const FAR = 250; // beyond this an animal is hidden and frozen
const budget = { left: MAX_ACTIVE };

// Called once per frame (by Wildlife) before the model groups update.
export function resetModelBudget() { budget.left = MAX_ACTIVE; }

export function wrapAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

export class ModelGroup {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.dead = [];
    this.materials = new Map();
  }

  // a: { root, model, height, tint, tintStrength?, fallback?: { root, dispose() } }
  attach(a) {
    a.inst = null;
    if (a.fallback) a.root.add(a.fallback.root);
    this.scene.add(a.root);
    this.list.push(a);
    this.swapIn(a);
  }

  materialFor(tpl, tint, strength) {
    const key = `${tpl.name}:${tint}:${strength}`;
    if (!this.materials.has(key)) this.materials.set(key, tintedMaterial(tpl, tint, strength));
    return this.materials.get(key);
  }

  // Replaces the fallback body with the model as soon as the GLB is ready.
  swapIn(a) {
    if (a.inst) return true;
    const tpl = readyModel(a.model);
    if (!tpl) return false;
    a.inst = cloneModel(tpl, this.materialFor(tpl, a.tint, a.tintStrength ?? 0.5));
    a.inst.scene.scale.setScalar(a.height);
    a.root.add(a.inst.scene);
    a.anim = new BoneAnimator(a.inst, a.seed ?? Math.random());
    if (a.fallback) { a.root.remove(a.fallback.root); a.fallback.dispose(); a.fallback = null; }
    return true;
  }

  // Culls by distance/budget and animates. Returns true when the animal is drawn this frame.
  animate(a, dt, player, opts) {
    const d = a.root.position.distanceTo(player);
    const ready = this.swapIn(a);
    const shown = d < FAR && (!ready || budget.left > 0);
    a.root.visible = shown;
    if (!shown || !ready) return shown;
    budget.left--;
    const yawTo = Math.atan2(-(player.z - a.root.position.z), player.x - a.root.position.x);
    const near = d < Math.max(25, a.height * 5);
    a.anim.update(dt, { ...opts, look: near ? wrapAngle(yawTo - a.root.rotation.y) : 0 });
    return true;
  }

  // Shootable bodies: only what the player can actually see.
  bodies() {
    return this.list.filter((a) => a.root.visible && (a.inst || a.fallback))
      .map((a) => ({ root: a.root, radius: a.radius, ref: a, hp: a.maxHp }));
  }

  kill(a) {
    const i = this.list.indexOf(a);
    if (i < 0) return;
    this.scene.remove(a.root);
    this.list.splice(i, 1);
    this.dead.push(a);
    a.inst?.meshes.forEach((m) => m.skeleton.dispose());
  }

  nearest(pos, maxDist = 60) {
    let best = null;
    for (const a of this.list) {
      if (!a.root.visible) continue;
      const dist = a.root.position.distanceTo(pos);
      if (dist < maxDist && (!best || dist < best.distance)) best = { name: a.name, distance: dist };
    }
    return best;
  }

  dispose() {
    for (const a of [...this.list, ...this.dead]) {
      this.scene.remove(a.root);
      a.fallback?.dispose();
      a.inst?.meshes.forEach((m) => m.skeleton.dispose());
    }
    this.materials.forEach((m) => m.dispose());
    this.materials.clear();
    this.list = [];
    this.dead = [];
  }
}
