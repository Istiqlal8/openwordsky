// Everything the galaxy collection book lists, read from the quest save (log.s) and the galaxy.
import { systemAt, planetsOf } from '../gen/galaxy.js';
import { endemicOf } from '../quest/endemic.js';

const systems = new Map(); // `${seed}:${index}` -> planets

function planetOf(seed, key) {
  const [sys, idx] = String(key).split('-').map(Number);
  if (!Number.isInteger(sys) || !Number.isInteger(idx)) return null;
  const k = `${seed}:${sys}`;
  if (!systems.has(k)) systems.set(k, planetsOf(seed, systemAt(seed, sys)));
  return systems.get(k)[idx] ?? null;
}

const byDate = (a, b) => b.at - a.at;

function species(book) {
  return Object.entries(book ?? {}).map(([name, at]) => ({ name, at })).sort(byDate);
}

function clearedPlanets(seed, cleared) {
  return Object.entries(cleared ?? {}).map(([key, at]) => {
    const p = planetOf(seed, key);
    return { name: p?.name ?? key, sub: p ? p.biome.label : '', at };
  }).sort(byDate);
}

// Endemic items recorded as found on each planet; owned = count in the inventory now.
function endemicFound(seed, found, player) {
  const out = [];
  for (const [key, box] of Object.entries(found ?? {})) {
    const p = planetOf(seed, key);
    if (!p) continue;
    for (const e of endemicOf(p)) {
      if (box[e.name]) out.push({ name: e.name, sub: p.name, relic: e.tier === 3, owned: player.count(e.name) });
    }
  }
  return out;
}

// -> { fauna, flora, planets, endemic } lists of { name, sub?, at?, owned?, relic? }
export function codexData(save, log, player) {
  const s = log.s, seed = save.galaxySeed;
  return {
    fauna: species(s.catalog?.fauna),
    flora: species(s.catalog?.flora),
    planets: clearedPlanets(seed, s.cleared),
    endemic: endemicFound(seed, s.found, player),
  };
}
