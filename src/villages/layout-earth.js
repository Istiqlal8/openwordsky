// Earth village and town layouts (settlement-local coords, entrance toward +Z).
import * as THREE from 'three';
import { faceCenter } from '../base/site.js';
import { buildBarn, buildShop } from './houses.js';
import { buildField, hayBales, buildWindmill, buildTurbine } from './farm.js';
import { buildFountain, buildClockTower, buildBench, buildStall, shadeTree } from './town.js';
import { newLayout, houseRing, addDoor, pathTo, entranceBoard, lampRing, doorLocal, placeHouse } from './layout-common.js';

const DIRT = 0xb8a47a, PAVE = 0xcfc8b8, TILE = 0xa89f8c;

// Village square with the big shade tree and benches under it.
function villageSquare(b, rng, out, r) {
  b.disc(0, 0, r, DIRT, 0.1);
  out.seats.push(...shadeTree(b, 0, 0, rng));
  lampRing(b, 4, r + 1.5, Math.PI / 4);
}

// Farming village: houses around the square, barn, fields on local -Z, windmill or turbines.
export function layoutFarm(b, rng, signKey) {
  const out = newLayout(b, 7);
  villageSquare(b, rng, out, 7);
  houseRing(b, rng, out, 5 + rng.int(3), 19, -2.1, 2.1, DIRT);
  barnYard(b, rng, out);
  for (let i = 0; i < 3; i++) out.work.push(...buildField(b, rng, (i - 1) * 21, -45 + rng.range(-2, 2), 15, 20));
  energy(b, rng, out);
  entranceBoard(b, signKey, 0, 30);
  b.strip(0, 7, 0, 29, 2.2, DIRT);
  b.strip(0, -7, 0, -33, 2.2, DIRT);
  return out;
}

function barnYard(b, rng, out) {
  const lx = -22, lz = -18, face = faceCenter(lx, lz);
  const p = b.place(lx, lz, face, 6.3, { x: 0, z: 5.4 });
  buildBarn(b.kit, p.depth, p.drop);
  addDoor(out, p.door, 'Lumbung Desa', 'Tumpukan gabah dan alat tani tersusun rapi. Baunya harum jerami.');
  pathTo(b, out.hubR, doorLocal(lx, lz, face, 5.4), DIRT);
  hayBales(b, -30, -28, rng);
  out.work.push(b.world(-27, -27));
}

// A classic windmill (beacon on its cap) or a pair of wind turbines.
function energy(b, rng, out) {
  if (rng.chance(0.5)) {
    const w = buildWindmill(b, 30, -16, faceCenter(30, -16) + Math.PI);
    out.movers.push({ kind: 'sails', at: w });
    out.beacon = w.beacon;
    return;
  }
  for (const [x, z] of [[36, -30], [36, -52]]) {
    const t = buildTurbine(b, x, z, 0.4);
    out.movers.push({ kind: 'rotor', at: t });
    out.beacon = t.beacon;
  }
}

// Small hamlet: houses around a square, gardens and one field.
export function layoutHamlet(b, rng, signKey) {
  const out = newLayout(b, 6);
  villageSquare(b, rng, out, 6);
  houseRing(b, rng, out, 4 + rng.int(3), 15, -2.4, 2.4, DIRT);
  out.work.push(...buildField(b, rng, 0, -30, 14, 12));
  entranceBoard(b, signKey, 0, 25);
  b.strip(0, 6, 0, 24, 2, DIRT);
  const top = b.groundAt(0, 0);
  out.beacon = { ...b.world(0, 0), y: top + 10 };
  return out;
}

const SHOPS = ['toko', 'warung', 'kopi', 'balai', 'pasar'];

// Small town: paved plaza with a fountain, shops and houses on a ring, clock tower, market stalls.
export function layoutTown(b, rng, signKey) {
  const out = newLayout(b, 11);
  b.disc(0, 0, 11, PAVE, 0.12);
  b.drape('ground', ringGeo(11, 12), TILE, 0.13);
  buildFountain(b, 0, 0);
  lampRing(b, 8, 12.5, Math.PI / 8);
  benches(b, out);
  townRing(b, rng, out);
  for (const a of [0.95, 1.35, 1.75]) out.vendors.push(stallAt(b, rng, a));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; b.tree(Math.sin(a) * 33, Math.cos(a) * 33, rng); }
  entranceBoard(b, signKey, 0, 36);
  b.strip(0, 11, 0, 35, 3, TILE);
  return out;
}

function ringGeo(r0, r1) {
  return new THREE.RingGeometry(r0, r1, 32, 1).rotateX(-Math.PI / 2);
}

function benches(b, out) {
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4, lx = Math.sin(a) * 7, lz = Math.cos(a) * 7;
    out.seats.push(buildBench(b, lx, lz, faceCenter(lx, lz) + Math.PI));
  }
}

const SHOP_TITLE = { toko: 'Toko Kelontong', warung: 'Warung Makan', kopi: 'Kedai Kopi', balai: 'Balai Desa', pasar: 'Pasar' };
const SHOP_TEXT = {
  toko: 'Rak penuh sabun, beras dan senter. "Mau beli apa, Kak?"', warung: 'Bau sate dan soto memenuhi ruangan. Semua kursi terisi.',
  kopi: 'Pengunjung ramai membahas bintang jatuh semalam.', balai: 'Papan pengumuman: "Kerja bakti hari Minggu. Semua warga wajib hadir!"',
  pasar: 'Pedagang menawarkan buah segar dan ikan asin.',
};

// Eight slots around the plaza (the +Z slot stays open for the entrance street).
function townRing(b, rng, out) {
  for (let i = 1; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, lx = Math.sin(a) * 23, lz = Math.cos(a) * 23, face = faceCenter(lx, lz);
    if (i === 5) { out.beacon = buildClockTower(b, lx, lz, face); continue; }
    if (i % 2 === 0) { pathTo(b, 11, placeHouse(b, rng, out, lx, lz, face, true), TILE, 2.4); continue; }
    const key = SHOPS[(i >> 1) % SHOPS.length], p = b.place(lx, lz, face, 5, { x: 0, z: 4.3 });
    buildShop(b.kit, rng, key, p.depth, p.drop);
    addDoor(out, p.door, SHOP_TITLE[key], SHOP_TEXT[key]);
    pathTo(b, 11, doorLocal(lx, lz, face, 4.3), TILE, 2.4);
  }
}

// Market stall between the plaza and the ring, vendor behind the counter.
function stallAt(b, rng, a) {
  const lx = Math.sin(a) * 15.5, lz = Math.cos(a) * 15.5, face = faceCenter(lx, lz);
  const v = buildStall(b, rng, lx, lz, face);
  return { ...v, yaw: b.frame.yaw + face + Math.PI };
}
