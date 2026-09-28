// Tamed creature that follows the player; respawns beside them on every landing.
import * as THREE from 'three';
import { rngOf } from '../core/rng.js';
import { word } from '../gen/names.js';
import { buildCreatureTemplate, riggedParts } from '../view/life/creature-builder.js';
import { Hearts } from './hearts.js';

const TAME_RANGE = 5;
const FOLLOW = 3;
const FOOD = 'Protein Fauna';

export class PetKeeper {
  constructor(surface, player) {
    this.surface = surface;
    this.player = player;
    this.body = null; // { root, parts, materials, pos, t, record }
    this.planetRef = null;
    this.hearts = null;
  }

  // -> { name, speciesName, distance } | null
  get pet() {
    const b = this.body;
    if (!b) return null;
    const f = this.surface.feet;
    return { name: b.record.name, speciesName: b.record.speciesName, distance: Math.hypot(b.pos.x - f.x, b.pos.z - f.z) };
  }

  // Nearest calm, ground-bound herd animal within reach of the player.
  candidate(wildlife) {
    const herd = wildlife?.groups?.[0], f = this.surface.feet;
    let best = null, bestD = TAME_RANGE;
    for (const a of herd?.animals ?? []) {
      if (a.hostile || a.sp.genes.move === 'terbang') continue;
      const d = Math.hypot(a.pos.x - f.x, a.pos.z - f.z);
      if (d < bestD) { best = a; bestD = d; }
    }
    return best ? { herd, a: best } : null;
  }

  // -> notice text, or null when no tameable creature is near (so T can fall through).
  tryTame(wildlife, player = this.player) {
    const c = this.candidate(wildlife);
    if (!c) return null;
    if (!player.removeItem(FOOD, 1)) return `Butuh 1 ${FOOD} untuk menjinakkan`;
    const { herd, a } = c;
    const name = word(rngOf(a.sp.genes.seed ?? 7, this.surface.planet?.seed ?? 0, Math.round(a.pos.x)));
    player.pet = { name, speciesName: a.sp.name, genes: a.sp.genes, scale: a.root.scale.x };
    herd.kill(a);
    this.spawn(player.pet, a.pos.x, a.pos.z);
    this.cheer();
    return `${name} (${a.sp.name}) kini peliharaanmu!`;
  }

  spawn(record, x, z) {
    this.despawn();
    const tpl = buildCreatureTemplate({ genes: record.genes });
    const root = tpl.root;
    root.scale.setScalar(record.scale ?? 1);
    this.surface.scene.add(root);
    this.hearts ??= new Hearts(this.surface.scene);
    this.body = { root, parts: riggedParts(root), materials: tpl.materials, record,
      pos: new THREE.Vector3(x, 0, z), t: 0, hop: 0 };
    this.place();
  }

  // Heart burst above the pet's head.
  cheer() {
    const b = this.body;
    this.hearts.burst(b.root.position, 0.8 + (b.record.scale ?? 1) * 1.2);
  }

  despawn() {
    const b = this.body;
    if (!b) return;
    b.root.parent?.remove(b.root);
    b.root.traverse((o) => o.geometry?.dispose());
    b.materials.forEach((m) => m.dispose());
    this.body = null;
  }

  // New landing: rebuild the saved pet next to the player.
  sync() {
    const planet = this.surface.planet;
    if (planet === this.planetRef) return;
    this.planetRef = planet;
    this.despawn();
    const rec = this.player.pet;
    if (!planet || !rec?.genes) return;
    const f = this.surface.feet;
    this.spawn(rec, f.x + 2, f.z + 2);
    this.cheer();
  }

  update(dt) {
    this.sync();
    this.hearts?.update(dt);
    const b = this.body;
    if (!b) return;
    const moving = this.surface.flying ? 0 : this.follow(b, dt);
    this.animate(b, moving, dt);
    this.place();
  }

  follow(b, dt) {
    const f = this.surface.feet;
    const dx = f.x - b.pos.x, dz = f.z - b.pos.z, dist = Math.hypot(dx, dz);
    if (dist > 60) { b.pos.set(f.x + 2, 0, f.z + 2); return 0; }
    const keep = FOLLOW + (b.record.scale ?? 1) * 0.8; // big pets keep more room
    if (dist < keep) return 0;
    const v = Math.min(dist - keep + 0.1, Math.max(6, dist * 1.4) * dt);
    b.pos.x += (dx / dist) * v;
    b.pos.z += (dz / dist) * v;
    const r = b.root.rotation, yaw = Math.atan2(-dz, dx);
    r.y += Math.atan2(Math.sin(yaw - r.y), Math.cos(yaw - r.y)) * Math.min(1, dt * 6);
    return 1;
  }

  animate(b, moving, dt) {
    b.t += dt * (moving ? 9 : 2.5);
    b.hop = moving ? Math.abs(Math.sin(b.t)) * 0.35 : Math.max(0, Math.sin(b.t * 0.5)) * 0.06;
    for (const leg of b.parts.legs) leg.rotation.z = Math.sin(b.t + leg.userData.phase) * 0.6 * moving;
    for (const w of b.parts.wings) w.rotation.x = Math.sin(b.t * 3) * 0.7 * w.userData.side;
    if (b.parts.tail) b.parts.tail.rotation.y = Math.sin(b.t * (moving ? 0.5 : 1.6)) * 0.5;
  }

  place() {
    const b = this.body, s = this.surface;
    const hover = b.record.genes.move === 'melayang' ? 1.3 : 0;
    b.root.position.set(b.pos.x, s.floorAt(b.pos.x, b.pos.z) + hover + b.hop, b.pos.z);
  }

  dispose() {
    this.despawn();
    this.hearts?.dispose();
    this.hearts = null;
    this.planetRef = null; // a later update() rebuilds the pet on the next landing
  }
}
