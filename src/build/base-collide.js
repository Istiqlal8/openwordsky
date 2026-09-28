// Makes a base physical for a player on foot: foundations are walkable floors (the surface's
// floorAt is wrapped while the base is mounted) and walls/windows/fences push the player out.
import { WALL_H, pieceOf } from './pieces.js';
import { foundationTop } from './placement.js';

const RADIUS = 0.55;      // player body radius
const HALF_LEN = 2.05;    // half a wall's length
const HALF_THICK = 0.15;  // half a wall's thickness

export class BaseCollide {
  constructor(surface) {
    this.surface = surface;
    this.pieces = [];
    this.walls = [];
    this.ground = surface.floorAt.bind(surface); // terrain floor, used for placement
    surface.floorAt = (x, z) => Math.max(this.ground(x, z), foundationTop(this.pieces, x, z));
  }

  setPieces(pieces) {
    this.pieces = pieces;
    this.walls = pieces.filter((p) => pieceOf(p.type)?.solid);
  }

  // Push the player's feet out of every wall they overlap (walls are thin boxes).
  update() {
    const s = this.surface, f = s.feet;
    if (s.flying || !f) return;
    let moved = false;
    for (const w of this.walls) moved = pushFromWall(f, w) || moved;
    if (moved) s.updateCamera(0);
  }

  dispose() {
    delete this.surface.floorAt; // back to the prototype method
  }
}

function pushFromWall(f, w) {
  const top = w.y + (pieceOf(w.type).solidH ?? WALL_H);
  if (f.y > top || f.y + 1.8 < w.y) return false;
  const along = w.rot % 2 === 0; // wall runs along X
  const du = along ? f.x - w.x : f.z - w.z;      // along the wall
  const dn = along ? f.z - w.z : f.x - w.x;      // across it
  if (Math.abs(du) > HALF_LEN + RADIUS * 0.5 || Math.abs(dn) >= HALF_THICK + RADIUS) return false;
  const push = (dn >= 0 ? 1 : -1) * (HALF_THICK + RADIUS);
  if (along) f.z = w.z + push; else f.x = w.x + push;
  return true;
}
