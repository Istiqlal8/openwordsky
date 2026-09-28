// Fish species per biome (common / uncommon / rare), a legendary per biome that only bites at
// night or in a storm, and one endemic fish per planet named from its seed.
// Inventory items are always 'Ikan <name>' so recipes can match them by prefix.
import { rngOf } from '../core/rng.js';
import { word } from '../gen/names.js';

export const TIER = {
  common: { label: 'Umum', w: 60, size: [15, 40], price: 8 },
  uncommon: { label: 'Tak biasa', w: 28, size: [30, 70], price: 16 },
  rare: { label: 'Langka', w: 9, size: [60, 140], price: 40 },
  endemic: { label: 'Endemik', w: 6, size: [25, 90], price: 30 },
  legendary: { label: 'Legendaris', w: 0, size: [150, 400], price: 180 },
};

// [common..., uncommon..., rare...] + legendary, per biome.
const BIOME_FISH = {
  lush: { common: ['Nila Lumut', 'Wader Hijau'], uncommon: ['Gurami Daun'], rare: ['Arwana Zamrud'], legendary: 'Raja Rawa' },
  ocean: { common: ['Kembung Biru', 'Tongkol Perak'], uncommon: ['Kakap Karang', 'Pari Pasir'], rare: ['Marlin Pelangi'], legendary: 'Raja Samudra' },
  frozen: { common: ['Salem Es', 'Kod Beku'], uncommon: ['Belut Salju'], rare: ['Sturgeon Kristal'], legendary: 'Hantu Gletser' },
  toxic: { common: ['Lele Lendir', 'Buntal Asam'], uncommon: ['Gabus Spora'], rare: ['Belut Neon'], legendary: 'Ratu Racun' },
  volcanic: { common: ['Wader Abu', 'Sirip Bara'], uncommon: ['Lele Magma'], rare: ['Salamander Lava'], legendary: 'Naga Magma' },
  exotic: { common: ['Pari Prisma', 'Sirip Gema'], uncommon: ['Tetra Waktu'], rare: ['Koi Hampa'], legendary: 'Penjaga Dimensi' },
  desert: { common: ['Nila Oasis', 'Gabus Pasir'], uncommon: ['Mujair Kering'], rare: ['Koi Fatamorgana'], legendary: 'Raja Oasis' },
  irradiated: { common: ['Sepat Isotop', 'Lele Pendar'], uncommon: ['Mujair Mutan'], rare: ['Arwana Radium'], legendary: 'Inti Bercahaya' },
  barren: { common: ['Teri Debu', 'Belut Batu'], uncommon: ['Kakap Sunyi'], rare: ['Coelacanth Batu'], legendary: 'Purba Senyap' },
};
const ENDEMIC_HEAD = ['Sirip', 'Sisik', 'Kakap', 'Belut', 'Pari', 'Tetra', 'Koi', 'Gurami'];
export const LEGEND_CHANCE = 0.06; // per bite, only at night or in a storm

export function biomeKey(planet) {
  return BIOME_FISH[planet?.biome?.id] ? planet.biome.id : 'lush';
}

// -> [{ name, item, tier, biome }] every fish this planet can give (legendary last).
export function fishOf(planet) {
  const b = biomeKey(planet), set = BIOME_FISH[b];
  const list = [];
  for (const tier of ['common', 'uncommon', 'rare']) for (const name of set[tier]) list.push(entry(name, tier, b));
  list.push(endemicFish(planet));
  list.push(entry(set.legendary, 'legendary', b));
  return list;
}

function entry(name, tier, biome) {
  return { name, item: `Ikan ${name}`, tier, biome };
}

export function endemicFish(planet) {
  const rng = rngOf(planet?.seed ?? 1, 0xf15a);
  return entry(`${rng.pick(ENDEMIC_HEAD)} ${word(rng)}`, 'endemic', biomeKey(planet));
}

// Roll the fish on the hook. rand() in [0,1); legendOk = night or storm.
export function rollFish(planet, rand, legendOk) {
  const all = fishOf(planet);
  if (legendOk && rand() < LEGEND_CHANCE) return all[all.length - 1];
  const pool = all.filter((f) => f.tier !== 'legendary');
  let r = rand() * pool.reduce((s, f) => s + TIER[f.tier].w, 0);
  for (const f of pool) { r -= TIER[f.tier].w; if (r <= 0) return f; }
  return pool[0];
}

export function rollSize(fish, rand) {
  const [a, b] = TIER[fish.tier].size;
  return Math.round(a + (b - a) * rand() * rand()); // big fish are rarer
}

// Market price for an 'Ikan …' item (null if the name is not a fish).
const PRICE = new Map();
for (const set of Object.values(BIOME_FISH)) {
  for (const tier of ['common', 'uncommon', 'rare']) for (const n of set[tier]) PRICE.set(`Ikan ${n}`, TIER[tier].price);
  PRICE.set(`Ikan ${set.legendary}`, TIER.legendary.price);
}

export function fishPrice(name) {
  if (PRICE.has(name)) return PRICE.get(name);
  return typeof name === 'string' && name.startsWith('Ikan ') ? TIER.endemic.price : null;
}
