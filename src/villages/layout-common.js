// Shared layout helpers: rings of houses facing the square, door paths, entrance boards.
import { faceCenter } from '../base/site.js';
import { houseStyle, buildHouse, flowerBed } from './houses.js';
import { nameBoard } from './signs.js';
import { personName } from './names.js';

const LOCKED = ['Pintunya terkunci. Terdengar suara radio dari dalam.', 'Tercium aroma nasi goreng dari dapur.',
  'Tidak ada yang menjawab. Mungkin penghuninya sedang ke sawah.', 'Seekor kucing tidur di depan pintu.',
  'Terdengar anak-anak tertawa di dalam.'];

// Fresh layout record shared by every settlement type.
export function newLayout(b, hubR = 6) {
  return { hub: b.world(0, 0), hubR, spots: [], doors: [], chimneys: [], movers: [], beacon: null,
    work: [], seats: [], fish: [], vendors: [] };
}

// Local door position of a model at (lx, lz) rotated by face, door at model-local z = dz.
export const doorLocal = (lx, lz, face, dz) => ({ x: lx + Math.sin(face) * dz, z: lz + Math.cos(face) * dz });

export function addDoor(out, p, title, text) {
  out.spots.push(p);
  out.doors.push({ x: p.x, z: p.z, title, text });
}

// One family house at a local point facing `face`; path from the square edge to its door.
export function placeHouse(b, rng, out, lx, lz, face, big = false) {
  const s = houseStyle(rng, big), dz = s.d / 2 + (s.porch ? 2.2 : 1.2), r = Math.max(s.w, s.d) / 2 + 0.6;
  const p = b.place(lx, lz, face, r, { x: 0, z: dz });
  const h = buildHouse(b.kit, s, p.depth, p.drop);
  flowerBed(b.kit, (s.w / 2 + 1.4) * (rng.chance(0.5) ? 1 : -1), s.d / 2 - 0.4);
  if (h.chimney) {
    const c = b.offset(p, h.chimney.x, h.chimney.z);
    out.chimneys.push({ x: c.x, y: p.floor + h.chimney.y, z: c.z });
  }
  const owner = personName(rng, false).name;
  addDoor(out, p.door, `Rumah ${owner}`, rng.pick(LOCKED));
  if (rng.chance(0.7)) b.tree(lx - Math.sin(face) * (r + 2.5) + rng.range(-2, 2), lz - Math.cos(face) * (r + 2.5), rng);
  return doorLocal(lx, lz, face, dz);
}

// n houses on a ring of radius R between local angles a0..a1 (angle 0 = +Z), all facing the square.
export function houseRing(b, rng, out, n, R, a0, a1, pathHex) {
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / n + rng.range(-0.08, 0.08), rr = R + rng.range(-1.5, 2);
    const lx = Math.sin(a) * rr, lz = Math.cos(a) * rr;
    const d = placeHouse(b, rng, out, lx, lz, faceCenter(lx, lz), rng.chance(0.2));
    pathTo(b, out.hubR, d, pathHex);
  }
}

// Path strip from the square's edge straight to a local door point.
export function pathTo(b, hubR, d, hex, width = 1.8) {
  const len = Math.hypot(d.x, d.z);
  if (len <= hubR) return;
  b.strip((d.x / len) * (hubR - 0.5), (d.z / len) * (hubR - 0.5), d.x, d.z, width, hex, 0.09);
}

// Name board on the ground at a local point (double-sided).
export function entranceBoard(b, key, lx, lz, face = 0) {
  b.onGround(lx, lz, face);
  nameBoard(b.kit, key);
  b.zone(lx, lz, 3);
}

// Lamps evenly on a ring around the square.
export function lampRing(b, n, R, a0 = 0) {
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2;
    b.lamp(Math.sin(a) * R, Math.cos(a) * R);
  }
}
