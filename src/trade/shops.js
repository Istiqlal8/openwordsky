// Shop generation: themed stock lists, quantities, markups and buy rates per shop and race.
// Shop object: { id, name, type, typeLabel, race, stock: [{ item, qty, price }], buyRates }.
import { Rng, hash32 } from '../core/rng.js';
import { itemInfo } from '../items/catalog.js';
import { GROUPS, ITEM_NAMES, basePrice } from './prices.js';

export const SHOP_TYPES = {
  sumber: { label: 'Sumber Daya', sign: 'SUMBER DAYA', color: '#6ad8ff', pool: () => GROUPS.resources },
  hayati: { label: 'Bahan Hayati', sign: 'BAHAN HAYATI', color: '#9cff6a', pool: () => [...GROUPS.flora, ...GROUPS.fauna] },
  langka: { label: 'Langka', sign: 'BARANG LANGKA', color: '#d49bff',
    pool: () => [...GROUPS.relics, ...GROUPS.events, ...GROUPS.pickups.filter((n) => basePrice(n) >= 18 && !itemInfo(n).actions.length)] },
  perlengkapan: { label: 'Perlengkapan', sign: 'PERLENGKAPAN', color: '#ffb347',
    pool: () => ITEM_NAMES.filter((n) => itemInfo(n).actions.length > 0) },
  senjata: { label: 'Senjata', sign: 'SENJATA', color: '#ff5a5a', pool: () => [] },
};

const BASE_RATE = 0.5, THEME_RATE = 0.7, WANT_RATE = 1.1;

// Units in stock: plenty of cheap goods, a handful of rare ones.
function qtyFor(rng, price, scale) {
  const n = price <= 5 ? 25 + rng.int(40) : price <= 12 ? 10 + rng.int(20) : price <= 30 ? 3 + rng.int(8) : 1 + rng.int(3);
  return Math.max(1, Math.round(n * scale));
}

// What the shop pays per item, as a multiplier of the base price.
function makeRates(race, pool) {
  const rates = { default: BASE_RATE };
  for (const n of pool) rates[n] = THEME_RATE;
  for (const n of race.wants) rates[n] = WANT_RATE;
  return rates;
}

// seed: deterministic shop seed; opts.size: stock size multiplier (outpost vendors are smaller).
export function makeShop({ seed, type, race, name, size = 1 }) {
  const rng = new Rng(hash32(seed, 0x5409));
  const def = SHOP_TYPES[type], pool = def.pool();
  const markup = rng.range(1.35, 1.7) * (race.id === 'saurak' || race.id === 'nexar' ? 1.08 : 1);
  const picked = rng.take(pool, Math.max(3, Math.round((8 + rng.int(6)) * size)));
  const stock = picked.map((item) => {
    const price = Math.max(1, Math.ceil(basePrice(item) * markup));
    return { item, price, qty: qtyFor(rng, basePrice(item), size) };
  }).sort((a, b) => a.price - b.price);
  return { id: `shop-${seed}`, name, type, typeLabel: def.label, race, stock, buyRates: makeRates(race, pool) };
}

// Nanit the shop pays for one unit.
export function sellPriceOf(shop, item) {
  const rate = shop.buyRates[item] ?? shop.buyRates.default;
  return Math.max(1, Math.floor(basePrice(item) * rate));
}

export const isWanted = (shop, item) => shop.race.wants.includes(item);

// Small mixed stock for a lone outpost vendor: the race's goods plus a few supplies.
export function vendorShop(seed, race, vendorName) {
  const types = ['sumber', 'hayati', 'perlengkapan', 'langka'];
  const type = types[hash32(seed, 7) % types.length];
  return makeShop({ seed, type, race, name: `Kios ${vendorName}`, size: 0.5 });
}
