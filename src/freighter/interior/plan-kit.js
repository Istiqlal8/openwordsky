// Small builders for layout plans: walkable areas, room walls and door gaps.
export const DOOR_H = 3.2;

export const rect = (x0, x1, z0, z1, o = {}) => ({ x0, x1, z0, z1, y: 0, h: 4, ...o });
export const disc = (cx, cz, r, o = {}) => ({ cx, cz, r, y: 0, h: 4, ...o });
export const ring = (cx, cz, r0, r1, o = {}) => ({ cx, cz, r0, r1, y: 0, h: 4, ...o });
// Floor rises from y0 at the low edge (x0 or z0) to y1 at the high edge.
export const ramp = (x0, x1, z0, z1, y0, y1, axis = 'z', o = {}) => ({ x0, x1, z0, z1, y0, y1, axis, h: 4, ...o });

// Door gap centred on c (along the wall), relative to the wall's base.
export const gap = (c, w = 3.2, y0 = 0, y1 = DOOR_H) => [c - w / 2, c + w / 2, y0, y1];

// Curved-wall gap centred on angle theta, `w` metres wide at radius r.
export const arcGap = (theta, w, r, y0 = 0, y1 = DOOR_H) => [theta - w / (2 * r), theta + w / (2 * r), y0, y1];

// Four walls of a rect room: gaps = { s, n, w, e } (s at z0, n at z1, w at x0, e at x1);
// `skip` lists sides owned by a neighbour.
export function roomWalls(r, gaps = {}, skip = '') {
  const y = r.y ?? 0, top = y + r.h, out = [];
  if (!skip.includes('s')) out.push(['x', r.z0, r.x0, r.x1, top, gaps.s ?? [], y]);
  if (!skip.includes('n')) out.push(['x', r.z1, r.x0, r.x1, top, gaps.n ?? [], y]);
  if (!skip.includes('w')) out.push(['z', r.x0, r.z0, r.z1, top, gaps.w ?? [], y]);
  if (!skip.includes('e')) out.push(['z', r.x1, r.z0, r.z1, top, gaps.e ?? [], y]);
  return out;
}

// Crew route around a circle: n points at radius r (optionally on a raised deck).
export function loop(cx, cz, r, n = 8, y = 0, start = 0) {
  return Array.from({ length: n }, (_, i) => {
    const t = start + (i / n) * Math.PI * 2;
    return [cx + Math.sin(t) * r, cz + Math.cos(t) * r, y];
  });
}
