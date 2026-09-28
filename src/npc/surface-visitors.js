// SurfaceVisitors: other explorers on the same planet (landed ship + walking astronaut),
// occasional low fly-overs, departures and new arrivals. Spawn picks come from the planet seed.
import * as THREE from 'three';
import { Rng, hash32 } from '../core/rng.js';
import { word } from '../gen/names.js';
import { shipDesign } from '../view/ship/ship-design.js';
import { SurfaceShip } from './surface-ship.js';
import { Explorer } from './explorer.js';
import { findParking, restHeight } from './terrain-spots.js';
import { greeting } from './greetings.js';

const SALT = 0x5e7;
const ACCENTS = [0x4fd8ff, 0x7dff6a, 0xff5ab4, 0xffe04a, 0xb57bff, 0x3affc8, 0xff6a5a];
const TALK_RANGE = 8;
const rand = (a, b) => a + Math.random() * (b - a);
const tmpFrom = new THREE.Vector3();
const tmpDir = new THREE.Vector3();

export const hostsVisitors = (planet) => !planet.gas && planet.atmosphereDensity > 0;

export class SurfaceVisitors {
  constructor(surface) {
    this.surface = surface;
    this.visitors = [];   // { explorer, ship, line }
    this.flyers = [];     // SurfaceShip fly-overs
    this.items = [];
    this.result = { name: '', distance: 0, line: null };
    this.planet = null;
  }

  mount(planet) {
    this.dispose();
    this.planet = planet;
    this.serial = 0;
    const rng = new Rng(hash32(planet.seed, SALT));
    this.flyTimer = rng.range(20, 60);
    this.arrivals = [];
    if (!hostsVisitors(planet) || !rng.chance(0.85)) return;
    const count = 1 + rng.int(3);
    for (let i = 0; i < count; i++) this.spawn(hash32(planet.seed, SALT, this.serial++), false);
  }

  // Parking circles to keep clear: player spawn, player ship, other NPC ships.
  avoidList() {
    const s = this.surface, out = [{ x: s.spawn.x, z: s.spawn.z, r: 25 }];
    if (s.shipPosition) out.push({ x: s.shipPosition.x, z: s.shipPosition.z, r: 22 });
    for (const v of this.visitors) out.push({ x: v.ship.position.x, z: v.ship.position.z, r: 24 });
    return out;
  }

  // New explorer: parked already, or landing from the sky (arrival).
  spawn(seed, arriving) {
    const { h, spawn, scene } = this.surface;
    const rng = new Rng(seed);
    const design = shipDesign(hash32(seed, 0x51));
    const footprint = design.parts.length * 0.35;
    const spot = findParking(h, this.planet, rng, spawn, 40, 150, footprint, this.avoidList());
    if (!spot) return null;
    const ship = new SurfaceShip(scene, design);
    const yaw = rng.range(0, Math.PI * 2);
    const ground = restHeight(h, spot.x, spot.z, footprint);
    if (arriving) ship.land(spot.x, ground, spot.z, yaw);
    else ship.park(spot.x, ground, spot.z, yaw);
    const side = design.parts.width * 0.5 + 2.5;
    const door = { x: spot.x + Math.cos(yaw) * side, z: spot.z - Math.sin(yaw) * side };
    const explorer = new Explorer(scene, { seed, name: word(rng), accent: rng.pick(ACCENTS), ship, door,
      friendly: rng.chance(0.75), stay: rng.range(90, 240) });
    if (!arriving) explorer.exit(h);
    const v = { explorer, ship, line: null, greets: 0, id: `npc-${seed}` };
    this.visitors.push(v);
    return v;
  }

  update(dt) {
    if (!this.planet) return;
    dt = Math.min(dt, 0.1);
    const { h } = this.surface, player = this.surface.position;
    for (let i = this.visitors.length - 1; i >= 0; i--) this.updateVisitor(this.visitors[i], dt, h, player, i);
    for (let i = this.flyers.length - 1; i >= 0; i--) this.updateFlyer(this.flyers[i], dt, h, i);
    this.updateArrivals(dt);
    this.flyTimer -= dt;
    if (this.flyTimer <= 0 && hostsVisitors(this.planet)) this.spawnFlyover();
  }

  updateVisitor(v, dt, h, player, i) {
    const { explorer, ship } = v;
    ship.update(dt, h);
    if (ship.state === 'parked' && explorer.state === 'inside' && !explorer.boarded) explorer.exit(h);
    explorer.update(dt, h, this.planet, player);
    if (explorer.boarded && ship.state === 'parked') ship.takeOff();
    if (ship.state !== 'gone') return;
    explorer.dispose();
    ship.dispose();
    this.visitors.splice(i, 1);
    this.arrivals.push(rand(20, 60));
  }

  updateFlyer(ship, dt, h, i) {
    ship.update(dt, h);
    if (ship.state !== 'gone') return;
    ship.dispose();
    this.flyers.splice(i, 1);
  }

  updateArrivals(dt) {
    for (let i = this.arrivals.length - 1; i >= 0; i--) {
      this.arrivals[i] -= dt;
      if (this.arrivals[i] > 0) continue;
      this.arrivals.splice(i, 1);
      if (this.visitors.length < 3) this.spawn(hash32(this.planet.seed, SALT, this.serial++), true);
    }
  }

  // A ship crossing the area 100-250 units above the ground, passing near the player.
  spawnFlyover() {
    this.flyTimer = rand(60, 180);
    const p = this.surface.position;
    const a = Math.random() * Math.PI * 2;
    tmpDir.set(Math.cos(a), 0, Math.sin(a));
    const offset = rand(-120, 120);
    tmpFrom.set(p.x - tmpDir.x * 900 - tmpDir.z * offset, 0, p.z - tmpDir.z * 900 + tmpDir.x * offset);
    const altitude = rand(100, 250);
    tmpFrom.y = this.surface.h(tmpFrom.x, tmpFrom.z) + altitude;
    const ship = new SurfaceShip(this.surface.scene, shipDesign(hash32(this.planet.seed, SALT, 0xf1, this.serial++)));
    ship.flyOver(tmpFrom, tmpDir, altitude, 1800, rand(70, 130));
    this.flyers.push(ship);
  }

  // Closest outside explorer; includes a greeting `line` inside TALK_RANGE (result is reused).
  nearest(pos, maxDist = Infinity) {
    let best = null, bestD = maxDist;
    for (const v of this.visitors) {
      if (!v.explorer.outside) continue;
      const d = Math.hypot(pos.x - v.explorer.feet.x, pos.z - v.explorer.feet.z);
      if (d < bestD) { best = v; bestD = d; }
    }
    if (!best) return null;
    const talking = bestD < TALK_RANGE;
    if (talking && !best.line) best.line = greeting(new Rng(hash32(best.explorer.seed, best.greets++)));
    if (!talking && bestD > TALK_RANGE + 2) best.line = null;
    return Object.assign(this.result, { name: best.explorer.name, distance: bestD, line: talking ? best.line : null });
  }

  // Markers for the minimap: explorers on foot and NPC ships (reused array).
  list() {
    const out = this.items;
    out.length = 0;
    for (const v of this.visitors) {
      if (v.explorer.outside) out.push(v.markNpc ??= { id: v.id, position: v.explorer.feet, kind: 'npc' });
      if (v.ship.group.visible) out.push(v.markShip ??= { id: `${v.id}-ship`, position: v.ship.position, kind: 'npc-ship' });
    }
    for (const f of this.flyers) out.push(f.mark ??= { id: `fly-${f.design.seed}`, position: f.position, kind: 'npc-ship' });
    return out;
  }

  dispose() {
    for (const v of this.visitors) { v.explorer.dispose(); v.ship.dispose(); }
    for (const f of this.flyers) f.dispose();
    this.visitors = [];
    this.flyers = [];
    this.arrivals = [];
    this.items.length = 0;
    this.planet = null;
  }
}
