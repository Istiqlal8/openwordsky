// Destinations a few jumps away: real, non-gas planets from the galaxy data.
import { allSystems, planetsOf } from '../gen/galaxy.js';
import { PirateWaves } from '../combat/waves.js';

export const JUMP = 45; // galaxy units per "jump" (one short warp)
const MAX_JUMPS = 5;

export function jumpsBetween(a, b) {
  const d = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y, a.pos.z - b.pos.z);
  return Math.max(1, Math.ceil(d / JUMP));
}

// Same seed rule as SpaceCombat: ~35% of systems get recurring pirate squads.
export function isDangerous(system) {
  return new PirateWaves(system.seed).dangerous;
}

// Systems 1..maxJumps away (the current one excluded), optionally filtered.
export function nearbySystems(seed, fromIndex, { min = 1, max = MAX_JUMPS, filter = null } = {}) {
  const all = allSystems(seed), from = all[fromIndex];
  const out = [];
  for (const s of all) {
    if (s.index === fromIndex) continue;
    const jumps = jumpsBetween(from, s);
    if (jumps >= min && jumps <= max && (!filter || filter(s))) out.push({ system: s, jumps });
  }
  return out;
}

// -> { key, name, system, systemName, jumps } or null.
export function pickDestination(seed, fromIndex, opts = {}) {
  const list = nearbySystems(seed, fromIndex, opts);
  for (let tries = 0; tries < 12 && list.length; tries++) {
    const { system, jumps } = list[Math.floor(Math.random() * list.length)];
    const planets = planetsOf(seed, system).filter((p) => !p.gas && p.key);
    if (!planets.length) continue;
    const p = planets[Math.floor(Math.random() * planets.length)];
    return { key: p.key, name: p.name, biome: p.biome?.id ?? null, systemIndex: system.index, systemName: system.name, jumps };
  }
  return null;
}
