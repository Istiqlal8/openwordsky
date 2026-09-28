// Kitchen (Dapur tab): dishes cooked from animal and plant food. Dishes go to the inventory;
// eating one starts timed buffs (src/craft/buffs.js).
import { group, item, pay } from './recipes.js';
import { owner } from './owner.js';
import { BUFFS, grantBuffs } from './buffs.js';

// A cost group that also accepts endemic plant products ("Madu Kelo", "Spora Vex"...) by
// their first word, read from the owner's inventory at the time of asking.
function withEndemic(label, fixed, prefixes) {
  return (n) => ({
    label, n,
    get any() {
      const inv = Object.keys(owner.player?.inventory ?? {});
      return [...new Set([...fixed, ...inv.filter((name) => prefixes.includes(name.split(' ')[0]))])];
    },
  });
}

const MEAT = item('Protein Fauna');
const DAIRY = group('Susu/Telur', ['Susu Fauna', 'Telur Fauna']);
const HERB = group('Herba', ['Herba Liar', 'Rumput Laut', 'Jamur Liar', 'Akar Bercahaya', 'Daun Kipas']);
const SWEET = withEndemic('Manis', ['Nektar', 'Buah Hutan', 'Buah Kaktus', 'Biji Aneh'], ['Madu', 'Nektar', 'Buah', 'Embun']);
const SPORE = withEndemic('Spora/Jamur', ['Spora', 'Jamur Liar'], ['Spora', 'Jamur', 'Lumut']);
const STAR = group('Bahan Bintang', ['Susu Bintang', 'Bulu Emas', 'Inti Bintang', 'Bunga Bulan', 'Serbuk Mekar']);

export const DISHES = [
  { id: 'sup', name: 'Sup Hangat', buffs: ['warm'], secs: 180, cost: [MEAT(1), DAIRY(1), HERB(2)] },
  { id: 'jus', name: 'Jus Nektar', buffs: ['sprint'], secs: 120, cost: [SWEET(3)] },
  { id: 'sate', name: 'Sate Fauna', buffs: ['regen'], secs: 90, cost: [MEAT(2), HERB(1)] },
  { id: 'roti', name: 'Roti Spora', buffs: ['toxic'], secs: 180, cost: [SPORE(3), DAIRY(1)] },
  { id: 'bintang', name: 'Hidangan Bintang', buffs: ['warm', 'sprint', 'regen', 'toxic'], secs: 300,
    cost: [STAR(2), MEAT(1), SWEET(2), HERB(2)] },
];

export function dishOf(name) {
  return DISHES.find((d) => d.name === name) ?? null;
}

export function dishEffect(dish) {
  return dish.buffs.map((id) => BUFFS[id].effect).join(' · ');
}

// Caller checks affordable() first.
export function cookDish(player, dish) {
  pay(player, dish.cost);
  player.addItem(dish.name, 1);
  player.emit('act', { type: 'cook', item: dish.name });
  return `${dish.name} matang · masuk tas`;
}

// -> toast text. Also reachable from the inventory "Makan" button (src/items/use.js).
export function eatDish(player, name) {
  const dish = dishOf(name);
  if (!dish || !owner.state) return 'Tidak bisa dimakan';
  if (!player.removeItem(name, 1)) return `${name} habis`;
  grantBuffs(player, dish.buffs, dish.secs);
  return `${name} dimakan · ${dish.buffs.map((id) => BUFFS[id].name).join(', ')} ${dish.secs} dtk`;
}

// Item encyclopedia entries for the dishes (src/items/catalog.js); 'eat' runs eatDish.
export const DISH_INFO = Object.fromEntries(DISHES.map((d) => [d.name, {
  cat: 'Makanan', desc: 'Masakan hangat dari Dapur.', source: 'Dimasak di tab Dapur (U).',
  use: `${dishEffect(d)} selama ${d.secs} dtk.`, actions: ['eat'] }]));
