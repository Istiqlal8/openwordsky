// Base market prices (in Nanit) for every item name the game hands out, grouped by
// category and rarity. Shops scale these with their own markup and race preferences.
import { BIOMES, COMMON_RESOURCES } from '../gen/biomes.js';
import { SOLAR_PLANETS } from '../gen/solar-data.js';
import { FLORA_MATERIALS, FAUNA_MATERIALS, PICKUPS, EVENT_MATERIALS } from '../quest/materials.js';

export const CURRENCY = 'Nanit';

const CHEAP = ['Ferit', 'Karbon', 'Oksigen', 'Natrium', 'Silika', 'Es Air', 'Garam', 'Ammonia', 'Amonia', 'Belerang',
  'Pirit', 'Dioksit', 'Klorin', 'Air', 'Basalt', 'Karbon Dioksida', 'Hidrogen', 'Metana', 'Helium'];
const FIXED = {
  Emas: 20, Platinum: 28, Indium: 24, Uranium: 18, Tritium: 16, 'Kristal Anomali': 30, Kobalt: 10, 'Helium-3': 22,
  'Protein Fauna': 8, 'Logam Penjaga': 40, 'Artefak Kuno': 150, 'Kristal Alien': 80, 'Trofi Langka': 110,
  'Bulu Emas': 90, 'Susu Bintang': 70, 'Bunga Bulan': 60, 'Kristal Badai': 65, 'Pecahan Meteor': 30,
  'Inti Bintang': 120, 'Serbuk Mekar': 45, Mutiara: 35, Fosil: 26, Geode: 22, 'Geode Beku': 24, 'Serpih Isotop': 28,
  'Tulang Besar': 18, 'Bulu Sayap': 16, 'Lensa Organik': 15, 'Cahaya Cair': 16, 'Inti Apung': 14,
};
const PICKUP_ALL = Object.values(PICKUPS);
const RESOURCES = [...new Set([...BIOMES.flatMap((b) => b.resources), ...COMMON_RESOURCES, ...SOLAR_PLANETS.flatMap((p) => p.resources)])];

// Every tradeable item name, grouped for shop themes.
export const GROUPS = {
  resources: RESOURCES,
  flora: FLORA_MATERIALS,
  fauna: FAUNA_MATERIALS,
  pickups: [...new Set(PICKUP_ALL.flat())],
  events: EVENT_MATERIALS,
  relics: ['Logam Penjaga', 'Artefak Kuno', 'Kristal Alien', 'Trofi Langka'],
};
export const ITEM_NAMES = [...new Set(Object.values(GROUPS).flat())];

const cache = new Map();

function computeBase(name) {
  if (FIXED[name]) return FIXED[name];
  if (CHEAP.includes(name)) return 4;
  if (RESOURCES.includes(name)) return 9;
  if (FLORA_MATERIALS.includes(name)) return 10;
  if (FAUNA_MATERIALS.includes(name)) return 12;
  if (PICKUP_ALL.some((p) => p[0] === name)) return 8;
  if (GROUPS.pickups.includes(name)) return 18;
  if (EVENT_MATERIALS.includes(name)) return 50;
  return 6; // unknown / crafted items still have a small value
}

// Base price of one unit in Nanit (0 for Nanit itself).
export function basePrice(name) {
  if (name === CURRENCY) return 0;
  if (!cache.has(name)) cache.set(name, computeBase(name));
  return cache.get(name);
}

// Rarity label for the UI: 'Umum' | 'Menengah' | 'Langka' | 'Legendaris'.
export function rarityOf(name) {
  const p = basePrice(name);
  return p >= 80 ? 'Legendaris' : p >= 25 ? 'Langka' : p >= 9 ? 'Menengah' : 'Umum';
}
