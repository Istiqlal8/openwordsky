// Endless side contracts, built from whatever is around the player right now.
import { floraMaterial, gatherProduct, pickupsOf } from './materials.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const between = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// Each maker: (planet, tier) -> { title, text, goal, pay } or null when not possible here.
const SURFACE = [
  (p, t) => {
    const sp = pick(p.species.flora);
    if (!sp) return null;
    const item = floraMaterial(sp), n = between(3, 6) + t * 2;
    return { title: `Pesanan ${item}`, text: `Panen tumbuhan seperti ${sp.name}.`, goal: { type: 'item', item, n }, pay: 12 };
  },
  (p, t) => {
    const sp = pick(p.species.fauna);
    if (!sp) return null;
    const item = gatherProduct(sp), n = between(2, 4) + t;
    return { title: `Hasil Ternak: ${item}`, text: `Tekan Q di dekat ${sp.name} yang tenang.`, goal: { type: 'item', item, n }, pay: 18 };
  },
  (p, t) => {
    const item = pick(pickupsOf(p)), n = between(2, 4) + t;
    return { title: `Kolektor ${item}`, text: 'Cari benda bercahaya di tanah.', goal: { type: 'item', item, n }, pay: 16 };
  },
  (p, t) => {
    const item = pick(p.resources), n = between(15, 30) + t * 10;
    return { title: `Tambang ${item}`, text: 'Mineral lokal dibutuhkan pangkalan.', goal: { type: 'item', item, n }, pay: 3 };
  },
  (p, t) => (p.species.fauna.length ? { title: 'Pengendali Hama', text: 'Buru hewan di planet ini.', goal: { type: 'hunt', n: between(2, 4) + t }, pay: 25 } : null),
  (p, t) => (p.species.flora.length ? { title: 'Pemanen', text: 'Panen tumbuhan apa saja.', goal: { type: 'harvest', n: between(8, 14) + t * 4 }, pay: 6 } : null),
  (p, t) => ({ title: 'Penggali', text: 'Tambang batu.', goal: { type: 'mine', n: between(5, 10) + t * 3 }, pay: 8 }),
  (p, t) => ({ title: 'Pemulung', text: 'Pungut benda alam apa saja.', goal: { type: 'pickup', n: between(4, 8) + t * 2 }, pay: 10 }),
  (p, t) => (p.species.fauna.length ? { title: 'Peternak', text: 'Ambil hasil hewan (Q).', goal: { type: 'gather', n: between(3, 5) + t }, pay: 18 } : null),
];

const SPACE = [
  (t) => ({ title: 'Kurir Warp', text: 'Lompat ke sistem lain.', goal: { type: 'warp', n: between(1, 2) + Math.floor(t / 2) }, pay: 60 }),
  (t) => ({ title: 'Kartografer', text: 'Pindai planet yang belum ditemukan.', goal: { type: 'discover', n: between(1, 3) + t }, pay: 45 }),
  (t) => ({ title: 'Penambang Asteroid', text: 'Hancurkan asteroid.', goal: { type: 'asteroid', n: between(5, 10) + t * 3 }, pay: 8 }),
  (t) => ({ title: 'Buronan', text: 'Kalahkan bajak laut.', goal: { type: 'pirate', n: between(1, 3) + t }, pay: 70 }),
  (t) => ({ title: 'Wisata Planet', text: 'Mendarat di planet mana saja.', goal: { type: 'land', n: between(1, 3) }, pay: 40 }),
];

const BONUS = ['Karbon', 'Ferit', 'Kobalt', 'Protein Fauna', 'Emas'];

// planet = current surface planet or null in space; tier = player rank index.
export function makeContract(planet, tier) {
  let c = null;
  for (let tries = 0; !c && tries < 8; tries++) c = planet ? pick(SURFACE)(planet, tier) : pick(SPACE)(tier);
  if (!c) c = SPACE[0](tier);
  const nanit = Math.round(c.goal.n * c.pay * (1 + tier * 0.25));
  const items = Math.random() < 0.35 ? [[pick(BONUS), between(3, 10)]] : [];
  const where = planet ? planet.name : null;
  return { id: `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`, kind: 'contract', where,
    title: c.title, text: c.text, goal: c.goal, reward: { nanit, items, xp: 8 + Math.round(nanit / 8) }, progress: 0 };
}

// Race favour (Sahabat+ reputation): deliver one of the outpost race's favourite goods.
export function raceContract(race, planet, tier) {
  const item = pick(race.wants), n = between(8, 15) + tier * 3;
  const nanit = Math.round(n * 14 * (1 + tier * 0.25));
  const items = race.gifts === 'Nanit' ? [['Kristal Alien', 1]] : [[race.gifts, 1]];
  return { id: `r${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`, kind: 'contract', where: planet.name,
    race: race.id, title: `Pesanan ${race.name}`, text: `${race.name} mempercayaimu. Serahkan ${n} ${item} kepada mereka.`,
    goal: { type: 'deliver', item, n }, reward: { nanit, items, xp: 20 + Math.round(nanit / 8) }, progress: 0 };
}
