// Apex monsters: the rare giant that rules a world. At most one kind per planet, biome-gated,
// so most landings show nothing and finding one is an event. Ground kinds roam and charge when
// provoked; the sky kind circles high and dives. All four use the rigged GLB models.
import * as THREE from 'three';
import { Rng } from '../../core/rng.js';
import { shiftHex } from '../../core/color.js';
import { word } from '../../gen/names.js';
import { ModelGroup, wrapAngle } from './models/model-group.js';

// height: meters at the top of the head; radius: hit sphere as a fraction of height.
const KINDS = {
  behemoth: { model: 'behemoth', label: 'Behemot', height: 11, speed: 3.2, charge: 7, hp: 900, radius: 0.55,
    tint: 0.35, biomes: ['lush', 'barren', 'desert', 'frozen', 'fungal', 'exotic'] },
  predator: { model: 'predator', label: 'Pemburu', height: 6, speed: 4, charge: 11, hp: 520, radius: 0.4,
    tint: 0.4, hunts: true, biomes: ['lush', 'toxic', 'irradiated', 'fungal', 'swamp', 'exotic'] },
  crawler: { model: 'crawler', label: 'Perayap', height: 5, speed: 3.6, charge: 8, hp: 700, radius: 0.75,
    tint: 0.4, biomes: ['volcanic', 'desert', 'barren', 'toxic', 'irradiated'] },
  skybeast: { model: 'skybeast', label: 'Naga Langit', height: 7, speed: 16, charge: 26, hp: 460, radius: 0.5,
    tint: 0.4, flies: true, biomes: ['lush', 'exotic', 'toxic', 'volcanic', 'frozen', 'swamp', 'fungal'] },
};
const SIGHT = 60; // a hostile apex notices the player this far away
const ROAM = 140;

// Which apex (if any) rules this world. Lush worlds are the likeliest; barren rock rarely has one.
export function apexOf(planet) {
  if (planet.gas || !planet.fauna.count) return null;
  const fits = Object.keys(KINDS).filter((k) => KINDS[k].biomes.includes(planet.biome.id));
  if (!fits.length) return null;
  const rng = new Rng(planet.seed ^ 0xa9e5);
  return rng.chance(planet.biome.id === 'lush' ? 0.34 : 0.2) ? rng.pick(fits) : null;
}

export class Apex extends ModelGroup {
  constructor(scene, planet, heightFn, origin) {
    super(scene);
    this.heightFn = heightFn;
    this.origin = origin;
    this.waterY = planet.terrain.hasWater ? planet.terrain.waterY : -Infinity;
    this.rng = new Rng(planet.seed ^ 0xa9e6);
    this.calm = 12; // landing grace: nothing charges the player straight off the ramp
    this.onBite = null;
    const kind = apexOf(planet);
    if (!kind) return;
    const count = KINDS[kind].flies ? 1 + this.rng.int(2) : this.rng.chance(0.3) ? 2 : 1;
    for (let i = 0; i < count; i++) this.spawn(kind, planet, i);
  }

  dry(x, z) { return this.heightFn(x, z) > this.waterY + 0.5; }

  groundAt(p) { return Math.max(this.heightFn(p.x, p.z), this.waterY); }

  // Random dry-land point r0..r1 from `base`, or the base itself when the world is all water.
  dryPoint(base, r0, r1) {
    const rng = this.rng;
    for (let i = 0; i < 8; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(r0, r1);
      const x = base.x + Math.cos(a) * r, z = base.z + Math.sin(a) * r;
      if (this.dry(x, z)) return new THREE.Vector3(x, 0, z);
    }
    return new THREE.Vector3(base.x, 0, base.z);
  }

  spawn(kind, planet, i) {
    const spec = KINDS[kind], r = this.rng;
    const height = spec.height * r.range(0.85, 1.25);
    const pos = this.dryPoint(this.origin, 90 + i * 30, 170 + i * 30);
    const a = { kind, spec, root: new THREE.Group(), model: spec.model, height, pos, target: pos.clone(),
      tint: shiftHex(planet.palette.fauna, r.range(-0.1, 0.1), 0, r.range(-0.12, 0.06)), tintStrength: spec.tint,
      rng: new Rng(r.int(0x7fffffff)), seed: r.next(), name: `${word(r)} ${spec.label}`,
      radius: height * spec.radius, maxHp: Math.round(spec.hp * height / spec.height),
      hostile: Boolean(spec.hunts), biteCd: 0, dive: 0,
      angle: r.range(0, Math.PI * 2), dir: r.chance(0.5) ? 1 : -1, orbit: r.range(45, 85), altitude: r.range(55, 95) };
    if (spec.flies) a.pos.y = this.groundAt(a.pos) + a.altitude;
    a.root.rotation.order = 'YXZ'; // yaw, then bank about the body's forward axis
    a.root.rotation.y = r.range(0, Math.PI * 2);
    this.attach(a);
  }

  hunting(a, player) {
    return a.hostile && this.calm <= 0 && a.pos.distanceTo(player) < SIGHT;
  }

  // Bites when close enough; the caller has already moved the animal this frame.
  tryBite(a, dt, player) {
    a.biteCd -= dt;
    const d = Math.hypot(player.x - a.pos.x, player.z - a.pos.z);
    if (d > a.radius + 3 || a.biteCd > 0) return;
    a.biteCd = 1.6;
    this.onBite?.({ name: a.name }, 12 + a.height * 2.5);
  }

  retarget(a, player) {
    const base = a.pos.distanceTo(player) > ROAM ? player : a.pos;
    a.target.copy(this.dryPoint(base, 25, 70));
  }

  // Walks toward a.target (or the player when hunting). Returns ground speed in m/s.
  step(a, dt, player) {
    const chase = this.hunting(a, player);
    if (chase) a.target.set(player.x, 0, player.z);
    const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < (chase ? a.radius + 2 : 4)) { if (!chase) this.retarget(a, player); return 0; }
    const scale = a.height / a.spec.height;
    const speed = (chase ? a.spec.charge : a.spec.speed) * scale;
    const v = Math.min(dist, speed * dt);
    const nx = a.pos.x + (dx / dist) * v, nz = a.pos.z + (dz / dist) * v;
    if (!this.dry(nx, nz)) { this.retarget(a, player); return 0; } // never wades into the sea
    a.pos.set(nx, 0, nz);
    a.root.rotation.y += wrapAngle(Math.atan2(-dz, dx) - a.root.rotation.y) * Math.min(1, dt * 2.5);
    return speed;
  }

  // Circles its patch; a hostile one peels off into a dive and pulls up after the pass.
  flyStep(a, dt, player) {
    if (this.hunting(a, player) && a.dive <= 0 && a.rng.next() < dt * 0.3) a.dive = 3;
    a.dive -= dt;
    const diving = a.dive > 0;
    const c = diving ? player : a.pos;
    if (!diving && a.pos.distanceTo(player) > ROAM) {
      const dx = player.x - a.pos.x, dz = player.z - a.pos.z, far = Math.hypot(dx, dz);
      a.pos.x += (dx / far) * 10 * dt;
      a.pos.z += (dz / far) * 10 * dt;
    }
    const speed = a.spec.charge * (diving ? 1 : 0.6);
    a.angle += (speed / a.orbit) * dt * a.dir;
    const orbit = diving ? a.radius + 6 : a.orbit;
    a.pos.x = c.x + Math.cos(a.angle) * orbit;
    a.pos.z = c.z + Math.sin(a.angle) * orbit;
    const want = this.groundAt(a.pos) + (diving ? 4 : a.altitude + Math.sin(a.angle * 2) * 6);
    a.pos.y += (want - a.pos.y) * Math.min(1, dt * (diving ? 2.5 : 1));
    const hx = -Math.sin(a.angle) * a.dir, hz = Math.cos(a.angle) * a.dir;
    a.root.rotation.y = Math.atan2(-hz, hx);
    a.root.rotation.x = 0.3 * a.dir;
    if (diving) this.tryBite(a, dt, player);
    return speed;
  }

  update(dt, player) {
    this.calm -= dt;
    for (const a of this.list) {
      const flies = Boolean(a.spec.flies);
      const speed = flies ? this.flyStep(a, dt, player) : this.step(a, dt, player);
      if (!flies) {
        a.root.position.set(a.pos.x, this.heightFn(a.pos.x, a.pos.z), a.pos.z);
        if (this.hunting(a, player)) this.tryBite(a, dt, player);
      } else a.root.position.copy(a.pos);
      const mode = flies ? (a.dive > 0 ? 'glide' : 'fly') : 'walk';
      this.animate(a, dt, player, { speed: speed / a.height, mode });
    }
  }

  // Shooting an apex makes it hunt you, whatever it was doing before.
  provoke(a) {
    a.hostile = true;
    this.calm = 0;
  }
}
