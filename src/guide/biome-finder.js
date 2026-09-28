// Nearest system (from the current one) that has a solid planet of a given biome. Cached per query.
import { SYSTEM_COUNT, systemAt, planetsOf } from '../gen/galaxy.js';

const MAX_SYSTEMS = 160; // how many of the nearest systems to generate before giving up
const cache = new Map();  // `${seed}:${from}:${biome}` -> result | null

function dist(a, b) {
  return Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y, a.pos.z - b.pos.z);
}

function nearestSystems(seed, from) {
  const here = systemAt(seed, from), list = [];
  for (let i = 0; i < SYSTEM_COUNT; i++) {
    const s = systemAt(seed, i);
    list.push({ s, d: dist(s, here) });
  }
  return list.sort((a, b) => a.d - b.d).slice(0, MAX_SYSTEMS);
}

// -> { planet, system, ly, rank } where rank = how many systems are nearer (0 = this system), or null.
export function nearestBiome(seed, from, biome) {
  const key = `${seed}:${from}:${biome}`;
  if (cache.has(key)) return cache.get(key);
  let found = null;
  const list = nearestSystems(seed, from);
  for (let i = 0; i < list.length && !found; i++) {
    const planet = planetsOf(seed, list[i].s).find((p) => !p.gas && p.biome?.id === biome);
    if (planet) found = { planet, system: list[i].s, ly: list[i].d * 0.1, rank: i };
  }
  cache.set(key, found);
  return found;
}
