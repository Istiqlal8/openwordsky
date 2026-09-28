// The showroom: one ready-made capital ship per archetype, hand-seeded so prices and looks are
// stable between sessions. FREIGHTER_PRICES is the price list keyed by catalog id.
import { ARCHETYPE_BASE, ARCHETYPE_LABELS, normalizeSpec, specStats } from './fleet-spec.js';

const SHIPS = [
  { id: 'garuda', archetype: 'classic', name: 'Garuda Niaga', hull: '#8a909c', accent: '#2f7fd0', glow: '#ffe0a8',
    engines: 2, towers: 1, cargo: 3, bridgeStyle: 'menara', size: 1,
    blurb: 'Pengangkut kontainer tua yang tak pernah rewel. Palka luas, harga bersahabat.' },
  { id: 'martil', archetype: 'hammerhead', name: 'Martil Selat', hull: '#a39a8a', accent: '#d0662f', glow: '#fff4d8',
    engines: 3, towers: 2, cargo: 2, bridgeStyle: 'datar', size: 1.05,
    blurb: 'Haluan lebar penuh sensor, hangar di ujung kanan. Favorit penambang cincin.' },
  { id: 'kembar', archetype: 'catamaran', name: 'Kembar Mahakam', hull: '#6f7f8c', accent: '#3aa87a', glow: '#a8e0ff',
    engines: 2, towers: 1, cargo: 2, bridgeStyle: 'kubah', size: 1,
    blurb: 'Dua lambung disatukan jembatan berjendela. Stabil, lapang, tenang.' },
  { id: 'cincin', archetype: 'ring', name: 'Cincin Kartika', hull: '#b4b8be', accent: '#2fb8c0', glow: '#b8ffc8',
    engines: 1, towers: 2, cargo: 1, bridgeStyle: 'kubah', size: 1.1,
    blurb: 'Cincin habitat berputar dengan gravitasi sendiri. Kabin paling nyaman di galaksi.' },
  { id: 'benteng', archetype: 'citadel', name: 'Benteng Majapahit', hull: '#7d8a78', accent: '#c9b23a', glow: '#ffe0a8',
    engines: 2, towers: 3, cargo: 4, bridgeStyle: 'menara', size: 1,
    blurb: 'Menara bertingkat berdiri di atas pendorong bawah. Gudang dalam, meriam banyak.' },
  { id: 'cakram', archetype: 'saucer', name: 'Cakram Sriwijaya', hull: '#b4b8be', accent: '#8a5ad0', glow: '#a8e0ff',
    engines: 3, towers: 1, cargo: 2, bridgeStyle: 'kubah', size: 1.15,
    blurb: 'Piring lebar dengan delapan teluk pesawat. Kapal bendera untuk armada kecil.' },
  { id: 'paus', archetype: 'whale', name: 'Paus Cendrawasih', hull: '#4f7f7a', accent: '#3aa87a', glow: '#7affd8',
    engines: 2, towers: 0, cargo: 3, bridgeStyle: 'datar', size: 1.2,
    blurb: 'Lambung hidup yang ditumbuhkan, bukan dilas. Dinding berdenyut, lorong hangat.' },
  { id: 'penjelajah', archetype: 'cruiser', name: 'Penjelajah Bima', hull: '#6a6470', accent: '#c03a4a', glow: '#ffe0a8',
    engines: 4, towers: 2, cargo: 1, bridgeStyle: 'menara', size: 1.05,
    blurb: 'Kapal perang yang dialihfungsikan. Cepat, bersirip, penuh menara meriam.' },
];

// { id, name, label, blurb, price, spec, stats } for every showroom hull.
export const FREIGHTER_CATALOG = SHIPS.map(({ id, blurb, ...raw }) => {
  const spec = normalizeSpec(raw);
  return {
    id, blurb, spec, name: spec.name, label: ARCHETYPE_LABELS[spec.archetype],
    price: ARCHETYPE_BASE[spec.archetype].price, stats: specStats(spec),
  };
});

// Price list in Nanit, keyed by catalog id (20.000 – 120.000).
export const FREIGHTER_PRICES = Object.fromEntries(FREIGHTER_CATALOG.map((s) => [s.id, s.price]));

export function catalogById(id) {
  return FREIGHTER_CATALOG.find((s) => s.id === id) ?? FREIGHTER_CATALOG[0];
}
