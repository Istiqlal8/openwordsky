// Floor collision for the interior: the player (a circle on the floor) must stay inside the
// union of walkable areas and outside every solid box. Areas can sit on different levels:
// rect { x0, x1, z0, z1 }, disc { cx, cz, r }, ring { cx, cz, r0, r1 }, each with floor height
// `y` (default 0) and ceiling clearance `h`; a ramp is a rect with { y0, y1, axis } whose floor
// rises from its low edge (x0 / z0) to its high edge. Blocks { x0, x1, z0, z1, y?, h? } only
// stop a body whose feet are within [y - 0.5, y + h).
export const BODY_RADIUS = 0.4;
export const STEP = 0.7; // highest floor change walked over without jumping

const clamp01 = (t) => Math.max(0, Math.min(1, t));

// Floor height of an area at (x, z).
export function floorOf(a, x, z) {
  if (a.y1 === undefined) return a.y ?? 0;
  const t = a.axis === 'x' ? (x - a.x0) / (a.x1 - a.x0) : (z - a.z0) / (a.z1 - a.z0);
  return a.y0 + (a.y1 - a.y0) * clamp01(t);
}

// True when a circle of radius r at (x, z) lies inside the area's footprint.
export function holds(a, x, z, r) {
  if (a.r !== undefined) return a.r > r && (x - a.cx) ** 2 + (z - a.cz) ** 2 <= (a.r - r) ** 2;
  if (a.r0 !== undefined) {
    const d = Math.hypot(x - a.cx, z - a.cz);
    return d >= a.r0 + r && d <= a.r1 - r;
  }
  return x >= a.x0 + r && x <= a.x1 - r && z >= a.z0 + r && z <= a.z1 - r;
}

export class Walkable {
  constructor(areas, blocks = []) {
    this.areas = areas;
    this.blocks = blocks;
  }

  // The highest area under (x, z) whose floor is reachable from height y, or null.
  areaAt(x, z, y = 0) {
    let best = null, bestF = -Infinity;
    for (const a of this.areas) {
      if (!holds(a, x, z, 0)) continue;
      const f = floorOf(a, x, z);
      if (f <= y + STEP && f > bestF) { best = a; bestF = f; }
    }
    return best;
  }

  floorAt(x, z, y = 0) {
    const a = this.areaAt(x, z, y);
    return a ? floorOf(a, x, z) : -Infinity;
  }

  ceilingAt(x, z, y = 0) {
    const a = this.areaAt(x, z, y);
    return a ? floorOf(a, x, z) + (a.h ?? 4) : y + 4;
  }

  // True when a circle of radius r at (x, z) fits inside one area reachable from height y.
  inside(x, z, r = BODY_RADIUS, y = 0) {
    for (const a of this.areas) if (holds(a, x, z, r) && floorOf(a, x, z) <= y + STEP) return true;
    return false;
  }

  // Move pos (x/z) by (dx, dz), sliding along walls, then out of solid boxes.
  move(pos, dx, dz, r = BODY_RADIUS) {
    const y = pos.y;
    if (this.inside(pos.x + dx, pos.z + dz, r, y)) { pos.x += dx; pos.z += dz; }
    else if (this.inside(pos.x + dx, pos.z, r, y)) pos.x += dx;
    else if (this.inside(pos.x, pos.z + dz, r, y)) pos.z += dz;
    this.pushOut(pos, r);
  }

  // Circle vs AABB: push to the closest point on the box edge.
  pushOut(pos, r) {
    for (const b of this.blocks) {
      const by = b.y ?? 0;
      if (pos.y < by - 0.5 || pos.y >= by + (b.h ?? 4)) continue;
      const cx = Math.max(b.x0, Math.min(pos.x, b.x1)), cz = Math.max(b.z0, Math.min(pos.z, b.z1));
      let dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 < 1e-8) { this.leaveBox(pos, b, r); continue; }
      const d = Math.sqrt(d2);
      dx /= d; dz /= d;
      const nx = cx + dx * r, nz = cz + dz * r;
      if (this.inside(nx, nz, r, pos.y)) { pos.x = nx; pos.z = nz; }
    }
  }

  // Centre inside the box: leave by the nearest side.
  leaveBox(pos, b, r) {
    const out = [pos.x - b.x0, b.x1 - pos.x, pos.z - b.z0, b.z1 - pos.z];
    const i = out.indexOf(Math.min(...out));
    if (i < 2) pos.x = i === 0 ? b.x0 - r : b.x1 + r; else pos.z = i === 2 ? b.z0 - r : b.z1 + r;
  }
}

// Box helper: centre + size to an AABB, optionally on a raised level.
export function aabb(x, z, w, d, y = 0, h = 4) {
  return { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y, h };
}
