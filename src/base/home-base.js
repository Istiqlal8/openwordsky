// The player's home base on Earth: hangar, DIY workshop, houses, store, landing pad and residents.
import { GeoKit } from './geo-kit.js';
import { chooseSite, clearZones } from './site.js';
import { assembleBase } from './assemble.js';
import { makeMaterials, applyNight, disposeMaterials } from './materials.js';
import { makeAtlas } from './signs.js';
import { LiveParts } from './live-parts.js';
import { Residents } from './residents.js';

const REACH = 6; // interaction distance to a door / console

export class HomeBase {
  constructor(surface) {
    this.surface = surface;
    this.active = false;
    this.time = 0;
    this.meshes = [];
    this.points = [];
    this.zones = [];
  }

  get center() { return this.frame ? { x: this.frame.cx, z: this.frame.cz } : null; }
  // Landing pad top centre; yaw = the base orientation (park ships along it).
  get padPosition() { return this.anchors ? { x: this.anchors.pad.x, y: this.anchors.pad.floor, z: this.anchors.pad.z, yaw: this.frame.yaw } : null; }

  // Builds the base on Earth only; any other planet leaves it empty.
  mount(planet) {
    this.dispose();
    if (planet?.style !== 'earth') return;
    const s = this.surface, ctx = { kit: new GeoKit(), h: s.h, planet };
    ctx.frame = this.frame = chooseSite(s.h, planet, s.spawn);
    this.ctx = ctx;
    this.anchors = assembleBase(ctx);
    this.atlas = makeAtlas();
    this.mats = makeMaterials(this.atlas);
    this.meshes = Object.values(ctx.kit.build(this.mats));
    for (const m of this.meshes) s.scene.add(m);
    this.live = new LiveParts(s.scene, this.anchors, this.mats);
    this.residents = new Residents(s.scene, this.walkSpots(), 3);
    this.makePoints();
    this.reserveGround();
    this.parkShip();
    this.active = true;
  }

  // Interaction points (doors / consoles), each with a reusable result object.
  makePoints() {
    const a = this.anchors, home = a.houses.find((q) => q.home);
    this.points = [
      { id: 'hangar', label: 'Hangar', at: a.hangar.door },
      { id: 'shipyard', label: 'Bengkel DIY', at: a.workshop.door },
      { id: 'rest', label: 'Rumahku', at: home.door },
      { id: 'store', label: 'Toko', at: a.store.door },
    ].map((p) => ({ ...p, result: { id: p.id, label: p.label, distance: 0 } }));
  }

  walkSpots() {
    const a = this.anchors, f = this.frame;
    return [{ x: f.cx, z: f.cz }, a.hangar.door, a.workshop.door, a.store.door, ...a.houses.map((q) => q.door),
      { x: f.x(0, -13), z: f.z(0, -13) }];
  }

  // Keep flora and rocks out of the footprints and paths.
  reserveGround() {
    const props = this.surface.props;
    if (!props) return;
    this.zones = clearZones(this.frame);
    props.extraZones.push(...this.zones);
    props.rebuild(this.surface.center.x, this.surface.center.z);
  }

  // Move a LandedShip (default: the surface's) onto the landing pad.
  parkShip(landed = this.surface.landed) {
    const pad = this.padPosition;
    if (!landed || !pad) return;
    const g = landed.model.group;
    g.position.set(pad.x, pad.y + landed.model.groundOffset - 0.15, pad.z);
    g.rotation.set(0, pad.yaw, 0);
    if (this.surface.props) this.surface.props.clearZone = { x: pad.x, z: pad.z, r: 9 };
  }

  update(dt, playerPos, nightFactor = this.surface.sky?.nightFactor ?? 0) {
    if (!this.active) return;
    this.time += dt;
    applyNight(this.mats, nightFactor, this.time);
    this.live.update(this.time, nightFactor);
    this.residents.update(Math.min(dt, 0.1), this.ctx);
  }

  // -> { id, label, distance } for the closest door within reach, else null.
  nearest(pos) {
    if (!this.active || !pos) return null;
    let best = null;
    for (const p of this.points) {
      const d = Math.hypot(pos.x - p.at.x, pos.z - p.at.z);
      if (d <= REACH && (!best || d < best.distance)) { best = p.result; best.distance = d; }
    }
    return best;
  }

  // -> 'hangar' | 'shipyard' | 'rest' | 'store' | null
  interact(pos) {
    return this.nearest(pos)?.id ?? null;
  }

  dispose() {
    if (!this.active) return;
    const s = this.surface;
    for (const m of this.meshes) { s.scene.remove(m); m.geometry.dispose(); }
    this.live.dispose();
    this.residents.dispose();
    disposeMaterials(this.mats);
    this.atlas.dispose();
    if (s.props) {
      s.props.extraZones = s.props.extraZones.filter((z) => !this.zones.includes(z));
      s.props.rebuild(s.center.x, s.center.z);
    }
    this.meshes = [];
    this.points = [];
    this.zones = [];
    this.frame = this.anchors = this.ctx = this.live = this.residents = this.mats = this.atlas = null;
    this.active = false;
  }
}
