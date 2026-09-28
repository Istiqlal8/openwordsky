// Sentinel squad: patrol, react to the wanted level, shoot the player, take blaster hits.
import * as THREE from 'three';
import { rngOf } from '../core/rng.js';
import { Drone, droneKit, disposeKit } from './sentinel-drone.js';

const MAX_DRONES = 6;
const SPAWN_GAP = 3;          // seconds between reinforcements
const FIRE_GAP = [1.8, 3.2];  // seconds between shots per drone
const FIRE_RANGE = 45;
const RED = 0xff2a1a;
const _sphere = new THREE.Sphere(new THREE.Vector3(), 0.95);
const _hitP = new THREE.Vector3(), _aim = new THREE.Vector3(), _spawn = new THREE.Vector3();
const _from = new THREE.Vector3(), _to = new THREE.Vector3(); // FxSystem copies inputs

// Patrol size by seed: 0..3 (a fifth of planets are unguarded).
function baseCount(planet) {
  const r = rngOf(planet.seed, 7331).next();
  return r < 0.2 ? 0 : r < 0.5 ? 1 : r < 0.8 ? 2 : 3;
}

export class Sentinels {
  constructor(ctx) {
    this.ctx = ctx; // { surface, player, sfx, fx, planet }
    this.base = baseCount(ctx.planet);
    this.kit = droneKit();
    this.drones = [];
    this.spawnT = 0;
    for (let i = 0; i < this.base; i++) this.spawn(20 + i * 8);
  }

  get present() { return this.base > 0; }

  floorAt = (x, z) => this.ctx.surface.floorAt(x, z);

  spawn(dist) {
    const p = this.ctx.surface.position, a = Math.random() * Math.PI * 2;
    const x = p.x + Math.cos(a) * dist, z = p.z + Math.sin(a) * dist;
    const d = new Drone(this.kit, _spawn.set(x, this.floorAt(x, z) + 14, z));
    this.drones.push(d);
    this.ctx.surface.scene.add(d.group);
    return d;
  }

  update(dt, wanted) {
    const hostile = wanted > 0 && this.present;
    this.reinforce(dt, hostile ? Math.min(MAX_DRONES, Math.max(this.base, 1) + wanted) : this.base);
    const eye = this.ctx.surface.position;
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const d = this.drones[i];
      d.setHostile(hostile && !d.leaving);
      d.update(dt, eye, this.floorAt);
      if (d.leaving && d.group.position.y - eye.y > 60) this.remove(i);
      else if (d.hostile) this.tickFire(d, dt);
    }
  }

  // Spawn reinforcements up to `want`; surplus drones fly away.
  reinforce(dt, want) {
    let active = 0;
    for (const d of this.drones) {
      if (d.leaving) continue;
      if (active >= want) d.leaving = true;
      else active++;
    }
    this.spawnT -= dt;
    if (active >= want || this.spawnT > 0) return;
    this.spawnT = SPAWN_GAP;
    this.spawn(40);
  }

  tickFire(d, dt) {
    d.fireT -= dt;
    // No shots at a player flying their ship: sentinels guard the ground.
    if (d.fireT > 0 || this.ctx.player.dead || this.ctx.surface.flying) return;
    d.fireT = FIRE_GAP[0] + Math.random() * (FIRE_GAP[1] - FIRE_GAP[0]);
    const from = d.eye.getWorldPosition(_from);
    const dist = from.distanceTo(this.ctx.surface.position);
    if (dist < FIRE_RANGE) this.fire(from, dist);
  }

  // Hitscan shot at the player's chest; accuracy falls off with distance.
  fire(from, dist) {
    const { player, fx, sfx } = this.ctx;
    const to = _to.copy(this.ctx.surface.position);
    to.y -= 0.5;
    const hit = Math.random() < 0.6 - dist / 150;
    if (!hit) to.add(_aim.randomDirection().multiplyScalar(1.5 + Math.random() * 2));
    fx?.beam(from, to, RED, 0.14);
    fx?.sparks(from, RED, 3);
    sfx?.enemyLaser?.();
    if (hit) player.damageSuit(5 + Math.floor(Math.random() * 4), 'Penjaga');
  }

  // Nearest drone the ray passes through within maxDist, or null. Writes the point to `out`.
  raycast(ray, maxDist, out) {
    let best = null, bestD = maxDist;
    for (const d of this.drones) {
      _sphere.center.copy(d.group.position);
      if (!ray.intersectSphere(_sphere, _hitP)) continue;
      const dist = _hitP.distanceTo(ray.origin);
      if (dist < bestD) { bestD = dist; best = d; out.copy(_hitP); }
    }
    return best;
  }

  // Apply a blaster hit. Returns true when the drone was destroyed.
  damage(drone, point) {
    this.ctx.fx?.sparks(point, 0xffe0a0, 8);
    if (!drone.hit()) return false;
    const { fx, sfx, player } = this.ctx;
    fx?.explode(drone.group.position, { color: 0xff7030, size: 2.2, debris: true });
    sfx?.explosion?.(2);
    player.addItem('Nanit', 8 + Math.floor(Math.random() * 10));
    player.addItem('Logam Penjaga', 1 + Math.floor(Math.random() * 2));
    this.remove(this.drones.indexOf(drone));
    return true;
  }

  remove(i) {
    if (i < 0) return;
    this.ctx.surface.scene.remove(this.drones[i].group);
    this.drones.splice(i, 1);
  }

  // After respawn: drop reinforcements, calm the patrol around the player.
  clearHostiles() {
    while (this.drones.length > this.base) this.remove(this.drones.length - 1);
    for (const d of this.drones) {
      d.setHostile(false);
      d.leaving = false;
      d.hp = 4;
      d.anchor.copy(this.ctx.surface.position);
    }
  }

  dispose() {
    while (this.drones.length) this.remove(0);
    disposeKit(this.kit);
  }
}
