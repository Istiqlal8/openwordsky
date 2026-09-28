// The catalogue of base pieces: name, category, cost, how it snaps and which shape it draws.
// Snap kinds: floor = a grid cell, edge = a cell side, corner = a cell corner,
// roof = a cell at wall height, stand = free-standing on the floor under it.
import { group, item } from '../craft/recipes.js';
import { FLORA_MATERIALS } from '../quest/materials.js';
import * as S from './shapes-struct.js';
import * as D from './shapes-decor.js';
import * as T from './shapes-station.js';

export { GRID, WALL_H } from './shapes-struct.js';
export const BASE_RADIUS = 64; // pieces must stay this close to the beacon

const [FERIT, KARBON, NANIT, KOBALT, PROTEIN] =
  ['Ferit', 'Karbon', 'Nanit', 'Kobalt', 'Protein Fauna'].map(item);
const BIO = group('Bahan Flora', FLORA_MATERIALS);
const CLOTH = group('Bulu/Kulit', ['Bulu Lembut', 'Kulit Fauna', 'Bulu Sayap', 'Kulit Ular', 'Sisik', 'Kitin']);
const GLASSY = group('Kaca/Kristal', ['Serpih Kristal', 'Kaca Vulkanik', 'Es Murni', 'Geode', 'Geode Beku', 'Kristal Anomali', 'Lensa Organik']);

export const CATEGORIES = [['struktur', 'Struktur'], ['dekor', 'Dekor'], ['stasiun', 'Stasiun']];

export const BEACON = { id: 'suar', name: 'Suar Markas', cat: 'stasiun', kind: 'stand',
  cost: [FERIT(20), KARBON(10), NANIT(50)], draw: T.beacon };

export const PIECES = [
  // Struktur
  { id: 'fondasi', name: 'Fondasi', cat: 'struktur', kind: 'floor', cost: [FERIT(8), KARBON(4)], draw: S.foundation },
  { id: 'dinding', name: 'Dinding', cat: 'struktur', kind: 'edge', solid: true, cost: [FERIT(6), KARBON(2)], draw: S.wall },
  { id: 'pintu', name: 'Pintu', cat: 'struktur', kind: 'edge', cost: [FERIT(8), KARBON(2)], draw: S.door },
  { id: 'gerbang-dalam', name: 'Ambang', cat: 'struktur', kind: 'edge', cost: [FERIT(5), KARBON(2)], draw: S.doorway },
  { id: 'jendela', name: 'Jendela', cat: 'struktur', kind: 'edge', solid: true, cost: [FERIT(6), GLASSY(2)], draw: S.windowWall },
  { id: 'jendela-celah', name: 'Jendela Celah', cat: 'struktur', kind: 'edge', solid: true, cost: [FERIT(6), GLASSY(3)], draw: S.windowSlit },
  { id: 'jendela-bulat', name: 'Jendela Bulat', cat: 'struktur', kind: 'edge', solid: true, cost: [FERIT(7), GLASSY(2)], draw: S.windowRound },
  { id: 'atap', name: 'Atap', cat: 'struktur', kind: 'roof', cost: [FERIT(6), KARBON(4)], draw: S.roof },
  { id: 'atap-miring', name: 'Atap Miring', cat: 'struktur', kind: 'roof', cost: [FERIT(8), KARBON(4)], draw: S.roofSlope },
  { id: 'tiang', name: 'Tiang', cat: 'struktur', kind: 'corner', cost: [FERIT(5)], draw: S.pillar },
  { id: 'tangga', name: 'Tangga', cat: 'struktur', kind: 'edge', cost: [FERIT(6)], draw: S.stairs },
  { id: 'landai', name: 'Landai', cat: 'struktur', kind: 'edge', cost: [FERIT(8), KARBON(2)], draw: S.ramp },
  { id: 'balkon', name: 'Balkon', cat: 'struktur', kind: 'edge', cost: [FERIT(6), KARBON(3)], draw: S.balcony },
  { id: 'pagar', name: 'Pagar', cat: 'struktur', kind: 'edge', solid: true, solidH: 1.3, cost: [KARBON(4)], draw: S.fence },
  { id: 'gerbang', name: 'Gerbang', cat: 'struktur', kind: 'edge', cost: [KARBON(5), FERIT(2)], draw: S.gate },
  // Dekor
  { id: 'lampu', name: 'Lampu Tiang', cat: 'dekor', kind: 'stand', cost: [FERIT(2), KARBON(2)], draw: D.lampPost },
  { id: 'lampu-dinding', name: 'Lampu Dinding', cat: 'dekor', kind: 'edge', cost: [FERIT(2), GLASSY(1)], draw: D.lampWall },
  { id: 'lampu-lantai', name: 'Lampu Lantai', cat: 'dekor', kind: 'stand', cost: [FERIT(2), KARBON(3)], draw: D.lampStrip },
  { id: 'panji', name: 'Panji', cat: 'dekor', kind: 'stand', cost: [CLOTH(2), KARBON(2)], draw: D.banner },
  { id: 'peti', name: 'Peti', cat: 'dekor', kind: 'stand', cost: [KARBON(4)], draw: D.crate },
  { id: 'rak', name: 'Rak', cat: 'dekor', kind: 'stand', cost: [KARBON(5), BIO(1)], draw: D.shelf },
  { id: 'ranjang', name: 'Ranjang', cat: 'dekor', kind: 'stand', cost: [FERIT(4), CLOTH(3)], draw: D.bed },
  { id: 'karpet', name: 'Karpet', cat: 'dekor', kind: 'stand', cost: [CLOTH(3)], draw: D.rug },
  { id: 'meja', name: 'Meja', cat: 'dekor', kind: 'stand', cost: [KARBON(4), BIO(1)], draw: D.table },
  { id: 'kursi', name: 'Kursi', cat: 'dekor', kind: 'stand', cost: [KARBON(3)], draw: D.chair },
  { id: 'papan', name: 'Papan Nama', cat: 'dekor', kind: 'stand', cost: [KARBON(3), FERIT(1)], draw: D.sign },
  // Stasiun (all manual: they only do something when you press T)
  { id: 'kebun', name: 'Kebun', cat: 'stasiun', kind: 'stand', act: true, cost: [KARBON(10), FERIT(4), BIO(2)], draw: D.planter },
  { id: 'kandang', name: 'Kandang', cat: 'stasiun', kind: 'floor', act: true, cost: [FERIT(12), KARBON(6), NANIT(20)], draw: D.pen },
  { id: 'bengkel', name: 'Bengkel', cat: 'stasiun', kind: 'stand', act: true, cost: [FERIT(15), KARBON(8), NANIT(40)], draw: T.workbench },
  { id: 'loker', name: 'Loker', cat: 'stasiun', kind: 'stand', act: true, cost: [FERIT(12), KARBON(4)], draw: T.locker },
  { id: 'antena', name: 'Antena', cat: 'stasiun', kind: 'stand', cost: [FERIT(10), KOBALT(4)], draw: T.antenna },
  { id: 'landasan', name: 'Landasan', cat: 'stasiun', kind: 'floor', act: true, cost: [FERIT(25), KARBON(10), NANIT(60)], draw: T.landingPad },
  { id: 'teleport', name: 'Pad Teleport', cat: 'stasiun', kind: 'stand', act: true, cost: [FERIT(20), KOBALT(10), NANIT(150)], draw: T.teleportPad },
];

const BY_ID = Object.fromEntries([BEACON, ...PIECES].map((p) => [p.id, p]));
export const pieceOf = (id) => BY_ID[id];
export const piecesIn = (cat) => PIECES.filter((p) => p.cat === cat);

export const PEN_BAIT = [PROTEIN(1)];        // lures an animal into a pen
export const TELEPORT_COST = [NANIT(40)];    // per jump between your own bases
