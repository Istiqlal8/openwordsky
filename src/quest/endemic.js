// Items found only on one planet: a plant product, a mineral and a rare relic, named per planet.
import { rngOf } from '../core/rng.js';
import { word } from '../gen/names.js';

const BIO = {
  lush: ['Madu', 'Buah', 'Getah'], desert: ['Getah', 'Biji', 'Minyak'], frozen: ['Lumut', 'Embun', 'Biji'],
  toxic: ['Spora', 'Lendir', 'Jamur'], irradiated: ['Akar', 'Serbuk', 'Getah'], volcanic: ['Abu', 'Resin', 'Lumut'],
  barren: ['Lumut', 'Debu', 'Spora'], ocean: ['Alga', 'Mutiara', 'Garam'], exotic: ['Nektar', 'Serbuk', 'Buah'],
};
const MINERAL = ['Kristal', 'Bijih', 'Batu', 'Geode', 'Prisma', 'Inti'];
const RELIC = ['Relik', 'Fosil', 'Kepingan', 'Arca', 'Artefak', 'Tulang'];

// -> [{ name, source, tier }] where source says how to get it.
export function endemicOf(planet) {
  if (planet.gas) return [];
  const rng = rngOf(planet.seed, 0xe11de);
  const bio = BIO[planet.biome.id] ?? BIO.barren;
  const tag = () => word(rng);
  const plantSource = planet.species?.flora?.length ? 'flora' : 'rock'; // barren worlds: from rocks
  return [
    { name: `${rng.pick(bio)} ${tag()}`, source: plantSource, tier: 1 },
    { name: `${rng.pick(MINERAL)} ${tag()}`, source: 'rock', tier: 1 },
    { name: `${rng.pick(RELIC)} ${tag()}`, source: 'pickup', tier: 3 },
  ];
}

export const ENDEMIC_CHANCE = { flora: 0.2, rock: 0.15 };
export const SOURCE_LABEL = { flora: 'panen tumbuhan', rock: 'tambang batu', pickup: 'benda langka' };
