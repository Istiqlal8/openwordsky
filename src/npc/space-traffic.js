// SpaceTraffic: NPC travellers flying around the current star system (3-8 ships, some in
// formation). Spawn choices come from the system seed; movement uses Math.random.
import * as THREE from 'three';
import { Rng, hash32 } from '../core/rng.js';
import { word } from '../gen/names.js';
import { shipDesign } from '../view/ship/ship-design.js';
import { SpaceNpc } from './space-ship.js';
import { think, enter, flashFlight, flatDir, startCruise } from './space-brain.js';

const SALT = 0x7a1f;
const NEAR_RANGE = 1500;       // a ship counts as "seen" inside this distance of the player
const NEAR_EVERY = 12;         // seconds without one before a flight is routed past the player
const HIDE_RANGE = 9000;       // beyond this a visible ship can be moved without being noticed
const SLOTS = [new THREE.Vector3(-2.4, 0.2, 2), new THREE.Vector3(2.4, -0.2, 2)];
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

export class SpaceTraffic {
  constructor(space) {
    this.space = space;
    this.group = new THREE.Group();
    this.group.name = 'npc-traffic';
    this.flights = [];
    this.ships = [];
    this.entries = [];
    this.visibleList = [];
    this.result = { name: '', captain: '', cls: '', label: '', distance: 0 };
    this.world = { bodies: [], starSize: 200 };
    this.system = null;
    this.time = 0;
  }

  mount(system) {
    this.clear();
    this.system = system;
    this.serial = 0;
    this.space.scene.add(this.group);
    this.world.bodies = this.space.bodies;
    this.world.starSize = system.star.size;
    const rng = new Rng(hash32(system.seed, SALT));
    const count = 8 + rng.int(9); // busy space lanes
    for (let n = 0; n < count;) {
      const size = Math.min(count - n, rng.chance(0.3) ? 2 + rng.int(2) : 1);
      const flight = this.createFlight(hash32(system.seed, SALT, this.serial++), size);
      this.placeInitial(flight.leader, rng);
      n += size;
    }
    this.sinceNear = NEAR_EVERY - 2; // first pass-by right after arrival
  }

  createFlight(seed, size) {
    const rng = new Rng(seed);
    const cruise = rng.range(60, 400);
    const members = [];
    for (let k = 0; k < size; k++) {
      const design = shipDesign(hash32(seed, k, 0x51));
      const captain = `Kapten ${word(rng)}`;
      const npc = new SpaceNpc(this.group, { id: this.ships.length + seed % 997, seed, design, name: design.name, captain, cruise });
      if (k > 0) { npc.slot.copy(SLOTS[k - 1]); npc.state = 'wing'; }
      members.push(npc);
      this.ships.push(npc);
      this.entries.push({ id: `npc-ship-${seed}-${k}`, name: design.name, captain, position: npc.position, design, npc });
    }
    const flight = { leader: members[0], wingmen: members.slice(1) };
    flight.leader.wingmen = flight.wingmen;
    this.flights.push(flight);
    return flight;
  }

  // Deterministic start: parked on a planet, or cruising near one.
  placeInitial(npc, rng) {
    const bodies = this.world.bodies;
    if (!bodies.length) return;
    const b = bodies[rng.int(bodies.length)];
    npc.target = b;
    flatDir(npc.landDir, () => rng.next(), 0.6);
    if (rng.chance(0.35)) {
      npc.setVisible(false);
      return enter(npc, 'landed', rng.range(3, 40));
    }
    npc.position.copy(b.pos).addScaledVector(npc.landDir, b.radius * 3 + rng.range(300, 1500));
    npc.speed = npc.cruise;
    startCruise(npc, this.world);
    if (npc.target) npc.face(tmpA.subVectors(npc.target.pos, npc.position).normalize());
  }

  update(dt) {
    if (!this.system) return;
    dt = Math.min(dt, 0.1);
    this.time += dt;
    const cam = this.space.camera.position;
    for (const f of this.flights) {
      think(f.leader, this.world, dt);
      for (const w of f.wingmen) w.follow(f.leader, this.time);
    }
    for (const s of this.ships) s.updateFx(dt, cam);
    this.replaceGone();
    this.keepNear(dt);
  }

  // Flights that warped out are replaced by a new flight warping in.
  replaceGone() {
    for (let i = 0; i < this.flights.length; i++) {
      const f = this.flights[i];
      if (f.leader.state !== 'gone' || f.leader.timer > 0) continue;
      this.removeFlight(f);
      const nf = this.createFlight(hash32(this.system.seed, SALT, this.serial++), 1 + (Math.random() < 0.3 ? 1 + Math.floor(Math.random() * 2) : 0));
      this.flights.pop();
      this.flights.splice(i, 0, nf);
      if (Math.random() < 0.5) this.routePast(nf.leader);
      else this.warpInNear(nf.leader);
    }
  }

  warpInNear(npc) {
    const bodies = this.world.bodies;
    const b = bodies[Math.floor(Math.random() * bodies.length)];
    if (!b) return;
    npc.position.copy(b.pos).addScaledVector(flatDir(tmpA), b.radius * 4 + 800);
    npc.target = b;
    startCruise(npc, this.world);
    npc.face(tmpA.subVectors(npc.target.pos, npc.position).normalize());
    npc.speed = npc.cruise;
    npc.setVisible(true);
    flashFlight(npc, 0.25, 0.7);
  }

  // Warp a flight in ~1300 units from the player, heading to pass within 150-500 units.
  routePast(npc) {
    const player = this.space.ship.position;
    const from = flatDir(tmpA);
    npc.position.copy(player).addScaledVector(from, 1300);
    const side = tmpB.crossVectors(from, THREE.Object3D.DEFAULT_UP).normalize();
    npc.waypoint.copy(player).addScaledVector(side, (Math.random() < 0.5 ? -1 : 1) * (150 + Math.random() * 350));
    npc.face(tmpB.subVectors(npc.waypoint, npc.position).normalize());
    npc.speed = Math.max(npc.cruise, 120);
    npc.pulsing = false;
    npc.setVisible(true);
    for (const w of npc.wingmen) w.follow(npc, this.time);
    flashFlight(npc, 0.25, 0.7);
    enter(npc, 'flyby', 40);
  }

  // Make sure a ship passes near the player at least every NEAR_EVERY seconds.
  keepNear(dt) {
    const player = this.space.ship.position;
    this.sinceNear += dt;
    for (const s of this.ships) if (s.visible && s.position.distanceTo(player) < NEAR_RANGE) this.sinceNear = 0;
    if (this.sinceNear < NEAR_EVERY) return;
    const pick = this.flights.find((f) => this.routable(f.leader, player));
    if (!pick) return;
    this.sinceNear = 0;
    this.routePast(pick.leader);
  }

  routable(npc, player) {
    if (npc.state === 'landed' || npc.state === 'gone') return true;
    return npc.state !== 'flyby' && npc.position.distanceTo(player) > HIDE_RANGE;
  }

  // Visible ships for HUD markers / minimap. The array and entries are reused.
  list() {
    const out = this.visibleList;
    out.length = 0;
    for (const e of this.entries) if (e.npc.visible) out.push(e);
    return out;
  }

  // Closest visible ship within maxDist (result object is reused).
  nearest(pos, maxDist = Infinity) {
    let best = null, bestD = maxDist;
    for (const e of this.entries) {
      if (!e.npc.visible) continue;
      const d = e.position.distanceTo(pos);
      if (d < bestD) { best = e; bestD = d; }
    }
    if (!best) return null;
    Object.assign(this.result, { name: best.name, captain: best.captain, cls: best.design.cls, label: best.design.label, distance: bestD });
    return this.result;
  }

  removeFlight(f) {
    for (const s of [f.leader, ...f.wingmen]) {
      s.dispose();
      this.ships.splice(this.ships.indexOf(s), 1);
      this.entries.splice(this.entries.findIndex((e) => e.npc === s), 1);
    }
    this.flights.splice(this.flights.indexOf(f), 1);
  }

  clear() {
    for (const s of this.ships) s.dispose();
    this.flights = [];
    this.ships = [];
    this.entries = [];
    this.visibleList.length = 0;
    this.group.removeFromParent();
    this.system = null;
  }

  dispose() {
    this.clear();
  }
}
