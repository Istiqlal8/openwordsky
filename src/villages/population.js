// Who lives in a settlement: head count per type, roles, activities and anchors (deterministic per site seed).
import { Rng, hash32 } from '../core/rng.js';
import { personName } from './names.js';
import { randomLook } from './person.js';

const COUNT = { farm: [8, 12], hamlet: [6, 9], fishing: [7, 11], town: [12, 15], research: [6, 8], colony: [6, 12], mining: [3, 4] };
const ROLE = { farm: 'farmer', hamlet: 'farmer', fishing: 'fisher', town: 'shop', research: 'scientist', colony: 'colonist', mining: 'miner' };
const KIDS = { farm: 0.25, hamlet: 0.3, fishing: 0.25, town: 0.25, research: 0, colony: 0.15, mining: 0 };

// -> [{ name, female, kid, role, mode, anchor, look, seed }]
export function population(site, layout) {
  const rng = new Rng(hash32(site.seed, 0x9e0));
  const [lo, hi] = COUNT[site.type], n = lo + rng.int(hi - lo + 1), job = ROLE[site.type];
  const fixed = [
    ...layout.vendors.map((a) => ({ mode: 'stand', anchor: a, role: 'shop' })),
    ...layout.fish.map((a) => ({ mode: 'fish', anchor: a, role: 'fisher' })),
    ...layout.seats.slice(0, 2 + rng.int(2)).map((a) => ({ mode: 'sit', anchor: a, role: 'villager' })),
    ...layout.work.slice(0, Math.ceil(n / 3)).map((a) => ({ mode: 'work', anchor: a, role: job })),
  ];
  const out = [], used = new Set();
  for (let i = 0; i < n; i++) {
    const kid = i >= fixed.length && rng.chance(KIDS[site.type]);
    const slot = fixed[i] ?? { mode: kid ? 'play' : 'walk', anchor: startSpot(rng, layout, kid), role: kid ? 'child' : job };
    out.push(resident(rng, site, slot, kid, i, used));
  }
  return out;
}

function startSpot(rng, layout, kid) {
  if (kid || !layout.spots.length) return { x: layout.hub.x + rng.range(-3, 3), z: layout.hub.z + rng.range(-3, 3) };
  const s = rng.pick(layout.spots);
  return { x: s.x, z: s.z };
}

// Unique name within the settlement (a few retries).
function uniqueName(rng, kid, used) {
  let who = personName(rng, kid);
  for (let k = 0; k < 8 && used.has(who.name); k++) who = personName(rng, kid);
  used.add(who.name);
  return who;
}

function resident(rng, site, slot, kid, i, used) {
  const who = uniqueName(rng, kid, used), offWorld = site.type === 'colony' || site.type === 'mining';
  const role = offWorld ? (site.type === 'colony' ? 'colonist' : 'miner') : slot.role;
  return { ...who, role, mode: slot.mode, anchor: slot.anchor, look: randomLook(rng, role, who.female),
    seed: hash32(site.seed, i, 0x5eed), gift: rng.chance(0.3) };
}
