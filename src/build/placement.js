// Where a piece goes: grid snapping around the beacon, standing height on terrain or on a
// foundation, and whether the spot is allowed.
import { GRID, WALL_H, BASE_RADIUS, pieceOf } from './pieces.js';

const HALF = GRID / 2 + 0.05;
const snap = (v, step, off = 0) => Math.round((v - off) / step) * step + off;

// Top of the foundation under (x, z), or -Infinity.
export function foundationTop(pieces, x, z) {
  let top = -Infinity;
  for (const p of pieces) {
    if (p.type !== 'fondasi') continue;
    if (Math.abs(x - p.x) <= HALF && Math.abs(z - p.z) <= HALF) top = Math.max(top, p.y);
  }
  return top;
}

// Snapped x/z for a piece aimed at (x, z). Grid origin is the beacon.
function snapXZ(kind, rot, x, z, origin) {
  if (!origin || kind === 'free') return { x: snap(x, 0.5), z: snap(z, 0.5) };
  const rx = x - origin.x, rz = z - origin.z;
  if (kind !== 'edge') return { x: origin.x + snap(rx, GRID), z: origin.z + snap(rz, GRID) };
  const along = rot % 2 === 0; // even rotation: wall runs along X, sits on a z = const cell side
  return along
    ? { x: origin.x + snap(rx, GRID), z: origin.z + snap(rz, GRID, GRID / 2) }
    : { x: origin.x + snap(rx, GRID, GRID / 2), z: origin.z + snap(rz, GRID) };
}

// Foundations sit on the terrain (flush with a neighbour when close); the rest on the floor.
function heightFor(type, x, z, pieces, ground) {
  const g = ground(x, z);
  if (type === 'fondasi') {
    const near = pieces.find((p) => p.type === 'fondasi' && Math.hypot(p.x - x, p.z - z) <= GRID + 0.1 && Math.abs(p.y - g) < 1.2);
    return near ? near.y : g + 0.2;
  }
  const floor = Math.max(g, foundationTop(pieces, x, z));
  return pieceOf(type).kind === 'roof' ? floor + WALL_H : floor;
}

// -> { x, y, z, rot, ok, why } for the ghost. base = null while placing the beacon.
export function planPiece(type, rot, aimX, aimZ, base, ground) {
  const pieces = base?.pieces ?? [];
  const origin = pieces[0];
  const { x, z } = snapXZ(pieceOf(type).kind, rot, aimX, aimZ, origin);
  const y = heightFor(type, x, z, pieces, ground);
  const spot = { x, y, z, rot, ok: true, why: '' };
  if (origin && Math.hypot(x - origin.x, z - origin.z) > BASE_RADIUS) return fail(spot, 'Terlalu jauh dari suar markas');
  if (type === 'fondasi' && steep(x, z, ground)) return fail(spot, 'Tanah terlalu miring');
  if (pieces.some((p) => p.type === type && Math.hypot(p.x - x, p.z - z) < 0.4 && Math.abs(p.y - y) < 0.5)) {
    return fail(spot, 'Sudah ada bagian di sini');
  }
  return spot;
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
