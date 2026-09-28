// Requests from NPC explorers on planet surfaces. Deterministic per explorer seed, so the same
// explorer always asks for the same thing; answered explorers are remembered in the save.
import { Rng, hash32 } from '../core/rng.js';
import { endemicOf } from './endemic.js';
import { pickupsOf } from './materials.js';

const ASK_CHANCE = 0.65;
let answered = {}; // explorer seed -> timestamp; bound to save.quests.npcDone by QuestLog

export function bindNpcState(questState) {
  questState.npcDone ??= {};
  answered = questState.npcDone;
}

const between = (rng, lo, hi) => lo + rng.int(hi - lo + 1);

// Each: (rng, planet) -> { title, line, goal, pay } | null
const KINDS = [
  (rng, p) => {
    const item = rng.pick(p.resources), n = between(rng, 10, 25);
    return { title: `Pasokan ${item}`, line: `Aku butuh ${n} ${item} untuk riset. Bisa bantu?`, goal: { type: 'deliver', item, n }, pay: 5 };
  },
  (rng) => {
    const item = rng.pick(['Ferit', 'Karbon']), n = between(rng, 15, 30);
    return { title: 'Perbaikan Darurat', line: `Kapalku rusak! Tolong carikan ${n} ${item}.`, goal: { type: 'deliver', item, n }, pay: 4 };
  },
  (rng) => ({ title: 'Bekal Makan', line: 'Perbekalanku habis... punya Protein Fauna?', goal: { type: 'deliver', item: 'Protein Fauna', n: between(rng, 2, 4) }, pay: 35 }),
  (rng, p) => {
    const e = endemicOf(p).find((x) => x.source !== 'pickup');
    return e ? { title: `Sampel ${e.name}`, line: `Konon ${e.name} hanya ada di planet ini. Bawakan untukku!`, goal: { type: 'deliver', item: e.name, n: between(rng, 2, 3) }, pay: 60 } : null;
  },
  (rng, p) => {
    const e = endemicOf(p).find((x) => x.source === 'pickup');
    return e ? { title: `Legenda ${e.name}`, line: `Aku mencari ${e.name}, benda bercahaya biru di tanah.`, goal: { type: 'item', item: e.name, n: 1 }, pay: 150 } : null;
  },
  (rng, p) => {
    const item = rng.pick(pickupsOf(p)), n = between(rng, 3, 5);
    return { title: `Koleksi ${item}`, line: `Aku kolektor ${item}. Kumpulkan ${n} untukku ya.`, goal: { type: 'deliver', item, n }, pay: 30 };
  },
  (rng, p) => (p.species.fauna.length ? { title: 'Hewan Pengganggu', line: 'Hewan-hewan di sini mengacak-acak kemahku. Usir mereka!', goal: { type: 'hunt', n: between(rng, 2, 4) }, pay: 45 } : null),
  (rng, p) => (p.species.fauna.length ? { title: 'Data Satwa', line: 'Aku butuh data spesies baru untuk jurnalku.', goal: { type: 'scanFauna', n: 1 }, pay: 80 } : null),
  (rng, p) => (p.species.fauna.length ? { title: 'Susu Segar', line: 'Ambilkan hasil hewan jinak di sini, tekan Q di dekatnya.', goal: { type: 'gather', n: between(rng, 2, 3) }, pay: 50 } : null),
];

// -> request quest for this explorer, or null when it has none (or it was already answered).
export function requestOf(seed, planet, giver) {
  if (answered[seed]) return null;
  const rng = new Rng(hash32(seed, 0x9e57));
  if (!rng.chance(ASK_CHANCE)) return null;
  let r = null;
  for (let tries = 0; !r && tries < 6; tries++) r = rng.pick(KINDS)(rng, planet);
  if (!r) return null;
  const nanit = Math.round(r.goal.n * r.pay + 40);
  const items = rng.chance(0.4) ? [[rng.pick(['Kobalt', 'Emas', 'Logam Penjaga']), between(rng, 2, 6)]] : [];
  return { id: `npc${seed}`, seed, kind: 'npc', giver, where: planet.name, title: r.title, text: `${giver}: “${r.line}”`,
    line: r.line, goal: r.goal, reward: { nanit, items, xp: 15 + Math.round(nanit / 6) }, progress: 0 };
}

export function markAnswered(seed) { answered[seed] = Date.now(); }
