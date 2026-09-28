// Earth's procedural mammals, birds of the ground, reptiles and critters (built by the creature
// builder from hand-picked genes), streamed by biome around the player through a Herds group.
// Hunters (wolves, tigers, bears...) favour cells next to villages, where they may go for NPCs.
import { Rng } from '../core/rng.js';
import { earthBiome } from '../earth/earth-biome.js';
import { EARTH_SEA } from '../earth/earth-terrain.js';

// [name, biomes, move, legs, body, size, primary, secondary, temperament, diet, herd, extra genes]
const ROWS = [
  ['Sapi', 'grass', 'jalan', 4, 'tong', 1.5, 0xf0ece4, 0x2a2420, 'Tenang', 'Herbivora', 5, { horns: 2, pattern: 'totol', stretch: 1.2 }],
  ['Kerbau', 'grass', 'jalan', 4, 'tong', 1.7, 0x3a3a3c, 0x2a2a2a, 'Tenang', 'Herbivora', 4, { horns: 2, stretch: 1.3 }],
  ['Kambing', 'grass rock', 'jalan', 4, 'lonjong', 0.8, 0xe8e0d0, 0x8a6a4a, 'Penasaran', 'Herbivora', 5, { horns: 2 }],
  ['Domba', 'grass', 'jalan', 4, 'bulat', 0.8, 0xf4f0e6, 0x3a3030, 'Jinak', 'Herbivora', 6, { features: ['rumbai'] }],
  ['Babi Hutan', 'forest grass', 'jalan', 4, 'tong', 0.9, 0x5a4232, 0x2a2018, 'Teritorial', 'Omnivora', 4, { features: ['moncong', 'gading'] }],
  ['Rubah', 'forest grass', 'jalan', 4, 'lonjong', 0.6, 0xd8742a, 0xf4f0e6, 'Pemangsa', 'Karnivora', 2, { features: ['moncong', 'telinga'], tail: 'long' }],
  ['Serigala', 'forest pine snow', 'jalan', 4, 'lonjong', 1.0, 0x7a7a80, 0xd8d8d8, 'Pemangsa', 'Karnivora', 4, { features: ['moncong'], tail: 'long' }],
  ['Beruang', 'forest pine', 'jalan', 4, 'bulat', 1.9, 0x4a3222, 0x2a1a12, 'Agresif', 'Omnivora', 1, { features: ['telinga'], stretch: 1.1 }],
  ['Gajah', 'grass', 'jalan', 4, 'tong', 3.1, 0x8a8a8c, 0xf0ece0, 'Tenang', 'Herbivora', 3, { features: ['belalai', 'gading', 'telinga'] }],
  ['Badak', 'grass desert', 'jalan', 4, 'tong', 2.2, 0x7a7670, 0x5a5650, 'Teritorial', 'Herbivora', 2, { horns: 1 }],
  ['Zebra', 'grass', 'jalan', 4, 'lonjong', 1.3, 0xf4f4f0, 0x1a1a1a, 'Penakut', 'Herbivora', 6, { pattern: 'belang', features: ['jambul'] }],
  ['Harimau', 'forest', 'jalan', 4, 'lonjong', 1.5, 0xe0802a, 0x1a1410, 'Pemangsa', 'Karnivora', 1, { pattern: 'belang', tail: 'long' }],
  ['Singa', 'grass desert', 'jalan', 4, 'lonjong', 1.5, 0xc8a060, 0x6a4a2a, 'Pemangsa', 'Karnivora', 3, { features: ['rumbai'], tail: 'long' }],
  ['Unta', 'desert', 'jalan', 4, 'bulat', 2.0, 0xc8a070, 0x8a6a40, 'Tenang', 'Herbivora', 3, { stretch: 1.4 }],
  ['Kanguru', 'desert grass', 'lompat', 2, 'lonjong', 1.2, 0xb07a4a, 0xe0c8a0, 'Pemalu', 'Herbivora', 4, { tail: 'long', features: ['telinga'] }],
  ['Kura-kura', 'beach grass', 'merayap', 4, 'bulat', 0.6, 0x5a6a3a, 0x8a7a4a, 'Tenang', 'Herbivora', 3, { features: ['cangkang'] }],
  ['Landak', 'forest', 'jalan', 4, 'bulat', 0.4, 0x5a4a3a, 0xe8e0d0, 'Pemalu', 'Omnivora', 3, { spikes: true }],
  ['Ayam Hutan', 'forest grass', 'jalan', 2, 'bulat', 0.4, 0xc0402a, 0x2a6a3a, 'Gelisah', 'Omnivora', 5, { features: ['jambul'] }],
  ['Kalkun', 'grass', 'jalan', 2, 'bulat', 0.6, 0x5a4232, 0xd02a2a, 'Penasaran', 'Omnivora', 4, { features: ['jambul', 'rumbai'] }],
  ['Bebek', 'beach grass', 'jalan', 2, 'bulat', 0.4, 0xf0f0e8, 0xf0a020, 'Jinak', 'Omnivora', 6, { features: ['moncong'] }],
  ['Rusa Kutub', 'snow pine', 'jalan', 4, 'lonjong', 1.4, 0xb8a890, 0xf0ece4, 'Pemalu', 'Herbivora', 5, { horns: 3 }],
  ['Beruang Kutub', 'snow', 'jalan', 4, 'bulat', 2.0, 0xf4f4f0, 0x1a1a1a, 'Pemangsa', 'Karnivora', 1, { features: ['telinga'] }],
  ['Kambing Gunung', 'rock snow', 'jalan', 4, 'lonjong', 0.9, 0xf0ece0, 0x3a3a3a, 'Pemalu', 'Herbivora', 4, { horns: 2 }],
  ['Kalajengking', 'desert', 'merayap', 8, 'segmen', 0.5, 0x2a2a2a, 0xc0802a, 'Agresif', 'Karnivora', 3, { tail: 'club' }],
  ['Ular Sanca', 'forest beach', 'merayap', 0, 'ular', 0.9, 0x6a5a2a, 0x2a2a1a, 'Pemangsa', 'Karnivora', 1, { pattern: 'totol' }],
  ['Kepiting', 'beach', 'merayap', 8, 'pipih', 0.4, 0xd0402a, 0xf0c0a0, 'Gelisah', 'Pemakan bangkai', 5, { features: ['cangkang'] }],
  ['Katak', 'beach forest', 'lompat', 4, 'bulat', 0.35, 0x4a9a3a, 0xe0e040, 'Pemalu', 'Karnivora', 5, { pattern: 'totol' }],
  ['Musang', 'forest', 'jalan', 4, 'lonjong', 0.5, 0x4a4038, 0xe0d8c8, 'Penasaran', 'Omnivora', 2, { tail: 'long', pattern: 'belang' }],
  ['Kuda Liar', 'grass', 'jalan', 4, 'lonjong', 1.6, 0x6a4028, 0x2a1a10, 'Penakut', 'Herbivora', 5, { features: ['jambul'], stretch: 1.4 }],
  ['Monyet', 'forest', 'jalan', 2, 'bulat', 0.6, 0x7a5a3a, 0xe0c0a0, 'Suka bermain', 'Omnivora', 5, { tail: 'long', features: ['telinga'] }],
];

const QUIRKS = ['Aktif saat fajar', 'Mengenali suara kawanannya', 'Menandai wilayah dengan bau', 'Berkubang di lumpur',
  'Tidur sambil berdiri', 'Mengingat jalur air', 'Bersuara keras saat bahaya'];

function genes(row, rng) {
  const [, , move, legs, body, size, primary, secondary, , , , extra] = row;
  return { move, body, legs, size, eyes: 2, eyeStalks: false, horns: 0, antennae: false, tail: 'short', spikes: false,
    wings: false, glow: false, primary, secondary, speed: 2.5 + size * 1.2, stretch: 1, features: [], heads: 1,
    pattern: 'dua-warna', seed: rng.int(0x7fffffff), ...extra };
}

export function earthBeasts() {
  const rng = new Rng(0xbea57);
  return ROWS.map((row, i) => ({ id: 100 + i, name: row[0], earth: true, biomes: row[1].split(' '), herd: row[10],
    livestock: LIVESTOCK.includes(row[0]),
    genes: genes(row, rng), lore: { temperament: row[8], diet: row[9], quirk: rng.pick(QUIRKS),
      height: +(row[5] * 1.1).toFixed(1), weight: Math.round(row[5] ** 3 * 120) } }));
}

const HUNT = ['Pemangsa', 'Agresif'];
const LIVESTOCK = ['Sapi', 'Kerbau', 'Kambing', 'Domba'];

// Herds options for Earth: this roster, picked by the biome under each streamed cell.
export function earthBeastOptions(h) {
  const species = earthBeasts();
  const biomeAt = (x, z) => { const y = h(x, z); return earthBiome(x, z, y, Math.hypot(h(x + 2, z) - y, h(x, z + 2) - y) / 2); };
  const pick = (x, z, rng, nearSite) => {
    const here = species.filter((sp) => sp.biomes.includes(biomeAt(x, z)));
    const hunters = here.filter((sp) => HUNT.includes(sp.lore.temperament));
    if (nearSite && hunters.length && rng.chance(0.4)) return rng.pick(hunters);
    return here.length ? rng.pick(here) : null;
  };
  return { species, pick, dry: (x, z) => h(x, z) > EARTH_SEA + 1.2, mounts: false };
}
