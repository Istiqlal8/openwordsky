// Nearest planet (from the current system) that yields a given material. Same shape and the same
// cost ceiling as src/guide/biome-finder.js, which already sweeps the galaxy this way: generate
// the nearest systems, walk them in order, stop at the first planet that has it.
import { SYSTEM_COUNT, systemAt, planetsOf } from '../gen/galaxy.js';
import { sourceOn } from './prospect-yield.js';

const MAX_SYSTEMS = 160;  // how many of the nearest systems to generate before giving up
const cache = new Map();  // `${seed}:${from}:${item}` -> result | null

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

// -> { planet, system, ly, rank, how } where rank = how many systems are nearer (0 = this one), or null.
export function nearestSource(seed, from, item) {
  const key = `${seed}:${from}:${item}`;
  if (cache.has(key)) return cache.get(key);
  let found = null;
  const list = nearestSystems(seed, from);
  for (let i = 0; i < list.length && !found; i++) {
    for (const planet of planetsOf(seed, list[i].s)) {
      const how = sourceOn(planet, item);
      if (!how) continue;
      found = { planet, system: list[i].s, ly: list[i].d * 0.1, rank: i, how };
      break;
    }
  }
  cache.set(key, found);
  return found;
}
