// All animal life on a planet surface: species herds, dinosaurs, megafauna and sea creatures.
import * as THREE from 'three';
import { Herds } from './herds.js';
import { EarthFauna } from '../../earth/earth-fauna.js';
import { Dinos } from './dinos.js';
import { SeaLife } from './sealife.js';
import { Megafauna } from './megafauna.js';
import { resetModelBudget } from './models/model-group.js';

const sphere = new THREE.Sphere();
const hitPoint = new THREE.Vector3();

export class Wildlife {
  constructor(scene, planet, heightFn, origin) {
    const o = { x: origin.x, z: origin.z };
    this.groups = [new Herds(scene, planet, heightFn, o)];
    // Earth has its own realistic roster (deer, eagles, whales, a dinosaur plain...).
    if (planet.style === 'earth') { this.groups.push(new EarthFauna(scene, planet, heightFn, o)); return; }
    if (planet.fauna.dinos) this.groups.push(new Dinos(scene, planet, heightFn, o));
    this.groups.push(new Megafauna(scene, planet, heightFn, o));
    if (planet.sea.count) this.groups.push(new SeaLife(scene, planet, heightFn));
  }

  set onBite(cb) { this.groups.forEach((g, i) => { if (i === 0 || 'onBite' in g) g.onBite = cb; }); }

  // Hostile species leave the player alone for a while (landing, respawn).
  calmDown(seconds) { this.groups.forEach((g, i) => { if (i === 0 || 'calm' in g) g.calm = seconds; }); }

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

  // Applies one blaster hit. Returns true when the creature dies.
  damage({ group, body }, point) {
    const ref = body.ref;
    ref.hp = (ref.hp ?? body.hp) - 25;
    group.provoke(ref);
    if (ref.hp > 0) return false;
    group.kill(ref);
    this.onKill?.(point.clone(), ref.name ?? ref.sp?.name ?? 'Makhluk', ref.sp ?? null);
    return true;
  }

  update(dt, player) {
    resetModelBudget();
    for (const g of this.groups) g.update(dt, player);
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
  }
}
