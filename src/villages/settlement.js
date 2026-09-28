// One settlement on the surface: merged static buildings, animated parts, beacon/lights and residents.
import * as THREE from 'three';
import { Rng, hash32 } from '../core/rng.js';
import { Builder } from './builder.js';
import { layoutFarm, layoutHamlet, layoutTown } from './layout-earth.js';
import { layoutFishing } from './layout-coast.js';
import { layoutResearch, layoutColony, layoutMining } from './layout-space.js';
import { makeMover } from './movers.js';
import { Beacons } from './beacons.js';
import { population } from './population.js';
import { Villager } from './villager.js';
import { VillageLife } from '../life-sim/village-life.js';

const LAYOUTS = { farm: layoutFarm, hamlet: layoutHamlet, town: layoutTown, fishing: layoutFishing,
  research: layoutResearch, colony: layoutColony, mining: layoutMining };
export const COLORS = { farm: '#ffd36b', hamlet: '#ffd36b', fishing: '#6bd4ff', town: '#ffa36b',
  research: '#9ff0ff', colony: '#9cff6a', mining: '#ffc04a' };
const GLOW = { farm: 0xffc070, hamlet: 0xffc070, fishing: 0xffe0a0, town: 0xffb070, research: 0x7df0ff, colony: 0x9cff6a, mining: 0xffa040 };
const ANIMATE = 200, SHOW = 480; // residents animate within ANIMATE m, frozen beyond it, hidden beyond SHOW m (from the site edge)

export class Settlement {
  // site: { type, x, z, yaw, name, seed, r }; signKey: atlas key of its name board.
  constructor(scene, site, h, planet, mats, signKey) {
    Object.assign(this, { scene, site, h, planet, mats });
    const b = new Builder(site, h, planet), rng = new Rng(hash32(site.seed, 0xb17d));
    this.layout = LAYOUTS[site.type](b, rng, signKey);
    this.meshes = b.build(mats);
    for (const m of this.meshes) scene.add(m);
    this.colliders = b.colliders;
    this.zones = b.zones;
    this.zones.push({ x: site.x, z: site.z, r: Math.max(planet.style === 'earth' ? 24 : 14, site.r * 0.7) }); // clearing
    this.makeMovers();
    const top = this.layout.beacon ?? { x: site.x, y: h(site.x, site.z) + 12, z: site.z };
    this.beacons = new Beacons(scene, mats, top, GLOW[site.type], b.lampHeads, this.layout.chimneys);
    this.makePeople();
  }

  makeMovers() {
    this.movers = this.layout.movers.map((m) => makeMover(this.mats.hull, m.kind, m.at, m.opt));
    for (const m of this.movers) this.scene.add(m.object);
  }

  makePeople() {
    const L = this.layout;
    this.people = new THREE.Group();
    this.scene.add(this.people);
    this.villagers = population(this.site, L).map((info) => new Villager(this.mats.body, info, info.seed));
    for (const v of this.villagers) this.people.add(v.group);
    let seed = this.site.seed || 1;
    this.ctx = { h: this.h, planet: this.planet, hub: L.hub, spots: L.spots.length ? L.spots : [L.hub],
      rand: () => ((seed = (seed * 16807) % 2147483647) / 2147483647) };
    this.life = this.ctx.life = new VillageLife(this);
    this.posed = false; // far settlements are posed once, then frozen
  }

  // Distance from the player to the settlement edge (0 inside).
  edgeDistance(p) {
    return Math.max(0, Math.hypot(p.x - this.site.x, p.z - this.site.z) - this.site.r);
  }

  update(dt, t, player, night) {
    const edge = this.edgeDistance(player);
    this.beacons.update(t, edge + this.site.r, night);
    this.people.visible = edge < SHOW;
    for (const m of this.movers) m.object.visible = edge < SHOW * 2;
    if (edge < SHOW * 2) for (const m of this.movers) m.update(t);
    const far = edge > ANIMATE;
    if (far && this.posed) { if (this.awake) this.sleep(); return; }
    this.posed = far;
    this.awake = !far;
    this.life.update(dt);
    for (const v of this.villagers) v.update(dt, this.ctx, player);
  }

  // Out of range: residents freeze in place and animals stop counting them as targets.
  sleep() {
    this.awake = false;
    for (const v of this.villagers) v.vitals.active = false;
  }

  // Closest resident -> { v, d } (d = Infinity when none).
  closestResident(pos) {
    let v = null, d = Infinity;
    for (const r of this.villagers) {
      const k = Math.hypot(pos.x - r.feet.x, pos.z - r.feet.z);
      if (k < d) { v = r; d = k; }
    }
    return { v, d };
  }

  closestDoor(pos) {
    let door = null, d = Infinity;
    for (const q of this.layout.doors) {
      const k = Math.hypot(pos.x - q.x, pos.z - q.z);
      if (k < d) { door = q; d = k; }
    }
    return { door, d };
  }

  dispose() {
    for (const m of this.meshes) { m.removeFromParent(); m.geometry.dispose(); }
    for (const m of this.movers) { m.object.removeFromParent(); m.dispose(); }
    this.life.dispose();
    for (const v of this.villagers) v.dispose();
    this.people.removeFromParent();
    this.beacons.dispose();
    this.meshes = this.movers = this.villagers = [];
  }
}
