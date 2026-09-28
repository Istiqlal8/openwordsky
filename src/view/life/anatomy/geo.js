// Smooth procedural geometry: lofts along paths (torso, neck, tail, horns), capsules, slabs.
import * as THREE from 'three';

const _t = new THREE.Vector3();
const _n = new THREE.Vector3();
const _b = new THREE.Vector3();
const _ref = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

// Superellipse-ish ring coordinate: exponent 2 = ellipse, larger = boxier.
const se = (c, e) => Math.sign(c) * Math.abs(c) ** (2 / e);

function frameAt(path, i, ref) {
  const a = path[Math.max(0, i - 1)].p, b = path[Math.min(path.length - 1, i + 1)].p;
  _t.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
  _ref.copy(ref);
  if (Math.abs(_t.dot(_ref)) > 0.97) _ref.set(_ref.y, _ref.z, _ref.x);
  _n.copy(_ref).addScaledVector(_t, -_t.dot(_ref)).normalize();
  _b.crossVectors(_t, _n).normalize();
}

// Loft: path = [{ p: [x,y,z], rh, rw, dy? }], rings of `radial` verts; rh along ref, rw sideways.
export function loft(path, radial = 10, ref = UP, exp = 2) {
  const pos = [], idx = [];
  for (let i = 0; i < path.length; i++) {
    frameAt(path, i, ref);
    const { p, rh, rw, dy = 0 } = path[i];
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2, c = se(Math.cos(a), exp) * rh, s = se(Math.sin(a), exp) * rw;
      pos.push(p[0] + _n.x * (c + dy) + _b.x * s, p[1] + _n.y * (c + dy) + _b.y * s, p[2] + _n.z * (c + dy) + _b.z * s);
    }
  }
  for (let i = 0; i < path.length - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + ((j + 1) % radial), c = a + radial, d = b + radial;
      idx.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Samples a curve into loft rings; radius(t) -> [rh, rw].
export function curveLoft(points, rings, radius, radial = 8, ref = UP, exp = 2) {
  const curve = new THREE.CatmullRomCurve3(points.map((q) => new THREE.Vector3(...q)));
  const path = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings, q = curve.getPoint(t), [rh, rw] = radius(t);
    path.push({ p: [q.x, q.y, q.z], rh, rw });
  }
  return loft(path, radial, ref, exp);
}

// Rounded tapered limb hanging from the origin along -Y (r0 at top, r1 at bottom).
// flat < 1 thins it sideways; bulge swells the middle (muscle).
export function limb(len, r0, r1, radial = 6, flat = 1, bulge = 0) {
  const ring = (y, r) => ({ p: [0, y, 0], rh: r, rw: r * flat });
  const path = [ring(r0 * 0.95, r0 * 0.3), ring(r0 * 0.6, r0 * 0.8), ring(0, r0)];
  if (bulge) path.push(ring(-len * 0.4, (r0 * 0.6 + r1 * 0.4) * (1 + bulge)));
  path.push(ring(-len, r1), ring(-len - r1 * 0.6, r1 * 0.8), ring(-len - r1 * 0.95, r1 * 0.3));
  return loft(path, radial, new THREE.Vector3(1, 0, 0));
}

// Horizontal capsule segment from x=0 to x=-len (tails, serpent bodies).
export function segment(len, r0, r1, radial = 8, flatY = 1) {
  const g = limb(len, r0, r1, radial, 1);
  g.rotateZ(-Math.PI / 2);
  if (flatY !== 1) g.scale(1, flatY, 1);
  return g;
}

export function ellipsoid(rx, ry, rz, ws = 12, hs = 8) {
  return new THREE.SphereGeometry(1, ws, hs).scale(rx, ry, rz);
}

// Two-sided thin slab from a 2D outline (x forward, y outward -> +z); faces point +-Y.
export function slab(outline, thick = 0.01) {
  const tris = THREE.ShapeUtils.triangulateShape(outline.map(([x, y]) => new THREE.Vector2(x, y)), []);
  const pos = [], idx = [], n = outline.length;
  for (const [x, y] of outline) pos.push(x, thick, y);
  for (const [x, y] of outline) pos.push(x, -thick, y);
  const [a, b, c] = tris[0], P = (i) => outline[i];
  const up = (P(b)[1] - P(a)[1]) * (P(c)[0] - P(a)[0]) - (P(b)[0] - P(a)[0]) * (P(c)[1] - P(a)[1]) > 0;
  for (const [i, j, k] of tris) {
    if (up) idx.push(i, j, k, k + n, j + n, i + n);
    else idx.push(k, j, i, i + n, j + n, k + n);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export const smooth01 = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
export const bump = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
