// Where a piece goes. Pieces snap to the pieces already built — foundation edges, wall tops,
// cell corners and floor levels — and fall back to a loose grid when nothing is near.
import { GRID, WALL_H, BASE_RADIUS, pieceOf } from './pieces.js';

const HALF = GRID / 2 + 0.05;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // rotation 0..3 = the cell side it sits on
const SNAP_R = GRID * 1.1; // how far the aim point may be from a snap spot
const snap = (v, step, off = 0) => Math.round((v - off) / step) * step + off;

const kindOf = (p) => pieceOf(p.type)?.kind;
const floors = (pieces) => pieces.filter((p) => kindOf(p) === 'floor' || kindOf(p) === 'roof');

// Top of the floor piece covering (x, z), or -Infinity.
export function foundationTop(pieces, x, z) {
  let top = -Infinity;
  for (const p of pieces) {
    if (kindOf(p) !== 'floor') continue;
    if (Math.abs(x - p.x) <= HALF && Math.abs(z - p.z) <= HALF) top = Math.max(top, p.y);
  }
  return top;
}

// Snap spots offered by what is already built, per piece kind.
function spotsFor(kind, pieces) {
  const out = [];
  if (kind === 'floor') {
    for (const p of floors(pieces)) for (const [dx, dz] of DIRS) out.push({ x: p.x + dx * GRID, y: p.y, z: p.z + dz * GRID, rot: 0, from: p });
    for (const p of pieces) if (kindOf(p) === 'roof') out.push({ x: p.x, y: p.y, z: p.z, rot: 0, from: p });
  } else if (kind === 'edge') {
    for (const p of floors(pieces)) {
      DIRS.forEach(([dx, dz], r) => out.push({ x: p.x + dx * GRID / 2, y: p.y, z: p.z + dz * GRID / 2, rot: r, from: p }));
    }
    for (const p of pieces) if (kindOf(p) === 'edge') out.push({ x: p.x, y: p.y + WALL_H, z: p.z, rot: p.rot, from: p });
  } else if (kind === 'corner') {
    for (const p of floors(pieces)) {
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) out.push({ x: p.x + dx * GRID / 2, y: p.y, z: p.z + dz * GRID / 2, rot: 0, from: p });
    }
  } else if (kind === 'roof') {
    for (const p of pieces) if (kindOf(p) === 'floor') out.push({ x: p.x, y: p.y + WALL_H, z: p.z, rot: 0, from: p });
    for (const p of pieces) if (kindOf(p) === 'edge') out.push({ x: p.x, y: p.y + WALL_H, z: p.z, rot: p.rot, from: p, lean: true });
  }
  return out;
}

function nearest(spots, x, z) {
  let best = null, bestD = SNAP_R;
  for (const s of spots) {
    const d = Math.hypot(s.x - x, s.z - z);
    if (d < bestD) { best = s; bestD = d; }
  }
  return best;
}

// A roof spot taken from a wall belongs to the cell behind that wall.
function leanIn(spot) {
  const [dx, dz] = DIRS[spot.rot];
  return { ...spot, x: spot.x - dx * GRID / 2, z: spot.z - dz * GRID / 2 };
}

// -> { x, y, z, rot, ok, why, anchor } for the ghost. base = null while placing the beacon.
export function planPiece(type, userRot, aimX, aimZ, base, ground) {
  const piece = pieceOf(type), pieces = base?.pieces ?? [];
  const origin = pieces[0];
  const spot = snapped(piece, userRot, aimX, aimZ, pieces, ground);
  if (origin && Math.hypot(spot.x - origin.x, spot.z - origin.z) > BASE_RADIUS) return fail(spot, 'Terlalu jauh dari suar markas');
  if (piece.kind === 'roof' && !spot.anchor) return fail(spot, 'Atap butuh dinding atau fondasi di bawah');
  if (piece.kind === 'floor' && !spot.anchor && steep(spot.x, spot.z, ground)) return fail(spot, 'Tanah terlalu miring');
  if (occupied(pieces, piece, spot)) return fail(spot, 'Sudah ada bagian di sini');
  return spot;
}

function snapped(piece, userRot, x, z, pieces, ground) {
  let hit = nearest(spotsFor(piece.kind, pieces), x, z);
  if (hit?.lean) hit = leanIn(hit);
  if (hit) {
    const rot = piece.kind === 'edge' ? (hit.rot + (userRot % 2) * 2) % 4 : userRot;
    return { x: hit.x, y: hit.y, z: hit.z, rot, ok: true, why: '', anchor: hit.from };
  }
  const step = piece.kind === 'stand' ? 0.5 : GRID;
  const sx = snap(x, step), sz = snap(z, step);
  const floor = Math.max(ground(sx, sz), foundationTop(pieces, sx, sz));
  return { x: sx, y: floor + (piece.kind === 'floor' ? 0.2 : 0), z: sz, rot: userRot, ok: true, why: '', anchor: null };
}

function occupied(pieces, piece, spot) {
  return pieces.some((p) => {
    const same = p.type === piece.id || (kindOf(p) === piece.kind && piece.kind !== 'stand');
    return same && Math.hypot(p.x - spot.x, p.z - spot.z) < 0.45 && Math.abs(p.y - spot.y) < 0.6;
  });
}

function fail(spot, why) {
  spot.ok = false;
  spot.why = why;
  return spot;
}

function steep(x, z, ground) {
  const hs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => ground(x + a * GRID / 2, z + b * GRID / 2));
  return Math.max(...hs) - Math.min(...hs) > 2.8;
}

// Index of the piece closest to (x, z) within reach (the beacon last, so it goes only when alone).
export function pieceNear(pieces, x, z, reach = 2.6) {
  let best = -1, bestD = reach;
  for (let i = 1; i < pieces.length; i++) {
    const d = Math.hypot(pieces[i].x - x, pieces[i].z - z);
    if (d < bestD) { best = i; bestD = d; }
  }
  if (best < 0 && pieces.length === 1 && Math.hypot(pieces[0].x - x, pieces[0].z - z) < reach) return 0;
  return best;
}
