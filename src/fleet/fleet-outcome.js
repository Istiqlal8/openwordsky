// Resolves a finished expedition. Deterministic per expedition seed, so reopening the board
// never rerolls a result.
import { rngOf } from '../core/rng.js';
import { SYSTEM_COUNT, systemAt, planetsOf } from '../gen/galaxy.js';
import { endemicOf } from '../quest/endemic.js';
import { TYPE_BY_ID, CLASSES, RARE_FINDS, durationScale, successChance } from './fleet-defs.js';

// -> { ok, nanit, items: [[name, n]], xp, damaged, find: string|null, where: string|null }
export function resolveExpedition(exp, frigate, galaxySeed) {
  const t = TYPE_BY_ID[exp.type], rng = rngOf(exp.seed, 0xf1ee7);
  const ok = rng.next() < successChance(frigate, t, exp.minutes);
  const cls = CLASSES[frigate.cls];
  const mult = durationScale(exp.minutes) * (1 + 0.08 * (frigate.level - 1)) * (cls?.best === t.id ? 1.25 : 1) * (ok ? 1 : 0.35);
  const items = t.items.filter(() => rng.chance(0.75)).map(([name, n]) => [name, Math.max(1, Math.round(n * mult * rng.range(0.7, 1.3)))]);
  const out = { ok, nanit: Math.round(t.nanit * mult * rng.range(0.8, 1.2)), items, xp: Math.round(12 * durationScale(exp.minutes) * (ok ? 1 : 0.5)),
    damaged: !ok, find: null, where: null };
  if (ok && rng.chance(t.find)) Object.assign(out, rareFind(rng, galaxySeed, t.id));
  if (out.find) out.items.push([out.find, 1]);
  return out;
}

// Exploration mostly brings back endemic items from a random planet; sometimes an ancient artefact.
function rareFind(rng, galaxySeed, typeId) {
  if (typeId !== 'eksplorasi' || rng.chance(0.25)) return { find: rng.pick(RARE_FINDS), where: null };
  for (let i = 0; i < 6; i++) {
    const sys = systemAt(galaxySeed, 1 + rng.int(SYSTEM_COUNT - 1));
    const planet = rng.pick(planetsOf(galaxySeed, sys));
    const list = planet ? endemicOf(planet) : [];
    if (list.length) return { find: rng.pick(list).name, where: `${planet.name} (${sys.name})` };
  }
  return { find: RARE_FINDS[0], where: null };
}
