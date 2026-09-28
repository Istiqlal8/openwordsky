// NPC quest chains: after an explorer's request is done, ~40% of them ask to meet again on a
// planet 1-4 systems away. Landing there starts the final task(s). Steps live in log.s.npc.
import { Rng, hash32 } from '../core/rng.js';
import { systemAt, allSystems, planetsOf } from '../gen/galaxy.js';

const CHAIN_CHANCE = 0.4;
const NEAREST = 4;

const INTRO = [
  'Terima kasih! Tapi aku menemukan sesuatu yang lebih besar. Temui aku di {p} di sistem {s}.',
  'Kau bisa dipercaya. Ada rahasia yang harus kutunjukkan, temui aku di {p} di sistem {s}.',
  'Sinyal aneh datang dari {p} di sistem {s}. Temui aku di sana, aku butuh bantuanmu lagi.',
];

// Tasks at the meeting planet: [goal type, title, line, lo, hi, pay per unit]
const TASKS = [
  ['hunt', 'Pemburu Bayangan', 'Predator di sini mengancam kemahku. Buru mereka!', 3, 5, 90],
  ['gather', 'Bekal Perjalanan', 'Kita butuh bekal. Ambil hasil hewan jinak (Q).', 3, 5, 80],
  ['scanFauna', 'Makhluk Misterius', 'Catat spesies fauna yang belum pernah kau lihat.', 1, 2, 200],
  ['pickup', 'Jejak Bercahaya', 'Benda-benda bercahaya itu petunjuknya. Kumpulkan!', 4, 7, 60],
  ['harvest', 'Ramuan Kuno', 'Resep kuno butuh banyak bahan tumbuhan.', 12, 20, 25],
  ['mine', 'Logam Legenda', 'Di bawah tanah ini ada logam langka. Tambang!', 8, 14, 35],
];

const OUTRO = ['Luar biasa! Kisah ini akan kuceritakan di seluruh galaksi.',
  'Kita berhasil! Ambil ini, kau pantas mendapatkannya.'];

// Nearest systems to `from` (excluding itself) -> pick one of the closest NEAREST.
function nearbySystem(galaxySeed, from, rng) {
  const here = systemAt(galaxySeed, from).pos;
  const d = (s) => Math.hypot(s.pos.x - here.x, s.pos.y - here.y, s.pos.z - here.z);
  const near = allSystems(galaxySeed).filter((s) => s.index !== from)
    .map((s) => ({ s, d: d(s) })).sort((a, b) => a.d - b.d).slice(0, NEAREST);
  return rng.pick(near).s;
}

// -> meeting step for a finished request q, or null (no chain this time).
export function chainStart(q, galaxySeed, fromSystem) {
  const rng = new Rng(hash32(q.seed ?? 0, 0xc4a1));
  if (fromSystem == null || !rng.chance(CHAIN_CHANCE)) return null;
  const sys = nearbySystem(galaxySeed, fromSystem, rng);
  const solid = planetsOf(galaxySeed, sys).filter((p) => !p.gas);
  if (!solid.length) return null;
  const p = rng.pick(solid);
  const steps = 2 + rng.int(2);
  const line = rng.pick(INTRO).replace('{p}', p.name).replace('{s}', sys.name);
  const chain = { seed: q.seed, giver: q.giver, planet: p.key, where: p.name, system: sys.name, step: 1, steps };
  return step(chain, `Temui ${q.giver}`, line, { type: 'meet', planet: p.key, where: `${p.name} · ${sys.name}`, n: 1 }, 250);
}

// -> next step after `chain.step` finished, or null when the chain is over.
export function chainNext(chain) {
  if (chain.step >= chain.steps) return null;
  const next = { ...chain, step: chain.step + 1 };
  const rng = new Rng(hash32(chain.seed ?? 0, 0xc4a2, next.step));
  const [type, title, line, lo, hi, pay] = rng.pick(TASKS);
  const n = lo + rng.int(hi - lo + 1);
  const last = next.step === next.steps;
  const text = last ? `${line} ${rng.pick(OUTRO)}` : line;
  return step(next, title, text, { type, n }, Math.round(n * pay * (last ? 2 : 1.2)));
}

function step(chain, title, line, goal, nanit) {
  const items = chain.step === chain.steps ? [['Emas', 4 + chain.steps], ['Artefak Kuno', 1]] : [];
  return { id: `chain${chain.seed}-${chain.step}`, seed: null, kind: 'npc', giver: chain.giver, where: chain.where,
    title: `${title} (${chain.step}/${chain.steps})`, text: `${chain.giver}: “${line}”`, line, goal, chain,
    reward: { nanit, items, xp: 30 + Math.round(nanit / 5) }, progress: 0 };
}

// Addon half: starts chains when requests finish, advances them, and checks meeting planets.
export class NpcChains {
  constructor(wiring) {
    this.w = wiring;
    this.log = wiring.log;
    this.lastSystem = null;
    wiring.player.on('questDone', (q) => this.questDone(q));
  }

  questDone(q) {
    if (q.kind !== 'npc') return;
    const next = q.chain ? chainNext(q.chain)
      : chainStart(q, this.w.save.galaxySeed ?? 0, this.w.planet?.systemIndex ?? this.lastSystem);
    if (!next) return;
    this.log.s.npc.push(next);
    this.log.version++;
    this.w.hud.toast(`${next.giver}: ${next.line}`);
  }

  arrived(planet) {
    this.lastSystem = planet.systemIndex;
    this.log.record('meet', { planet: planet.key });
  }

  update() {}
}
