// Picks what the on-foot guide markers point at: the endemic relic, explorers with a request and
// ground pickups the active quests ask for. Returns at most MAX targets, most useful first.
import { requestOf } from '../quest/npc-requests.js';
import { hunt } from '../prospect/prospect-hunt.js';
import { questLink } from './quest-link.js';

const MAX = 4;
const COLOR = { relic: '#5ff4ff', npc: '#9dff6a', quest: '#ffb040', hunt: '#7dffb2' };
const flat = (a, f) => Math.hypot(a.x - f.x, a.z - f.z);

function nearest(list, feet) {
  let best = null, bestD = Infinity;
  for (const it of list) { const d = flat(it, feet); if (d < bestD) { best = it; bestD = d; } }
  return best;
}

function relicTarget(items, feet) {
  const it = nearest(items.filter((i) => i.tier === 3), feet);
  return it ? [{ id: `p${it.key}`, kind: 'relic', label: it.name, x: it.x, y: it.y + 1.4, z: it.z }] : [];
}

function npcTargets(visitors, planet) {
  const out = [];
  for (const v of visitors?.visitors ?? []) {
    const e = v.explorer;
    if (!e.outside || !requestOf(e.seed, planet, e.name)) continue;
    out.push({ id: `n${e.seed}`, kind: 'npc', label: `${e.name} !`, x: e.feet.x, y: e.feet.y + 3.2, z: e.feet.z });
  }
  return out;
}

// Pickup names still needed by story, contract or NPC goals (relic excluded: it has its own marker).
function neededNames(names, relic) {
  const want = new Set();
  for (const q of questLink.log?.active ?? []) {
    const it = q.goal.item;
    if (it && it !== relic && names.includes(it) && q.progress < q.goal.n) want.add(it);
  }
  return want;
}

// The material picked on the galaxy map, once the player is standing on a planet that drops it.
function huntTargets(pickups, feet) {
  if (!hunt.item || !pickups?.names.includes(hunt.item)) return [];
  const it = nearest(pickups.items.filter((i) => i.name === hunt.item), feet);
  return it ? [{ id: `p${it.key}`, kind: 'hunt', label: it.name, x: it.x, y: it.y + 1.4, z: it.z }] : [];
}

function questTargets(pickups, feet) {
  const relic = pickups.names[3];
  const out = [];
  for (const name of neededNames(pickups.names, relic)) {
    const it = nearest(pickups.items.filter((i) => i.name === name), feet);
    if (it) out.push({ id: `p${it.key}`, kind: 'quest', label: it.name, x: it.x, y: it.y + 1.4, z: it.z });
  }
  return out;
}

// -> [{ id, kind, label, color, x, y, z, d }]
export function guideTargets(ctx) {
  const feet = ctx.surface.feet, pickups = ctx.pickups;
  const byDist = (list) => list.map((t) => ({ ...t, color: COLOR[t.kind], d: flat(t, feet) })).sort((a, b) => a.d - b.d);
  const list = [
    ...byDist(pickups ? relicTarget(pickups.items, feet) : []),
    ...byDist(pickups ? huntTargets(pickups, feet) : []),
    ...byDist(npcTargets(ctx.visitors, ctx.planet)).slice(0, 2),
    ...byDist(pickups ? questTargets(pickups, feet) : []),
  ];
  const seen = new Set();
  return list.filter((t) => !seen.has(t.id) && seen.add(t.id)).slice(0, MAX);
}
