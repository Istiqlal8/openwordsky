// Push-out tests for the capital ship's collision shapes (all in ship-local space):
// box { min, max }, cylinder { axis 'y' | 'z', c, r, h: half length } and
// torus { c, R, r } lying in the XY plane (the ring ship's habitat ring).
const RAD = { y: [0, 2, 1], z: [0, 1, 2] };   // [radial a, radial b, axial] component indices

export function inBox(p, b) {
  return p.x > b.min[0] && p.x < b.max[0] && p.y > b.min[1] && p.y < b.max[1] && p.z > b.min[2] && p.z < b.max[2];
}

function box(p, s, m, n) {
  const v = [p.x, p.y, p.z], pen = [];
  for (let i = 0; i < 3; i++) {
    if (v[i] <= s.min[i] - m || v[i] >= s.max[i] + m) return false;
    pen.push(v[i] - (s.min[i] - m), s.max[i] + m - v[i]);
  }
  const k = pen.indexOf(Math.min(...pen)), axis = k >> 1, dir = k & 1 ? 1 : -1;
  v[axis] = dir > 0 ? s.max[axis] + m : s.min[axis] - m;
  p.set(v[0], v[1], v[2]);
  n.set(axis === 0 ? dir : 0, axis === 1 ? dir : 0, axis === 2 ? dir : 0);
  return true;
}

function cyl(p, s, m, n) {
  const v = [p.x - s.c[0], p.y - s.c[1], p.z - s.c[2]], [a, b, ax] = RAD[s.axis];
  const d = Math.hypot(v[a], v[b]), r = s.r + m, h = s.h + m;
  if (d >= r || Math.abs(v[ax]) >= h) return false;
  const w = [0, 0, 0];
  if (r - d < h - Math.abs(v[ax])) {
    const ua = d > 1e-6 ? v[a] / d : 1, ub = d > 1e-6 ? v[b] / d : 0;
    v[a] = ua * r; v[b] = ub * r; w[a] = ua; w[b] = ub;
  } else {
    w[ax] = Math.sign(v[ax]) || 1;
    v[ax] = w[ax] * h;
  }
  p.set(v[0] + s.c[0], v[1] + s.c[1], v[2] + s.c[2]);
  n.set(w[0], w[1], w[2]);
  return true;
}

function torus(p, s, m, n) {
  const x = p.x - s.c[0], y = p.y - s.c[1], z = p.z - s.c[2], q = Math.hypot(x, y) || 1e-6;
  const dr = q - s.R, d = Math.hypot(dr, z), r = s.r + m;
  if (d >= r) return false;
  const ur = d > 1e-6 ? dr / d : 1, uz = d > 1e-6 ? z / d : 0;
  n.set((x / q) * ur, (y / q) * ur, uz);
  const nq = s.R + ur * r;
  p.set(s.c[0] + (x / q) * nq, s.c[1] + (y / q) * nq, s.c[2] + uz * r);
  return true;
}

const PUSH = { box, cyl, torus };

// Moves local point p out of shape s (with margin m); writes the local push normal to n.
export function pushOut(p, s, m, n) {
  return PUSH[s.t](p, s, m, n);
}

// Radius of a sphere around the origin that contains every shape.
export function boundOf(solids) {
  let r = 0;
  for (const s of solids) {
    if (s.t === 'box') r = Math.max(r, Math.hypot(...s.min.map((a, i) => Math.max(Math.abs(a), Math.abs(s.max[i])))));
    else r = Math.max(r, Math.hypot(...s.c) + (s.t === 'torus' ? s.R + s.r : Math.hypot(s.r, s.h)));
  }
  return r;
}
