// Planet crises for distress calls. Each stage is one objective; stages run in order.
//   act      count player 'act' events of `act` type; where: any | system (target system, in space) | planet
//   land     land on the target planet
//   beacons  reach `n` beacon pillars near the landing spot (RescueBeacons world addon)
//   deliver  carry `n` of `items` (combined) while standing on the target planet
import { pickDestination, isDangerous } from './nearby.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const WATER = ['Es Air', 'Es Murni'];

export const CRISES = [
  { id: 'toxic', title: 'Wabah Toksik', text: 'Koloni terserang wabah. Mereka butuh tumbuhan penawar.',
    stages: (d) => [
      { type: 'act', act: 'harvest', n: 8, where: 'any', label: 'Panen tumbuhan penawar' },
      { type: 'land', n: 1, label: `Antar penawar ke ${d.name}` },
      { type: 'beacons', n: 2, label: 'Sebarkan penawar di titik wabah' }] },
  { id: 'pirates', title: 'Serangan Bajak Laut', text: 'Bajak laut mengepung sistem koloni.', filter: isDangerous,
    stages: (d) => [
      { type: 'act', act: 'pirate', n: 4, where: 'system', label: `Hancurkan bajak laut di ${d.systemName}` },
      { type: 'land', n: 1, label: `Laporkan ke koloni ${d.name}` }] },
  { id: 'sentinels', title: 'Penjaga Mengamuk', text: 'Drone penjaga menyerang pemukiman.',
    stages: (d) => [
      { type: 'land', n: 1, label: `Mendarat di ${d.name}` },
      { type: 'act', act: 'sentinel', n: 3, where: 'planet', label: 'Hancurkan drone penjaga' },
      { type: 'beacons', n: 2, label: 'Nyalakan ulang menara pelindung' }] },
  { id: 'stranded', title: 'Koloni Terdampar', text: 'Penyintas tersebar setelah kapal mereka jatuh.',
    stages: (d) => [
      { type: 'land', n: 1, label: `Mendarat di ${d.name}` },
      { type: 'beacons', n: 3, label: 'Temukan suar penyintas' }] },
  { id: 'drought', title: 'Kekeringan', text: 'Sumur koloni kering. Bawa es atau air.',
    stages: (d) => [
      { type: 'deliver', items: WATER, n: 10, label: `Antar Es Air/Es Murni ke ${d.name}` },
      { type: 'beacons', n: 2, label: 'Isi tangki air koloni' }] },
];

const BONUS = ['Emas', 'Kobalt', 'Platinum', 'Indium', 'Tritium'];

// -> rescue mission object or null when no destination fits.
export function makeRescue(seed, systemIndex) {
  const crisis = pick(CRISES);
  const dest = pickDestination(seed, systemIndex, { min: 1, max: 4, filter: crisis.filter ?? null });
  if (!dest) return null;
  const stages = crisis.stages(dest).map((st) => ({ ...st, progress: 0 }));
  const time = 900 + 180 * dest.jumps;
  const nanit = 450 + 150 * dest.jumps + 120 * stages.length;
  return {
    id: `r${Date.now().toString(36)}`, crisis: crisis.id, title: `${crisis.title}: ${dest.name}`,
    text: crisis.text, dest, stages, stage: 0, time, left: time, beacons: null,
    reward: { nanit, items: [[pick(BONUS), 8 + Math.floor(Math.random() * 8)]], xp: 120 + 20 * dest.jumps },
  };
}
