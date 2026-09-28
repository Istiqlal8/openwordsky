// The player's ship parked on a planet surface, plus a dry-land spawn finder.
import { buildShip } from './ship-model.js';
import { Rng, hash32 } from '../../core/rng.js';

const MAX_SLOPE = 0.6;

function isDry(h, planet, x, z) {
  const t = planet.terrain;
  const y = h(x, z);
  if (t.hasWater && y <= t.waterY + 1) return false;
  const slope = Math.hypot(h(x + 2, z) - h(x - 2, z), h(x, z + 2) - h(x, z - 2)) / 4;
  return slope < MAX_SLOPE;
}

// First dry, gentle spot on rings around the origin (radius 0..400, step 10).
export function findDrySpawn(h, planet) {
  if (!planet.terrain.hasWater) return { x: 0, z: 0 };
  for (let r = 0; r <= 400; r += 10) {
    const n = Math.max(1, Math.round((Math.PI * 2 * r) / 10));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (isDry(h, planet, x, z)) return { x, z };
    }
  }
  return { x: 0, z: 0 };
}

const padsAround = (x, z, r) => [[x, z], [x + r, z], [x - r, z], [x, z + r], [x, z - r]];

// Height spread under the footprint, or Infinity when any pad is wet/steep.
function unevenness(h, planet, x, z, radius) {
  let lo = Infinity, hi = -Infinity;
  for (const [px, pz] of padsAround(x, z, radius)) {
    if (!isDry(h, planet, px, pz)) return Infinity;
    const y = h(px, pz);
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  }
  return hi - lo;
}

// Flattest dry spot ~12 units ahead (-Z) of the spawn, sweeping sideways and outward.
function parkingSpot(h, planet, spawn, radius) {
  let best = { x: spawn.x, z: spawn.z - 12 }, bestScore = Infinity;
  for (const d of [12, 15, 10, 19, 24, 30, 40, 55, 70]) {
    for (let k = 0; k < 16; k++) {
      const a = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8);
      const x = spawn.x + Math.sin(a) * d, z = spawn.z - Math.cos(a) * d;
      const score = unevenness(h, planet, x, z, radius) + d * 0.02 + Math.abs(a) * 0.1;
      if (score < bestScore) { best = { x, z }; bestScore = score; }
    }
    if (bestScore < 0.6) break;
  }
  // Nothing dry nearby (tiny islands): park right beside the dry spawn point.
  return bestScore === Infinity ? { x: spawn.x + 6, z: spawn.z - 6 } : best;
}

// Highest terrain under the footprint, so no pad sinks into the ground.
function restHeight(h, planet, x, z, radius) {
  let y = -Infinity;
  for (const [px, pz] of padsAround(x, z, radius)) y = Math.max(y, h(px, pz));
  const t = planet.terrain;
  return t.hasWater ? Math.max(y, t.waterY) : y;
}

export class LandedShip {
  constructor(scene, design, h, planet, spawn) {
    this.scene = scene;
    this.model = buildShip(design);
    this.model.setLegs(true);
    this.model.setThrust(0);
    const radius = design.parts.length * 0.35;
    this.radius = radius;
    const { x, z } = parkingSpot(h, planet, spawn, radius);
    const g = this.model.group;
    g.position.set(x, restHeight(h, planet, x, z, radius) + this.model.groundOffset - 0.15, z);
    g.rotation.y = new Rng(hash32(planet.seed, 0x1a4d)).range(0, Math.PI * 2);
    scene.add(g);
  }

  get position() { return this.model.group.position; }

  // Put the ship down on the ground where it currently hovers (after flying).
  setDown(h, planet) {
    const g = this.model.group;
    g.position.y = restHeight(h, planet, g.position.x, g.position.z, this.radius) + this.model.groundOffset - 0.15;
    g.rotation.x = g.rotation.z = 0;
    this.model.setLegs(true);
    this.model.setThrust(0);
  }

  dispose() {
    this.scene.remove(this.model.group);
    this.model.dispose();
  }
}
