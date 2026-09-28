// Gas creatures: a weird floating ecosystem inside a gas giant, layered by depth.
// Upper clouds: sky whales, manta gliders, dandelion floaters. Mid: storm eels, cloud coral,
// spark swarms. Deep: abyss titans, tentacle blooms, pressure-ghosts. Every species spawns
// around the camera, is recycled when left behind, and draws into shared instanced pools.
import * as THREE from 'three';
import { buildFields } from './fauna-fields.js';
import { GlowField, StrandField } from './fauna-fx.js';
import { FaunaTheme } from './fauna-theme.js';
import { SkyWhales } from './fauna-whales.js';
import { Gliders } from './fauna-gliders.js';
import { Floaters } from './fauna-floaters.js';
import { StormEels } from './fauna-eels.js';
import { CloudCoral } from './fauna-coral.js';
import { Sparks } from './fauna-sparks.js';
import { AbyssTitans } from './fauna-titans.js';
import { TentacleBlooms, PressureGhosts } from './fauna-deep.js';

const SCAN_RANGE = 2500;

export class GasCreatures {
  constructor(scene, pal) {
    this.fog = scene.fog;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.density = { value: 0.0001 };
    this.time = { value: 0 };
    const fields = buildFields(this.group, this.density, this.time);
    this.pools = [...Object.values(fields)];
    this.draw = { ...fields, glow: new GlowField(this.group, 3200, this.density), strand: new StrandField(this.group, 4000, this.density) };
    this.pools.push(this.draw.glow, this.draw.strand);
    const theme = new FaunaTheme(pal);
    this.species = [new SkyWhales(theme), new Gliders(theme), new Floaters(theme), new StormEels(theme, this.group),
      new CloudCoral(theme), new Sparks(theme), new AbyssTitans(theme), new TentacleBlooms(theme), new PressureGhosts(theme)];
    this.events = { shake: 0, damage: 0 };
    this.ctx = { dt: 0, t: 0, cam: null, ship: null, vel: null, storm: 0, draw: this.draw, events: this.events };
  }

  // env: { dt, time, cam, ship, vel, storm }. Returns pooled { shake, damage } for this frame.
  update(env) {
    const c = this.ctx;
    Object.assign(c, { dt: Math.min(env.dt, 0.1), t: env.time, cam: env.cam, ship: env.ship, vel: env.vel, storm: env.storm });
    this.events.shake = this.events.damage = 0;
    this.density.value = this.fog?.density ?? 0.0001;
    this.time.value = env.time;
    for (const p of this.pools) p.begin();
    for (const s of this.species) s.update(c);
    for (const p of this.pools) p.end();
    return this.events;
  }

  // Closest creature to p within scan range: { name, distance } or null.
  nearest(p) {
    let best = null;
    for (const s of this.species) {
      if (!s.active) continue;
      const n = s.nearest(p);
      if (n && n.d < SCAN_RANGE && (!best || n.d < best.distance)) best = { name: s.name, distance: Math.round(n.d) };
    }
    return best;
  }

  dispose() {
    for (const p of this.pools) p.dispose();
    for (const s of this.species) s.dispose?.();
    this.group.removeFromParent();
  }
}
