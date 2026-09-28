// Workbench recipes. A cost line is { label, any: [item names], n }: any mix of the listed
// items pays it, so biome-locked materials always have alternatives from other worlds.
import { FLORA_MATERIALS } from '../quest/materials.js';

export const group = (label, any) => (n) => ({ label, any, n });
export const item = (name) => (n) => ({ label: name, any: [name], n });

const FUR = group('Bulu/Kulit', ['Bulu Lembut', 'Kulit Fauna', 'Bulu Sayap', 'Kulit Ular', 'Sisik']);
const BONE = group('Tulang/Kitin', ['Kitin', 'Tulang Besar', 'Serpih Kubus', 'Duri Tajam', 'Tulang Tanaman', 'Sisik']);
const GEL = group('Getah/Gel', ['Gel Hayati', 'Getah Kaktus', 'Nektar', 'Lendir Tentakel', 'Cahaya Cair', 'Gas Umbi', 'Inti Apung']);
const SPORE = group('Spora/Kristal', ['Spora', 'Serpih Kristal', 'Lensa Organik', 'Jamur Liar', 'Kantong Racun', 'Akar Bercahaya']);
const BIO = group('Bahan Flora', FLORA_MATERIALS);
const HERB = group('Herbal', ['Herba Liar', 'Nektar', 'Jamur Liar', 'Akar Bercahaya', 'Rumput Laut', 'Gel Hayati', 'Getah Kaktus', 'Es Murni']);
const FOOD = group('Bahan Makanan', ['Susu Fauna', 'Telur Fauna', 'Buah Hutan', 'Buah Kaktus', 'Biji Aneh', 'Biji Polong', 'Kerang', 'Rumput Laut']);
const RARE = group('Benda Langka', ['Geode', 'Geode Beku', 'Fosil', 'Mutiara', 'Kristal Anomali', 'Serpih Isotop',
  'Kaca Vulkanik', 'Pecahan Meteor', 'Batu Apung', 'Batu Gurun', 'Batu Sungai']);
const [FERIT, KARBON, OKSIGEN, NATRIUM, KOBALT, EMAS, NANIT] =
  ['Ferit', 'Karbon', 'Oksigen', 'Natrium', 'Kobalt', 'Emas', 'Nanit'].map(item);

// Upgrade recipes: tiers[i] is the cost of reaching tier i + 1.
export const UPGRADE_RECIPES = [
  { key: 'thermal', tiers: [
    [FERIT(15), FUR(3), NANIT(25)], [KOBALT(10), FUR(6), GEL(4), NANIT(70)], [EMAS(8), FUR(10), RARE(2), NANIT(160)]] },
  { key: 'filter', tiers: [
    [KARBON(15), BIO(4), NANIT(25)], [KOBALT(10), SPORE(5), NANIT(70)], [EMAS(8), BONE(6), RARE(2), NANIT(160)]] },
  { key: 'oxygen', tiers: [
    [OKSIGEN(15), GEL(3), NANIT(25)], [KOBALT(10), OKSIGEN(20), GEL(5), NANIT(70)], [EMAS(8), GEL(8), RARE(2), NANIT(160)]] },
  { key: 'beamRange', tiers: [
    [FERIT(20), BONE(2), NANIT(30)], [KOBALT(12), RARE(1), NANIT(80)], [EMAS(10), RARE(3), NANIT(180)]] },
  { key: 'beamSpeed', tiers: [
    [FERIT(20), KARBON(10), NANIT(30)], [KOBALT(12), BONE(4), NANIT(80)], [EMAS(10), BONE(6), RARE(3), NANIT(180)]] },
  { key: 'blaster', tiers: [
    [FERIT(20), BONE(3), NANIT(30)], [KOBALT(12), BONE(5), NANIT(80)], [EMAS(10), BONE(8), RARE(3), NANIT(180)]] },
];

// Consumables are used as soon as they are made. use(player) -> notice text, or null if pointless now.
export const USE_RECIPES = [
  { id: 'obat', name: 'Obat', effect: 'Pulihkan 50 kesehatan suit', cost: [HERB(2), FOOD(1), KARBON(5)],
    use(player) {
      if (player.suit.health >= 100) return null;
      player.suit.health = Math.min(100, player.suit.health + 50);
      return 'Obat dipakai: kesehatan +50';
    } },
  { id: 'umpan', name: 'Umpan', effect: '2 Protein Fauna untuk menjinakkan (T)', cost: [FOOD(2), BIO(1)],
    use(player) {
      player.addItem('Protein Fauna', 2);
      return 'Umpan siap: +2 Protein Fauna';
    } },
  { id: 'sel', name: 'Sel Darurat', effect: 'Isi penuh penunjang hidup & perlindungan', cost: [OKSIGEN(6), NATRIUM(6), GEL(1)],
    use(player) {
      const s = player.suit;
      if (s.lifeSupport >= 100 && s.hazard >= 100) return null;
      s.lifeSupport = s.hazard = 100;
      return 'Sel darurat: sistem suit penuh';
    } },
];

// How many of a cost line the player can pay right now.
export function have(player, line) {
  return line.any.reduce((sum, name) => sum + player.count(name), 0);
}

export function affordable(player, cost) {
  return cost.every((line) => have(player, line) >= line.n);
}

// Pays each line from the biggest stacks first. Caller checks affordable() before.
export function pay(player, cost) {
  for (const line of cost) {
    let left = line.n;
    const stacks = [...line.any].sort((a, b) => player.count(b) - player.count(a));
    for (const name of stacks) {
      const k = Math.min(left, player.count(name));
      if (k) player.removeItem(name, k);
      left -= k;
    }
  }
}
