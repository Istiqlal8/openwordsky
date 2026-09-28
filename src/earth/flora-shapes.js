// Natural-looking Earth plant models, unit height (scaled per instance). Every geometry
// carries vertex colors used as soft shading (darker low and inside the crown), multiplied by
// the part's material color. shape -> [[role, geometry]]; roles: wood, leaf, accent, hue.
import * as THREE from 'three';

const TAU = Math.PI * 2;

// Non-indexed merge keeping position, normal and color.
export function mergeShaded(geos) {
  const flat = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const n = flat.reduce((s, g) => s + g.attributes.position.count, 0);
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const a = new Float32Array(n * 3);
    let o = 0;
    for (const g of flat) { a.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(a, 3));
  }
  return out;
}

// Vertex shade from height (y0 -> lo, y1 -> hi) and, optionally, distance from an axis.
function shade(geo, y0, y1, lo = 0.62, hi = 1.05, core = null) {
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    let k = lo + (hi - lo) * Math.min(1, Math.max(0, (p.getY(i) - y0) / (y1 - y0)));
    if (core) k *= 0.8 + 0.25 * Math.min(1, Math.hypot(p.getX(i) - core.x, p.getZ(i) - core.z) / core.r);
    col.fill(k, i * 3, i * 3 + 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// Tapered limb from a to b (radius r0 -> r1).
function limb(a, b, r0, r1, sides = 6) {
  const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, sides, 1, true).translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  return g.translate(a.x, a.y, a.z);
}

const clump = (r, x, y, z, sy = 0.8) => new THREE.IcosahedronGeometry(r, 1).scale(1, sy, 1).translate(x, y, z);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Broadleaf: trunk that forks into branches, each carrying a cluster of leafy clumps.
function broadleaf({ trunkH, spread, crownY, clumpR, branches, girth = 0.04 }) {
  const wood = [limb(V(0, 0, 0), V(0, trunkH, 0), girth, girth * 0.65, 7)], leaf = [];
  for (let i = 0; i < branches; i++) {
    const a = (i / branches) * TAU + i * 0.7, s = spread * (0.7 + (i % 3) * 0.15);
    const tip = V(Math.cos(a) * s, crownY + (i % 2) * 0.08, Math.sin(a) * s);
    wood.push(limb(V(0, trunkH * (0.75 + (i % 2) * 0.1), 0), tip, girth * 0.5, girth * 0.2, 5));
    leaf.push(clump(clumpR, tip.x, tip.y + clumpR * 0.3, tip.z));
    leaf.push(clump(clumpR * 0.8, tip.x * 0.55, tip.y + clumpR * 0.95, tip.z * 0.55));
    leaf.push(clump(clumpR * 0.7, tip.x * 0.85, tip.y - clumpR * 0.45, tip.z * 0.85, 0.7));
  }
  leaf.push(clump(clumpR * 1.1, 0, crownY + clumpR * 0.9, 0));
  const w = shade(mergeShaded(wood.map((g) => shade(g, 0, 1, 0.8, 1))), 0, 1, 0.8, 1);
  return [['wood', w], ['leaf', mergeShaded(leaf.map((g) => shade(g, crownY - clumpR, 1, 0.55, 1.08, { x: 0, z: 0, r: spread })))]];
}

// Conifer: short trunk and drooping tiers of needles, darker and wider toward the bottom.
function conifer(tiers, base, top, width) {
  const leaf = [];
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1), y = base + (top - base) * t, r = width * (1 - t * 0.82), h = (top - base) / tiers * 1.9;
    leaf.push(new THREE.ConeGeometry(r, h, 9, 1, true).rotateY(i * 0.9).translate(0, y + h * 0.35, 0));
  }
  return [['wood', shade(limb(V(0, 0, 0), V(0, base + 0.1, 0), 0.04, 0.03, 6), 0, 0.3, 0.7, 1)],
    ['leaf', mergeShaded(leaf.map((g) => shade(g, base, 1, 0.55, 1.05)))]];
}

// Drooping palm frond: a serrated ribbon along a curve.
function frond(len, droop) {
  const pos = [], seg = 10;
  const at = (t) => V(t * len, Math.sin(t * Math.PI * 0.5) * 0.12 - t * t * droop, 0);
  for (let i = 0; i < seg; i++) {
    const t0 = i / seg, t1 = (i + 1) / seg, p0 = at(t0), p1 = at(t1);
    const w0 = (0.02 + Math.sin(Math.PI * t0) * 0.1) * (i % 2 ? 0.7 : 1), w1 = 0.02 + Math.sin(Math.PI * t1) * 0.1;
    for (const side of [-1, 1]) pos.push(p0.x, p0.y, 0, p1.x, p1.y, 0, p0.x + 0.03, p0.y - 0.02, side * w0, p1.x, p1.y, 0, p1.x, p1.y - 0.02, side * w1, p0.x + 0.03, p0.y - 0.02, side * w0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

function palm() {
  const pts = [V(0, 0, 0), V(0.05, 0.3, 0), V(0.14, 0.62, 0), V(0.24, 0.9, 0)];
  const trunk = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.03, 6, false);
  const top = pts[3], fronds = [];
  for (let i = 0; i < 9; i++) {
    fronds.push(frond(0.42 + (i % 3) * 0.05, 0.32 + (i % 2) * 0.12).rotateZ(0.25).rotateY((i / 9) * TAU + 0.3).translate(top.x, top.y, top.z));
  }
  const nuts = [0, 1, 2].map((i) => shade(new THREE.SphereGeometry(0.035, 6, 4).translate(top.x + Math.cos(i * 2) * 0.04, top.y - 0.03, Math.sin(i * 2) * 0.04), 0, 1, 1, 1));
  return [['wood', shade(trunk, 0, 1, 0.75, 1.05)], ['leaf', mergeShaded(fronds.map((g) => shade(g, 0.6, 1, 0.75, 1.1)))],
    ['accent', mergeShaded(nuts)]];
}

function bush() {
  const parts = [[0.34, 0, 0.36, 0], [0.28, 0.28, 0.3, 0.1], [0.27, -0.25, 0.3, -0.12], [0.24, 0.05, 0.3, 0.3], [0.24, -0.02, 0.32, -0.3], [0.22, 0.05, 0.62, 0.02]];
  return [['leaf', mergeShaded(parts.map(([r, x, y, z]) => shade(clump(r, x, y, z, 0.85), 0, 0.9, 0.55, 1.08)))]];
}

// A patch of wildflowers: leafy stems, five-petal heads (random color) with yellow centres.
function flowers() {
  const stems = [], petals = [], hearts = [];
  for (let i = 0; i < 6; i++) {
    const a = i * 2.4, r = 0.12 + (i % 3) * 0.14, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.65 + (i % 3) * 0.15;
    stems.push(shade(limb(V(x, 0, z), V(x * 1.1, h, z * 1.1), 0.02, 0.012, 4), 0, 1, 0.7, 1));
    stems.push(shade(new THREE.SphereGeometry(0.08, 5, 3).scale(1.4, 0.2, 0.5).rotateY(a).translate(x * 0.9, h * 0.35, z * 0.9), 0, 1, 0.8, 1));
    for (let k = 0; k < 5; k++) {
      const b = (k / 5) * TAU;
      petals.push(shade(new THREE.SphereGeometry(0.05, 5, 3).scale(1.5, 0.3, 0.8).translate(0.06, 0, 0).rotateY(b).translate(x * 1.1, h, z * 1.1), 0, 1, 1, 1));
    }
    hearts.push(shade(new THREE.SphereGeometry(0.03, 5, 3).translate(x * 1.1, h + 0.015, z * 1.1), 0, 1, 1, 1));
  }
  return [['leaf', mergeShaded(stems)], ['hue', mergeShaded(petals)], ['accent', mergeShaded(hearts)]];
}

function fern() {
  const leaves = [];
  for (let i = 0; i < 8; i++) leaves.push(shade(frond(0.75, 0.55).rotateZ(0.9).rotateY((i / 8) * TAU).translate(0, 0.08, 0), 0, 0.8, 0.6, 1.05));
  return [['leaf', mergeShaded(leaves)]];
}

export const EARTH_SHAPES = {
  oak: () => broadleaf({ trunkH: 0.36, spread: 0.27, crownY: 0.56, clumpR: 0.19, branches: 6, girth: 0.045 }),
  birch: () => broadleaf({ trunkH: 0.52, spread: 0.11, crownY: 0.68, clumpR: 0.12, branches: 5, girth: 0.026 }),
  pine: () => conifer(6, 0.28, 0.92, 0.3),
  spruce: () => conifer(8, 0.12, 0.95, 0.24),
  palm,
  bush,
  flowers,
  fern,
};
