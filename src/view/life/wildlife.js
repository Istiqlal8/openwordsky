// All animal life on a planet surface: species herds, dinosaurs, megafauna and sea creatures.
// Also the hub of animal-vs-NPC life (life-sim/actors.js): NPC bolts hit animals through damage().
import * as THREE from 'three';
import { Herds } from './herds.js';
import { EarthFauna } from '../../earth/earth-fauna.js';
import { Dinos } from './dinos.js';
import { SeaLife } from './sealife.js';
import { Megafauna } from './megafauna.js';
import { Apex } from './apex.js';
import { Sandworms } from './sandworm.js';
import { resetModelBudget } from './models/model-group.js';
import { actors } from '../../life-sim/actors.js';
import { Bolts } from '../../life-sim/bolts.js';
import { earthBeastOptions } from '../../life-sim/earth-beasts.js';

const sphere = new THREE.Sphere();
const hitPoint = new THREE.Vector3();
const shove = new THREE.Vector3();

export class Wildlife {
  constructor(scene, planet, heightFn, origin) {
    this.flinches = new Map();
    this._fx = null; // FxSystem, set by surface-mode
    this.bolts = new Bolts(scene);
    actors.reset();
    actors.wildlife = this;
    actors.bolts = this.bolts;
    const o = { x: origin.x, z: origin.z };
    // Earth has its own realistic roster (deer, eagles, whales, a dinosaur plain...) plus procedural mammals.
    if (planet.style === 'earth') {
      this.groups = [new Herds(scene, planet, heightFn, o, earthBeastOptions(heightFn)), new EarthFauna(scene, planet, heightFn, o)];
      return;
    }
    this.groups = [new Herds(scene, planet, heightFn, o)];
    if (planet.fauna.dinos) this.groups.push(new Dinos(scene, planet, heightFn, o));
    this.groups.push(new Megafauna(scene, planet, heightFn, o));
    this.groups.push(new Apex(scene, planet, heightFn, o));
    this.groups.push(new Sandworms(scene, planet, heightFn, o));
    if (planet.sea.count) this.groups.push(new SeaLife(scene, planet, heightFn));
  }

  get fx() { return this._fx; }
  set fx(v) { this._fx = v; actors.fx = v; }

  set onBite(cb) { this.groups.forEach((g, i) => { if (i === 0 || 'onBite' in g) g.onBite = cb; }); }

  // Hostile species leave the player alone for a while (landing, respawn).
  calmDown(seconds) { this.groups.forEach((g, i) => { if (i === 0 || 'calm' in g) g.calm = seconds; }); }

  // Settlement animals: role 'mount' | 'flock' near pos, driven by owner.drive() -> animal | null.
  adopt(role, pos, owner) {
    for (const g of this.groups) {
      const a = g.adopt?.(role, pos, owner);
      if (a) return a;
    }
    return null;
  }

  // Nearest creature hit by the ray within range → { group, body } (writes out point) or null.
  raycast(ray, range, out) {
    let best = null, bestD = range;
    for (const group of this.groups) {
      for (const body of group.bodies?.() ?? []) {
        sphere.center.copy(body.root.position).y += body.radius * 0.8;
        sphere.radius = body.radius;
        if (!ray.intersectSphere(sphere, hitPoint)) continue;
        const d = hitPoint.distanceTo(ray.origin);
        if (d < bestD) { bestD = d; best = { group, body }; out.copy(hitPoint); }
      }
    }
    return best;
  }

  // Applies one hit (player blaster by default; opts: { amount, from, npc }). Returns true when the creature dies.
  damage({ group, body }, point, opts = {}) {
    const ref = body.ref, from = opts.from ?? this.player;
    ref.hp = (ref.hp ?? body.hp) - (opts.amount ?? 25);
    if (opts.npc) group.npcHit?.(ref, from, ref.hp / (body.hp || 1));
    else group.provoke(ref);
    this.hitReaction(body, point, from);
    if (ref.hp > 0) return false;
    group.kill(ref);
    this.onKill?.(point.clone(), ref.name ?? ref.sp?.name ?? 'Makhluk', ref.sp ?? null);
    return true;
  }

  // Visible feedback: blood-like spray, a knock-back shove and a quick flinch (squash).
  hitReaction(body, point, from = this.player) {
    this.fx?.sparks(point, 0xd8322a, 10, 0.8);
    this.fx?.puff?.(point, 0x7a1a14, 0.5, 0.5);
    const ref = body.ref, root = body.root;
    if (ref.pos && from) {
      shove.subVectors(ref.pos, from).setY(0).normalize().multiplyScalar(Math.min(0.5, 1.2 / Math.max(1, body.radius)));
      ref.pos.add(shove);
    }
    if (!this.flinches.has(root)) this.flinches.set(root, { t: 0, base: root.scale.clone() });
    else this.flinches.get(root).t = 0;
  }

  tickFlinches(dt) {
    for (const [root, f] of this.flinches) {
      f.t += dt;
      const k = f.t < 0.18 ? Math.sin((f.t / 0.18) * Math.PI) * 0.18 : 0;
      root.scale.set(f.base.x * (1 + k), f.base.y * (1 - k), f.base.z * (1 + k));
      if (f.t >= 0.18) { root.scale.copy(f.base); this.flinches.delete(root); }
    }
  }

  update(dt, player) {
    this.player = player;
    this.tickFlinches(dt);
    resetModelBudget();
    for (const g of this.groups) g.update(dt, player);
    actors.update(dt);
    this.bolts.update(dt);
  }

  nearest(pos) {
    let best = null;
    for (const g of this.groups) {
      const n = g.nearest(pos);
      if (n && (!best || n.distance < best.distance)) best = n;
    }
    return best;
  }

  dispose() {
    for (const g of this.groups) g.dispose();
    this.groups = [];
    this.bolts.dispose();
    if (actors.wildlife === this) { actors.wildlife = null; actors.bolts = null; actors.reset(); }
  }
}
