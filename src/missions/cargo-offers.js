// Delivery offers on a planet's cargo board: goods, live animals, plants, contraband.
import { endemicOf } from '../quest/endemic.js';
import { pickDestination, isDangerous } from './nearby.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const OFFERS = 4;

// kind -> base Nanit per jump, hold slots, time rule. `limit`/`wilt` are game seconds.
export const KINDS = {
  goods: { label: 'Barang', pay: 45 },
  animal: { label: 'Hewan hidup', pay: 95 },
  plant: { label: 'Tumbuhan', pay: 75 },
  contraband: { label: 'Kontraband', pay: 160 },
};

function goods(planet) {
  const local = [...planet.resources, ...endemicOf(planet).slice(0, 2).map((e) => e.name)];
  const item = pick(local), crates = 1 + Math.floor(Math.random() * 3);
  return { kind: 'goods', title: `${crates} peti ${item}`, cargo: item, size: 2 * crates, crates };
}

function animal(planet) {
  const sp = pick(planet.species?.fauna ?? []);
  if (!sp) return null;
  const big = (sp.genes?.size ?? 1) > 1.6;
  return { kind: 'animal', title: `${sp.name} hidup`, cargo: sp.name, size: big ? 8 : 4,
    needs: big ? 'hauler' : null, big };
}

function plant(planet) {
  const sp = pick(planet.species?.flora ?? []);
  if (!sp) return null;
  return { kind: 'plant', title: `Bibit ${sp.name}`, cargo: sp.name, size: 3 };
}

function contraband() {
  return { kind: 'contraband', title: 'Peti tanpa label', cargo: 'Kontraband', size: 2, needs: 'fighter' };
}

// Time rules scale with the trip length.
function timing(o, jumps) {
  if (o.kind === 'animal') return { limit: 180 + 120 * jumps };
  if (o.kind === 'plant') return { wilt: 240 + 150 * jumps };
  return {};
}

function finish(o, from, dest) {
  const bigBonus = o.big ? 1.4 : 1;
  const pay = Math.round(KINDS[o.kind].pay * dest.jumps * bigBonus + 5 * o.size);
  return { ...o, id: `k${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`,
    from: from.name, dest, pay, ...timing(o, dest.jumps) };
}

// Four offers for this planet; the board rerolls on every landing.
export function makeOffers(seed, planet, systemIndex) {
  const makers = [goods, animal, plant, goods, animal, plant, contraband];
  const out = [];
  for (let tries = 0; out.length < OFFERS && tries < 20; tries++) {
    const o = pick(makers)(planet);
    if (!o || out.some((x) => x.kind === o.kind && x.cargo === o.cargo)) continue;
    const filter = o.kind === 'contraband' ? isDangerous : null;
    const dest = pickDestination(seed, systemIndex, { filter });
    if (dest && dest.key !== planet.key) out.push(finish(o, planet, dest));
  }
  return out;
}
