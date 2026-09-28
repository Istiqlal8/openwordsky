// Nearest planet (from the current system) whose legendary monster is still alive. Cached.
import { SYSTEM_COUNT, systemAt, planetsOf } from '../gen/galaxy.js';
import { legendOf } from './legend-data.js';
import { isDefeated } from './legend-store.js';

const MAX_SYSTEMS = 80;
const cache = new Map(); // `${seed}:${from}:${defeated}` -> result | null

function nearestSystems(seed, from) {
  const here = systemAt(seed, from), list = [];
  for (let i = 0; i < SYSTEM_COUNT; i++) {
    const s = systemAt(seed, i);
    list.push({ s, d: Math.hypot(s.pos.x - here.pos.x, s.pos.y - here.pos.y, s.pos.z - here.pos.z) });
  }
  return list.sort((a, b) => a.d - b.d).slice(0, MAX_SYSTEMS);
}

// -> { def, planet, system, ly, rank } or null.
export function nearestLegend(seed, from, defeatedCount) {
  const key = `${seed}:${from}:${defeatedCount}`;
  if (cache.has(key)) return cache.get(key);
  let found = null;
  const list = nearestSystems(seed, from);
  for (let i = 0; i < list.length && !found; i++) {
    for (const planet of planetsOf(seed, list[i].s)) {
      const def = legendOf(planet);
      if (!def || isDefeated(planet.key)) continue;
      found = { def, planet, system: list[i].s, ly: list[i].d * 0.1, rank: i };
      break;
    }
  }
  cache.set(key, found);
  return found;
}
