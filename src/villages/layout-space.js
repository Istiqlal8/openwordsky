// Science and off-world layouts: hilltop research station, colonist settlement, small mining outpost.
import { faceCenter } from '../base/site.js';
import { buildDome, buildMast, solarRow, buildHabitat, buildGreenhouse, buildLandingPad, buildModule, buildRig } from './outposts.js';
import { newLayout, addDoor, pathTo, entranceBoard, lampRing, doorLocal } from './layout-common.js';

const PAVE = 0xb8b8b0, GRAVEL = 0x9a948a;
const LAB_TEXT = ['Layar-layar menampilkan grafik cuaca dan peta bintang.', 'Para peneliti sibuk menganalisis sampel batuan.',
  'Mesin kopi berbunyi. "Selamat datang di lab, jangan sentuh apa pun, ya!"'];

// Mast with a rotating dish at a local point; returns the beacon point.
function dishMast(b, out, lx, lz, H) {
  const g = b.onGround(lx, lz);
  buildMast(b.kit, H);
  b.colliders.push({ x: g.x, z: g.z, r: 1.6 });
  b.zone(lx, lz, 3);
  out.movers.push({ kind: 'dish', at: { x: g.x, y: g.y + H - 3, z: g.z, yaw: b.frame.yaw } });
  return { x: g.x, y: g.y + H + 1, z: g.z };
}

function dome(b, rng, out, lx, lz, r, hex, sign) {
  const face = faceCenter(lx, lz), p = b.place(lx, lz, face, r + 0.4, { x: 0, z: r + 1.6 });
  buildDome(b.kit, r, hex, p.depth, p.drop, sign);
  addDoor(out, p.door, sign ? 'Lab Riset' : 'Kubah Hunian', rng.pick(LAB_TEXT));
  pathTo(b, out.hubR, doorLocal(lx, lz, face, r + 1.6), PAVE);
}

export function layoutResearch(b, rng, signKey) {
  const out = newLayout(b, 5);
  b.disc(0, 0, 5, PAVE, 0.12);
  dome(b, rng, out, -10, 3, 5, 0xf4f4f0, 'lab');
  dome(b, rng, out, 9, -4, 4, 0xe0e8f0, null);
  dome(b, rng, out, 3, 12, 3.5, 0xf0e8d8, null);
  out.beacon = dishMast(b, out, -3, -13, 16);
  b.onGround(13, 9, 0.4);
  solarRow(b.kit, 3);
  b.zone(13, 9, 5);
  out.work.push(b.world(-3, -9), b.world(12, 6), b.world(6, 0));
  lampRing(b, 4, 7, Math.PI / 4);
  entranceBoard(b, signKey, -2, 20);
  return out;
}

const HAB_TEXT = ['Ruang tamu hangat dengan tanaman dalam pot. "Anggap rumah sendiri!"',
  'Rak-rak berisi suku cadang dan tabung oksigen.', 'Anak-anak koloni belajar di layar holografik.'];

export function layoutColony(b, rng, signKey) {
  const out = newLayout(b, 5);
  b.disc(0, 0, 5, GRAVEL, 0.12);
  const pad = b.place(0, -17, 0, 7, { x: 0, z: 7 });
  buildLandingPad(b.kit, 7, pad.depth);
  b.colliders.pop(); // the pad is walkable
  const n = 2 + rng.int(3), hues = [0xe9e6de, 0xd8e4ec, 0xf0e0c0, 0xe0ecd8];
  for (let i = 0; i < n; i++) habitat(b, rng, out, -1.3 + (i / Math.max(1, n - 1)) * 2.6, hues[i % 4]);
  const houses = 1 + rng.int(2);
  for (let i = 0; i < houses; i++) greenhouse(b, out, i ? -19 : 19, -9);
  out.beacon = dishMast(b, out, -12, -21, 14);
  lampRing(b, 5, 8, 0.3);
  entranceBoard(b, signKey, 9, 23, 0.3);
  return out;
}

function habitat(b, rng, out, a, hex) {
  const lx = Math.sin(a) * 15, lz = Math.cos(a) * 15, face = faceCenter(lx, lz);
  const p = b.place(lx, lz, face, 4.4, { x: 0, z: 3.8 });
  buildHabitat(b.kit, hex, p.depth, p.drop, 'habitat');
  addDoor(out, p.door, 'Habitat Koloni', rng.pick(HAB_TEXT));
  pathTo(b, out.hubR, doorLocal(lx, lz, face, 3.8), GRAVEL);
}

function greenhouse(b, out, lx, lz) {
  const p = b.place(lx, lz, Math.PI / 2, 4.8);
  buildGreenhouse(b.kit, p.depth);
  out.work.push(b.offset(p, 0, 3.4), b.offset(p, 2, -3.4));
}

export function layoutMining(b, rng, signKey) {
  const out = newLayout(b, 4);
  b.disc(0, 0, 4, GRAVEL, 0.12);
  const n = 2 + rng.int(2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.6, lx = Math.sin(a) * 9, lz = Math.cos(a) * 9, face = faceCenter(lx, lz);
    const p = b.place(lx, lz, face, 3.5, { x: 1.4, z: 2.8 });
    buildModule(b.kit, rng.pick([0xd0a040, 0x8a9aa8, 0xc05a3a]), p.depth, p.drop, i ? null : 'tambang');
    addDoor(out, p.door, 'Modul Tambang', 'Helm dan beliung tergantung di dinding. Radio memutar lagu dangdut.');
  }
  const g = b.onGround(0, -13), top = buildRig(b.kit);
  b.colliders.push({ x: g.x, z: g.z, r: 2 });
  b.zone(0, -13, 5);
  out.movers.push({ kind: 'drill', at: { x: g.x, y: g.y + top, z: g.z } });
  out.work.push(b.world(3, -10), b.world(-3, -11));
  out.beacon = { x: g.x, y: g.y + top + 2, z: g.z };
  lampRing(b, 3, 5, 0.5);
  entranceBoard(b, signKey, 0, 15);
  return out;
}
