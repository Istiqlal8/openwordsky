// Floor collision for the interior: the player (a circle on the floor plane) must stay inside
// the union of walkable rectangles and outside every solid box.
export const BODY_RADIUS = 0.4;

export class Walkable {
  // areas / blocks: [{ x0, x1, z0, z1 }]
  constructor(areas, blocks = []) {
    this.areas = areas;
    this.blocks = blocks;
  }

  // True when a circle of radius r at (x, z) fits inside one walkable area.
  inside(x, z, r = BODY_RADIUS) {
    for (const a of this.areas) {
      if (x >= a.x0 + r && x <= a.x1 - r && z >= a.z0 + r && z <= a.z1 - r) return true;
    }
    return false;
  }

  // Move pos (x/z) by (dx, dz), sliding along walls, then out of solid boxes.
  move(pos, dx, dz, r = BODY_RADIUS) {
    if (this.inside(pos.x + dx, pos.z + dz, r)) { pos.x += dx; pos.z += dz; }
    else if (this.inside(pos.x + dx, pos.z, r)) pos.x += dx;
    else if (this.inside(pos.x, pos.z + dz, r)) pos.z += dz;
    this.pushOut(pos, r);
  }

  // Circle vs AABB: push to the closest point on the box edge.
  pushOut(pos, r) {
    for (const b of this.blocks) {
      const cx = Math.max(b.x0, Math.min(pos.x, b.x1)), cz = Math.max(b.z0, Math.min(pos.z, b.z1));
      let dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 < 1e-8) { // centre inside the box: leave by the nearest side
        const out = [pos.x - b.x0, b.x1 - pos.x, pos.z - b.z0, b.z1 - pos.z];
        const i = out.indexOf(Math.min(...out));
        if (i < 2) pos.x = i === 0 ? b.x0 - r : b.x1 + r; else pos.z = i === 2 ? b.z0 - r : b.z1 + r;
        continue;
      }
      const d = Math.sqrt(d2);
      dx /= d; dz /= d;
      const nx = cx + dx * r, nz = cz + dz * r;
      if (this.inside(nx, nz, r)) { pos.x = nx; pos.z = nz; }
    }
  }
}

// Box helper: centre + size to an AABB.
export function aabb(x, z, w, d) {
  return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 };
}
