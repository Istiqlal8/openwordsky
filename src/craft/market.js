// Trade market prices. Endemic items remember where they were found (state.origin) and sell
// for double outside their home star system.
import { BIOMES } from '../gen/biomes.js';
import { PICKUPS, FLORA_MATERIALS, FAUNA_MATERIALS } from '../quest/materials.js';
import { endemicOf } from '../quest/endemic.js';
import { fishPrice } from '../fishing/fish-species.js';

const CHEAP = new Set(['Ferit', 'Karbon', 'Oksigen', 'Natrium', 'Silika', 'Es Air', 'Garam', 'Ammonia', 'Belerang', 'Pirit', 'Dioksit']);
const PRECIOUS = new Set(['Emas', 'Platinum', 'Uranium', 'Indium', 'Tritium', 'Kristal Anomali']);
const RESOURCES = new Set(BIOMES.flatMap((b) => b.resources));
const BIO = new Set([...FLORA_MATERIALS, ...FAUNA_MATERIALS]);
const PICKUP_COMMON = new Set(Object.values(PICKUPS).map((p) => p[0]));
const PICKUP_RARE = new Set(Object.values(PICKUPS).flatMap((p) => p.slice(1)));
const SPECIAL = { 'Artefak Kuno': 120, 'Kristal Alien': 60 };
const ENDEMIC = { 1: 25, 3: 90 };
const FALLBACK = 4;
export const HAUL_BONUS = 2;

// Basic resources the market sells, per unit, in packs.
export const BUY = [['Ferit', 5], ['Karbon', 5], ['Oksigen', 6], ['Natrium', 6], ['Silika', 6], ['Kobalt', 12], ['Emas', 20]];
export const PACK = 5;

function basePrice(name) {
  if (SPECIAL[name]) return SPECIAL[name];
  if (fishPrice(name)) return fishPrice(name);
  if (PICKUP_RARE.has(name) && !BIO.has(name)) return 12;
  if (BIO.has(name)) return 7;
  if (PICKUP_COMMON.has(name)) return 6;
  if (PRECIOUS.has(name)) return 9;
  if (CHEAP.has(name)) return 2;
  if (RESOURCES.has(name)) return 4;
  return FALLBACK;
}

// Records endemic items gained on their planet: origin[name] = { sys, tier, planet }.
export function recordOrigin(origin, name, planet) {
  if (!planet || origin[name]) return;
  const e = endemicOf(planet).find((x) => x.name === name);
  if (e) origin[name] = { sys: planet.systemIndex, tier: e.tier, planet: planet.name };
}

// -> { unit, bonus } where bonus is the extra per unit for hauling endemics elsewhere.
export function sellPrice(name, origin, sysIndex) {
  const o = origin[name];
  if (!o) return { unit: basePrice(name), bonus: 0 };
  const base = ENDEMIC[o.tier] ?? ENDEMIC[1];
  const bonus = o.sys !== sysIndex ? base * (HAUL_BONUS - 1) : 0;
  return { unit: base + bonus, bonus, from: o.planet };
}

// Sellable inventory rows, most valuable first.
export function sellRows(player, origin, sysIndex) {
  return Object.entries(player.inventory)
    .filter(([name, n]) => name !== 'Nanit' && n >= 1)
    .map(([name, n]) => ({ name, n: Math.floor(n), ...sellPrice(name, origin, sysIndex) }))
    .sort((a, b) => b.unit - a.unit || a.name.localeCompare(b.name, 'id'));
}
