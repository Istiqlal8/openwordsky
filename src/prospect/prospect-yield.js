// What a planet yields, worked out from its seed alone — no world loaded, no species generated.
//
// Only the sources that are honestly predictable are covered: the minerals its rocks and plants
// give up (planet.resources), the things lying on its ground (pickupsOf) and the three items
// unique to it (endemicOf). Flora and fauna materials are left out on purpose — they depend on
// which species rolled, and that costs a full makeSpecies() for every planet in the sweep.
import { BIOMES, COMMON_RESOURCES } from '../gen/biomes.js';
import { GAS_RES } from '../gen/planet.js';
import { PICKUPS, pickupsOf } from '../quest/materials.js';
import { endemicOf, SOURCE_LABEL } from '../quest/endemic.js';

const MINE = 'Tambang batu atau panen tumbuhan';
const ATMO = 'Panen dari atmosfer raksasa gas';
const GROUND = 'Tergeletak di tanah';

const uniq = (list) => [...new Set(list)].sort((a, b) => a.localeCompare(b, 'id'));

// Everything worth searching for, grouped for the browser. Endemic names are deliberately absent:
// they are unique per planet, so nobody can look one up before they have seen it.
export const SEARCH_GROUPS = [
  { id: 'mineral', label: 'Mineral', names: uniq([...BIOMES.flatMap((b) => b.resources), ...COMMON_RESOURCES]) },
  { id: 'gas', label: 'Gas', names: uniq(GAS_RES) },
  { id: 'ground', label: 'Benda di tanah', names: uniq(Object.values(PICKUPS).flat()) },
];

export const SEARCHABLE = uniq(SEARCH_GROUPS.flatMap((g) => g.names));

// How this planet hands `item` over, or null when it does not have it at all.
export function sourceOn(planet, item) {
  if (!planet) return null;
  if (planet.resources?.includes(item)) return planet.gas ? ATMO : MINE;
  if (planet.gas) return null;                       // nothing to land on, nothing to pick up
  if (pickupsOf(planet).includes(item)) return GROUND;
  const e = endemicOf(planet).find((x) => x.name === item);
  return e ? `Khas planet ini · ${SOURCE_LABEL[e.source]}` : null;
}

// Everything this planet can give -> [{ name, how }], for a "what is here" listing.
export function yieldsOf(planet) {
  if (!planet) return [];
  const rows = (planet.resources ?? []).map((name) => ({ name, how: planet.gas ? ATMO : MINE }));
  if (!planet.gas) {
    for (const name of pickupsOf(planet)) rows.push({ name, how: GROUND });
    for (const e of endemicOf(planet)) rows.push({ name: e.name, how: `Khas · ${SOURCE_LABEL[e.source]}` });
  }
  return [...new Map(rows.map((r) => [r.name, r])).values()];
}
