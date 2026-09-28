// Item encyclopedia: what every inventory item is, where it comes from and what it is for.
import { FLORA_MATERIALS, FAUNA_MATERIALS, PICKUPS } from '../quest/materials.js';

// Things you can use straight from the inventory (see items/use.js).
export const ACTIONS = {
  oxygen: 'Isi oksigen suit', hazard: 'Isi pelindung suit', heal: 'Pulihkan kesehatan',
  energy: 'Isi energi pesawat', hull: 'Perbaiki lambung pesawat',
};

const KNOWN = {
  Nanit: { cat: 'Mata uang', desc: 'Mesin nano yang dipakai sebagai uang di seluruh galaksi.',
    source: 'Menemukan planet baru, misi, pedagang alien, menghancurkan bajak laut dan penjaga.', use: 'Beli senjata dan barang di toko.' },
  Karbon: { cat: 'Sumber daya', desc: 'Unsur organik dasar.', source: 'Menambang tumbuhan (klik kiri) dan asteroid.',
    use: 'Bahan bakar oksigen suit dan energi pesawat.', actions: ['oxygen', 'energy'] },
  Ferit: { cat: 'Sumber daya', desc: 'Debu logam dari batuan.', source: 'Menambang batu dan asteroid.',
    use: 'Perbaiki lambung pesawat, isi pelindung suit.', actions: ['hull', 'hazard'] },
  Oksigen: { cat: 'Sumber daya', desc: 'Gas yang bisa dihirup.', source: 'Tumbuhan di planet subur.', use: 'Isi oksigen suit.', actions: ['oxygen'] },
  Natrium: { cat: 'Sumber daya', desc: 'Mineral reaktif.', source: 'Tumbuhan dan batu di planet panas/toksik.', use: 'Isi pelindung bahaya suit.', actions: ['hazard'] },
  'Protein Fauna': { cat: 'Hewan', desc: 'Daging dari hewan yang diburu.', source: 'Menembak hewan (klik kanan).',
    use: 'Menjinakkan hewan (T) dan memulihkan kesehatan.', actions: ['heal'] },
  'Logam Penjaga': { cat: 'Langka', desc: 'Pelat dari drone penjaga.', source: 'Menghancurkan drone penjaga.', use: 'Dijual/ditukar, bahan misi.' },
  'Artefak Kuno': { cat: 'Langka', desc: 'Peninggalan bangsa kuno.', source: 'Reruntuhan (T), kapal karam, pedagang alien.', use: 'Barang berharga untuk misi dan koleksi.' },
  'Kristal Alien': { cat: 'Langka', desc: 'Kristal yang diolah bangsa alien.', source: 'Berdagang dengan pedagang alien (T).', use: 'Barang dagangan bernilai tinggi.' },
  'Trofi Langka': { cat: 'Langka', desc: 'Trofi dari hewan buruan besar.', source: 'Berburu dinosaurus dan hewan raksasa.', use: 'Koleksi dan misi berburu.' },
};

const EDIBLE = new Set(['Buah Hutan', 'Herba Liar', 'Susu Fauna', 'Telur Fauna', 'Nektar', 'Buah Kaktus', 'Jamur Liar', 'Rumput Laut']);
const PICKUP_SET = new Set(Object.values(PICKUPS).flat());
const FUEL = new Set(['Tritium', 'Uranium', 'Hidrogen', 'Helium', 'Helium-3', 'Metana', 'Solanium']);
const METAL = new Set(['Besi', 'Magnetized Ferrite', 'Kobalt', 'Tembaga', 'Nikel', 'Pirit']);
const AIR = new Set(['Es Air', 'Air', 'Es Murni']);

function guess(name) {
  if (PICKUP_SET.has(name)) return { cat: 'Temuan', desc: 'Benda alam yang tergeletak di tanah.', source: 'Berjalan melewatinya di permukaan planet.', use: 'Bahan misi dan koleksi.' };
  if (FLORA_MATERIALS.includes(name)) return { cat: 'Tumbuhan', desc: 'Bahan dari tumbuhan.', source: 'Memanen/menambang tumbuhan (klik kiri).', use: 'Bahan misi panen.' };
  if (FAUNA_MATERIALS.includes(name)) return { cat: 'Hewan', desc: 'Hasil dari hewan.', source: 'Q di dekat hewan jinak, atau berburu.', use: 'Bahan misi peternak/pemburu.' };
  return { cat: 'Sumber daya', desc: 'Unsur atau mineral dari planet.', source: 'Menambang batu, tumbuhan dan asteroid di planet yang memilikinya.', use: 'Bahan dagang dan misi.' };
}

function extraActions(name) {
  const a = [];
  if (EDIBLE.has(name)) a.push('heal');
  if (AIR.has(name)) a.push('oxygen');
  if (FUEL.has(name)) a.push('energy');
  if (METAL.has(name)) a.push('hull');
  return a;
}

// -> { name, cat, desc, source, use, actions: [actionId] }
export function itemInfo(name) {
  const base = KNOWN[name] ?? guess(name);
  const actions = [...new Set([...(base.actions ?? []), ...extraActions(name)])];
  const use = actions.length && !KNOWN[name] ? `${base.use} Bisa dipakai: ${actions.map((x) => ACTIONS[x].toLowerCase()).join(', ')}.` : base.use;
  return { name, ...base, use, actions };
}
