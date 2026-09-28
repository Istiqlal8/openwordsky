// Who lives in a settlement: head count per type, roles, activities and anchors (deterministic per site seed).
// Activities (mode): stand, fish, sit, work (farming), mine (beam), scan, guard (patrol, armed), chat (pairs),
// ride (on a tamed mount), herd (walks behind livestock), walk, play (children's tag).
import { Rng, hash32 } from '../core/rng.js';
import { personName } from './names.js';
import { randomLook } from './person.js';

const COUNT = { farm: [11, 15], hamlet: [8, 11], fishing: [9, 12], town: [14, 18], research: [7, 9], colony: [14, 18], mining: [4, 6] };
const ROLE = { farm: 'farmer', hamlet: 'farmer', fishing: 'fisher', town: 'shop', research: 'scientist', colony: 'colonist', mining: 'miner' };
const KIDS = { farm: 0.3, hamlet: 0.35, fishing: 0.3, town: 0.3, research: 0, colony: 0.2, mining: 0 };
const WORK = { mining: 'mine', research: 'scan' };
const GUARDS = { farm: 1, hamlet: 1, fishing: 1, town: 2, research: 1, colony: 2, mining: 1 };
const RIDERS = { farm: 2, hamlet: 1, fishing: 1, town: 1, research: 1, colony: 2, mining: 0 };
const HERDERS = { farm: 1, hamlet: 1, colony: 1 };
const ARMED = { colonist: 0.6, miner: 1, farmer: 0.25, fisher: 0.15, shop: 0.1, scientist: 0.3, villager: 0.15 };

// Fixed-place and activity slots, in priority order.
function slots(rng, site, layout, n, job) {
  const t = site.type, mode = WORK[t] ?? 'work';
  return [
    ...layout.vendors.map((a) => ({ mode: 'stand', anchor: a, role: 'shop' })),
    ...layout.fish.map((a) => ({ mode: 'fish', anchor: a, role: 'fisher' })),
    ...layout.seats.slice(0, 2 + rng.int(2)).map((a) => ({ mode: 'sit', anchor: a, role: 'villager' })),
    ...layout.work.slice(0, Math.ceil(n / 3)).map((a) => ({ mode, anchor: a, role: job })),
    ...Array.from({ length: RIDERS[t] }, () => ({ mode: 'ride', anchor: layout.hub, role: job })),
    ...Array.from({ length: HERDERS[t] ?? 0 }, () => ({ mode: 'herd', anchor: layout.hub, role: job })),
    ...Array.from({ length: GUARDS[t] }, () => ({ mode: 'guard', anchor: layout.hub, role: job, armed: true })),
    ...Array.from({ length: 2 * (1 + rng.int(2)) }, () => ({ mode: 'chat', anchor: layout.hub, role: job })),
  ];
}

// -> [{ name, female, kid, role, mode, anchor, look, seed, armed }]
export function population(site, layout) {
  const rng = new Rng(hash32(site.seed, 0x9e0));
  const [lo, hi] = COUNT[site.type], n = lo + rng.int(hi - lo + 1), job = ROLE[site.type];
  const fixed = slots(rng, site, layout, n, job);
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
  const armed = !kid && (slot.armed || rng.chance(ARMED[role] ?? 0));
  return { ...who, role, mode: slot.mode, anchor: { ...slot.anchor }, look: randomLook(rng, role, who.female),
    seed: hash32(site.seed, i, 0x5eed), gift: rng.chance(0.3), armed };
}
