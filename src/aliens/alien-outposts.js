// AlienOutposts: one alien village on ~35% of solid planets with air (never on Earth):
// race-styled buildings, a beacon seen from afar, residents going about their day, and a
// vendor to trade with. Placement is deterministic from the planet seed.
import * as THREE from 'three';
import { Rng, hash32 } from '../core/rng.js';
import { GeoKit } from './body-kit.js';
import { AlienBody } from './alien-body.js';
import { AlienResident } from './alien-resident.js';
import { BUILDING, outpostMats } from './outpost-buildings.js';
import { OutpostBeacon, buildStall } from './outpost-beacon.js';
import { hasOutpost, raceFor, alienName, greetLine, loreLine } from './races.js';
import { createVendorState, tradeWith } from './alien-trade.js';

const SALT = 0xa1e5;
const TALK_RANGE = 8, TRADE_RANGE = 5;
const ACTIVE_RANGE = 320;  // residents only animate while the player is this close

export class AlienOutposts {
  constructor(surface, player) {
    this.surface = surface;
    this.player = player;
    this.residents = [];
    this.items = [];
    this.result = { name: '', race: '', distance: 0, line: null, vendor: false, canTrade: false };
    this.time = 0;
    this.planet = null;
    this.site = null;
  }

  mount(planet) {
    this.dispose();
    if (!hasOutpost(planet)) return;
    const rng = new Rng(hash32(planet.seed, SALT));
    this.planet = planet;
    const center = this.findSite(rng, 24);
    if (!center) { this.planet = null; return; }
    this.race = raceFor(planet);
    this.kit = new GeoKit();
    this.mats = outpostMats(this.race, rng);
    this.group = new THREE.Group();
    this.group.position.set(center.x, 0, center.z);
    this.surface.scene.add(this.group);
    this.center = center;
    this.site = { id: `alien-outpost-${planet.seed}`, name: `Desa ${alienName(this.race, rng)}`,
      race: this.race.name, color: this.race.glow, position: new THREE.Vector3(center.x, center.y + 12, center.z) };
    this.build(rng);
    this.keepClear(center, 32);
  }

  // Dry, fairly flat spot 150..400 units from spawn -> { x, y, z } | null.
  findSite(rng, radius) {
    const { spawn } = this.surface, t = this.planet.terrain;
    const minY = t.hasWater ? t.waterY + 0.8 : -Infinity;
    let best = null, bestScore = Infinity;
    for (let k = 0; k < 40 && bestScore > 2.5; k++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(150, 400);
      const x = spawn.x + Math.cos(a) * r, z = spawn.z + Math.sin(a) * r;
      const { low, high } = this.groundRange(x, z, radius);
      if (low <= minY || high - low >= bestScore) continue;
      best = { x, y: this.surface.h(x, z), z };
      bestScore = high - low;
    }
    return best;
  }

  groundRange(x, z, r) {
    const h = this.surface.h;
    let low = h(x, z), high = low;
    for (let ring = 0.5; ring <= 1; ring += 0.5) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, y = h(x + Math.cos(a) * r * ring, z + Math.sin(a) * r * ring);
        low = Math.min(low, y);
        high = Math.max(high, y);
      }
    }
    return { low, high };
  }

  // Village layout: beacon in the middle, stall toward the spawn, buildings on a ring.
  build(rng) {
    const c = this.center, sp = this.surface.spawn;
    const toSpawn = Math.atan2(sp.z - c.z, sp.x - c.x);
    this.beacon = new OutpostBeacon(this.kit, this.mats, this.race.glow);
    this.place(this.beacon.group, 0, 0, 1.6);
    this.spots = [];
    this.spinners = [];
    this.solids = [{ x: c.x, z: c.z, r: 1.6 }]; // beacon
    const n = 3 + rng.int(4);
    for (let i = 0; i < n; i++) {
      const a = toSpawn + 0.7 + (i / n) * (Math.PI * 2 - 1.4) + rng.range(-0.15, 0.15);
      this.addBuilding(rng, a, rng.range(14, 19));
    }
    this.addVendor(rng, toSpawn);
    const count = 3 + rng.int(6);
    for (let i = 0; i < count; i++) this.addResident(hash32(this.planet.seed, SALT, i), false, null);
  }

  // Solid building footprints (world x/z circles) for player collision.
  colliders() { return this.solids ?? []; }

  // Put a child at village-local (x, z), resting on the lowest ground under radius r.
  place(obj, x, z, r) {
    const wx = this.center.x + x, wz = this.center.z + z;
    obj.position.set(x, this.groundRange(wx, wz, r).low - 0.25, z);
    this.group.add(obj);
  }

  addBuilding(rng, angle, dist) {
    const { group, r } = BUILDING[this.race.building](this.kit, this.mats, rng);
    const x = Math.cos(angle) * dist, z = Math.sin(angle) * dist;
    group.rotation.y = Math.atan2(x, z); // front (-Z) faces the village centre
    this.place(group, x, z, r);
    this.solids.push({ x: this.center.x + x, z: this.center.z + z, r: r * 0.85 });
    if (group.userData.spin) this.spinners.push(group.userData.spin);
    const k = (dist - r - 1.5) / dist;
    this.spots.push({ x: this.center.x + x * k, z: this.center.z + z * k });
  }

  addVendor(rng, toSpawn) {
    const x = Math.cos(toSpawn) * 8, z = Math.sin(toSpawn) * 8;
    const stall = buildStall(this.kit, this.mats);
    stall.rotation.y = Math.atan2(-x, -z); // counter faces away from the centre
    stall.scale.setScalar(Math.max(1, this.race.height[1] / 2.4)); // tall races need a higher canopy
    this.place(stall, x, z, 2);
    const behind = 0.5 / 8;
    const seed = hash32(this.planet.seed, SALT, 0xbe7d);
    const v = this.addResident(seed, true, { x: this.center.x + x * (1 - behind), z: this.center.z + z * (1 - behind) });
    v.yaw = stall.rotation.y;
    this.vendorState = createVendorState(v.name, this.race, seed);
  }

  addResident(seed, vendor, at) {
    const rng = new Rng(seed);
    const body = new AlienBody(this.race, this.kit, rng);
    const a = rng.range(0, Math.PI * 2), d = rng.range(4, 12);
    const start = at ?? { x: this.center.x + Math.cos(a) * d, z: this.center.z + Math.sin(a) * d };
    const r = new AlienResident(this.surface.scene, { id: `alien-${seed}`, name: alienName(this.race, rng), body,
      home: this.center, radius: 16, spots: this.spots, vendor, start, yaw: rng.range(0, Math.PI * 2) });
    r.seed = seed;
    r.greets = 0;
    this.residents.push(r);
    return r;
  }

  keepClear(c, r) {
    const props = this.surface.props;
    if (!props) return;
    this.zone = { x: c.x, z: c.z, r };
    props.extraZones.push(this.zone);
    props.rebuild(this.surface.center.x, this.surface.center.z);
  }

  update(dt, playerPos = this.surface.position) {
    if (!this.site) return;
    dt = Math.min(dt, 0.1);
    this.time += dt;
    this.beacon.update(dt, this.time);
    for (const s of this.spinners) s.rotation.z += dt * 0.4;
    if (Math.hypot(playerPos.x - this.center.x, playerPos.z - this.center.z) > ACTIVE_RANGE) return;
    const h = this.surface.h;
    for (const r of this.residents) r.update(dt, h, this.planet, playerPos);
  }

  // Closest resident -> { name, race, distance, line, vendor, canTrade } | null (object reused).
  nearest(pos) {
    const best = this.closest(pos);
    if (!best) return null;
    const { r, d } = best, talking = d < TALK_RANGE;
    if (talking && !r.line) r.line = greetLine(this.race, new Rng(hash32(r.seed, r.greets++)));
    if (d > TALK_RANGE + 2) r.line = null;
    return Object.assign(this.result, { name: r.name, race: this.race.name, distance: d,
      line: talking ? r.line : null, vendor: r.vendor, canTrade: r.vendor && d < TRADE_RANGE });
  }

  closest(pos) {
    let best = null, bestD = Infinity;
    for (const r of this.residents) {
      const d = Math.hypot(pos.x - r.feet.x, pos.z - r.feet.z);
      if (d < bestD) { best = r; bestD = d; }
    }
    return best ? { r: best, d: bestD } : null;
  }

  // T near an alien: trade with the vendor, or hear a resident's story -> { title, text } | null.
  interact(pos) {
    const best = this.closest(pos);
    if (!best || best.d > TRADE_RANGE) return null;
    if (best.r.vendor) return tradeWith(this.vendorState, this.player);
    const rng = new Rng(hash32(best.r.seed, 0x10e, best.r.greets++));
    return { title: `${best.r.name} · ${this.race.name}`,
      text: `"${loreLine(this.race, rng)}" Pedagang kami menunggu di kios dekat suar.` };
  }

  // Minimap markers for the residents (array and entries reused).
  list() {
    const out = this.items;
    out.length = 0;
    for (const r of this.residents) out.push(r.mark ??= { id: r.id, position: r.feet, kind: 'alien' });
    return out;
  }

  dispose() {
    this.solids = [];
    for (const r of this.residents) r.dispose();
    this.residents = [];
    this.items.length = 0;
    this.beacon?.dispose();
    this.group?.removeFromParent();
    this.mats?.all.forEach((m) => m.dispose());
    this.kit?.dispose();
    this.releaseZone();
    Object.assign(this, { beacon: null, group: null, mats: null, kit: null, site: null, planet: null, vendorState: null });
  }

  releaseZone() {
    const props = this.surface.props, zones = props?.extraZones;
    const i = zones ? zones.indexOf(this.zone) : -1;
    if (i >= 0) {
      zones.splice(i, 1);
      if (props.meshes.length) props.rebuild(this.surface.center.x, this.surface.center.z);
    }
    this.zone = null;
  }
}
