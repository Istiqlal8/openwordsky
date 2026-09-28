// Earth's species catalog for the scanner: real animals and plants, in the same schema as the
// procedural catalog (src/gen/species.js). Fauna have `herd: 0` and `earth: true`: the animals
// themselves are drawn by EarthFauna, so the procedural Herds group spawns none of them.
import { Rng } from '../core/rng.js';

// [key, name, label, height m, primary, secondary, quirk]
const FLORA = [
  ['oak', 'Pohon Ek', 'Pohon', 9, 0x3f7a2e, 0x5a3a22, 'Bijinya disimpan tupai'],
  ['birch', 'Pohon Birch', 'Pohon', 10, 0x6aa23a, 0xe8e4da, 'Kulit batangnya putih mengelupas'],
  ['pine', 'Pinus', 'Pohon jarum', 12, 0x2c5a32, 0x4a3422, 'Harum getah di siang hari'],
  ['spruce', 'Cemara', 'Pohon jarum', 9, 0x1f4a2e, 0x3a2a1c, 'Tetap hijau sepanjang musim'],
  ['palm', 'Kelapa', 'Palem', 8, 0x4f8f2f, 0x7a5a3a, 'Buahnya mengapung ke pulau lain'],
  ['bush', 'Semak', 'Semak', 1.3, 0x3f7f32, 0x2f5f28, 'Tempat kelinci bersembunyi'],
  ['flowers', 'Bunga Liar', 'Bunga', 0.55, 0x3f8f35, 0xf0d040, 'Didatangi kupu-kupu'],
  ['tallgrass', 'Rumput', 'Rumput', 0.9, 0x6aa840, 0x8ab850, 'Bergoyang tertiup angin'],
  ['cactus', 'Kaktus', 'Kaktus', 3.4, 0x4a7f3a, 0xf0e070, 'Menyimpan air berbulan-bulan'],
  ['reeds', 'Gelagah', 'Rumput air', 1.7, 0x6a8f3a, 0x6a4a2a, 'Tumbuh di tepi air'],
  ['fern', 'Pakis', 'Paku-pakuan', 0.9, 0x3a8a34, 0x2a6a28, 'Lebih tua dari dinosaurus'],
  ['mushroom', 'Jamur Merah', 'Jamur', 0.45, 0xd8342a, 0xf4f0e0, 'Beracun, jangan dimakan'],
];

// [name, move, legs, size, primary, temperament, diet, height m, weight kg, quirk, extra genes]
const FAUNA = [
  ['Rusa', 'jalan', 4, 1.6, 0x9a6a3a, 'Penakut', 'Herbivora', 1.4, 120, 'Lari berkelompok saat kaget', { horns: 2 }],
  ['Elang', 'terbang', 2, 0.9, 0x6a4a2a, 'Pemangsa', 'Karnivora', 0.9, 6, 'Melihat mangsa dari 3 km', {}],
  ['Camar', 'terbang', 2, 0.5, 0xf2f2f2, 'Penasaran', 'Omnivora', 0.4, 1, 'Suka mencuri makanan', {}],
  ['Paus Bungkuk', 'jalan', 0, 3.2, 0x3a4a5a, 'Tenang', 'Pemakan plankton', 14, 30000, 'Bernyanyi di laut dalam', { body: 'lonjong', tail: 'long' }],
  ['Ikan', 'jalan', 0, 0.4, 0x8ab0d0, 'Pemalu', 'Omnivora', 0.3, 1, 'Berenang dalam kawanan', { body: 'lonjong' }],
  ['T-Rex', 'jalan', 2, 3.2, 0x5a6a3a, 'Pemangsa', 'Karnivora', 5, 8000, 'Gigitannya terkuat di Bumi', { tail: 'long' }],
  ['Raptor', 'jalan', 2, 1.4, 0x8a6a4a, 'Agresif', 'Karnivora', 1.8, 60, 'Berburu dalam kawanan', { tail: 'long' }],
  ['Brontosaurus', 'jalan', 4, 3.2, 0x6a7a5a, 'Tenang', 'Herbivora', 12, 20000, 'Lehernya menjangkau pucuk pohon', { tail: 'long' }],
  ['Triceratops', 'jalan', 4, 2.4, 0x7a6a4a, 'Teritorial', 'Herbivora', 3, 9000, 'Tiga tanduk untuk bertahan', { horns: 3 }],
  ['Biawak', 'merayap', 4, 1.1, 0x6a6a3a, 'Pemalu', 'Karnivora', 1.2, 70, 'Berjemur di batu panas', { tail: 'long' }],
  ['Kelinci', 'lompat', 4, 0.4, 0xb89a7a, 'Penakut', 'Herbivora', 0.3, 2, 'Telinganya berputar mencari suara', { features: ['telinga'] }],
  ['Kupu-kupu', 'terbang', 0, 0.35, 0xf0a030, 'Jinak', 'Pemakan nektar', 0.1, 0.01, 'Mencicipi dengan kakinya', {}],
];

function floraSpecies([shape, name, label, height, primary, secondary, quirk], id) {
  return { id, name, label, quirk, earth: true,
    genes: { shape, height, primary, secondary, glow: false, sway: 0.5, weight: 1 } };
}

function faunaGenes(rng, move, legs, size, primary, extra) {
  return { move, body: 'lonjong', legs, size, eyes: 2, eyeStalks: false, horns: 0, antennae: false,
    tail: 'short', spikes: false, wings: move === 'terbang', glow: false, primary, secondary: primary,
    speed: 3, stretch: 1, features: [], heads: 1, pattern: 'polos', seed: rng.int(0x7fffffff), ...extra };
}

function faunaSpecies(row, id, rng) {
  const [name, move, legs, size, primary, temperament, diet, height, weight, quirk, extra] = row;
  return { id, name, earth: true, herd: 0, genes: faunaGenes(rng, move, legs, size, primary, extra),
    lore: { temperament, diet, quirk, height, weight } };
}

export function earthSpecies() {
  const rng = new Rng(0xea27);
  return { fauna: FAUNA.map((row, i) => faunaSpecies(row, i, rng)), flora: FLORA.map(floraSpecies) };
}
