// Mesh builders for ancient ruin sites. Each returns { group, reach, spin[] }.
// Geometries are created per site and freed by the caller via group.traverse.
import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

function add(group, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  group.add(m);
  return m;
}

// Rune glyph strips scattered on both big faces of a slab (one instanced draw).
function runeFaces(group, rng, mat, w, h, depth) {
  const n = 40;
  const glyphs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.06), mat, n);
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    _p.set(rng.range(-w * 0.38, w * 0.38), rng.range(h * 0.1, h * 0.92), side * (depth / 2 + 0.02));
    _s.set(rng.chance(0.5) ? 0.12 : rng.range(0.2, 0.55), rng.chance(0.5) ? 0.12 : rng.range(0.25, 0.7), 1);
    _m.compose(_p, _q.identity(), _s);
    glyphs.setMatrixAt(i, _m);
  }
  group.add(glyphs);
}

export function buildMonolith(rng, mats) {
  const group = new THREE.Group();
  const w = 2.6, h = rng.range(12, 18), d = 1;
  const slab = new THREE.Group();
  slab.rotation.set(rng.range(-0.08, 0.08), rng.range(0, Math.PI), rng.range(-0.08, 0.08));
  add(slab, new THREE.BoxGeometry(w, h, d), mats.obsidian, 0, h / 2 - 1.5, 0);
  runeFaces(slab, rng, mats.rune, w, h - 1.5, d);
  group.add(slab);
  const spin = [];
  const shardGeo = new THREE.OctahedronGeometry(0.5);
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    pivot.position.y = h - 2 + i * 1.2;
    add(pivot, shardGeo, mats.rune, 2.6 + i * 0.6, 0, 0).scale.set(0.6, 1.4, 0.6);
    pivot.userData.speed = rng.range(0.4, 0.9) * (i % 2 ? -1 : 1);
    group.add(pivot);
    spin.push(pivot);
  }
  return { group, reach: 1.5, spin };
}

function column(group, mats, x, z, h, fallen, rng) {
  const geo = new THREE.CylinderGeometry(0.65, 0.8, h, 10);
  if (!fallen) return add(group, geo, mats.stone, x, h / 2 - 0.4, z, rng.range(-0.06, 0.06), 0, rng.range(-0.06, 0.06));
  const a = Math.atan2(z, x);
  return add(group, geo, mats.stone, x * 1.15, 0.45, z * 1.15, 0, -a, Math.PI / 2);
}

function arch(group, mats, a, r) {
  const x = Math.cos(a) * r, z = Math.sin(a) * r, tx = -Math.sin(a) * 2.2, tz = Math.cos(a) * 2.2;
  const geo = new THREE.CylinderGeometry(0.7, 0.85, 7.5, 10);
  add(group, geo, mats.stone, x + tx, 3.35, z + tz);
  add(group, geo, mats.stone, x - tx, 3.35, z - tz);
  add(group, new THREE.BoxGeometry(1.4, 1, 6.4), mats.stone, x, 7.5, z, 0, -a, 0);
}

export function buildRing(rng, mats) {
  const group = new THREE.Group();
  const r = rng.range(9, 12), n = 9 + rng.int(4), arches = 1 + rng.int(2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (i < arches * 2 && i % 2 === 0) { arch(group, mats, a, r); continue; }
    if (rng.chance(0.25)) continue; // missing stone
    column(group, mats, Math.cos(a) * r, Math.sin(a) * r, rng.range(1.5, 6.5), rng.chance(0.3), rng);
  }
  add(group, new THREE.CylinderGeometry(r + 1.5, r + 2.5, 5, 32), mats.stone, 0, -2.3, 0); // plinth
  add(group, new THREE.BoxGeometry(1.8, 1.1, 1.8), mats.stone, 0, 0.5, 0);
  const pivot = new THREE.Group();
  pivot.position.y = 2.2;
  pivot.userData.speed = 0.8;
  add(pivot, new THREE.OctahedronGeometry(0.55), mats.rune, 0, 0, 0).scale.set(1, 1.6, 1);
  group.add(pivot);
  return { group, reach: 0, spin: [pivot] };
}

export function buildHead(rng, mats) {
  const group = new THREE.Group();
  const head = new THREE.Group();
  head.rotation.set(rng.range(-0.35, -0.1), rng.range(0, Math.PI * 2), rng.range(-0.3, 0.3));
  head.position.y = -1.8;
  add(head, new THREE.SphereGeometry(1, 20, 14), mats.stone, 0, 3, 0).scale.set(4, 5.5, 4.4);
  add(head, new THREE.BoxGeometry(6.4, 0.9, 1.6), mats.stone, 0, 4.4, 3.4, 0.25);
  const eye = new THREE.SphereGeometry(0.8, 12, 8);
  add(head, eye, mats.rune, -1.6, 3.4, 3.9).scale.set(1.3, 0.6, 0.5);
  add(head, eye, mats.rune, 1.6, 3.4, 3.9).scale.set(1.3, 0.6, 0.5);
  add(head, new THREE.BoxGeometry(0.9, 2.4, 1.2), mats.stone, 0, 2.2, 4.1, -0.2);
  add(head, new THREE.BoxGeometry(2.6, 0.25, 0.6), mats.dark, 0, 0.5, 3.9);
  const crest = new THREE.ConeGeometry(0.6, 3.2, 6);
  for (let i = 0; i < 5; i++) {
    const a = -0.8 + i * 0.4;
    add(head, crest, mats.stone, 0, 3 + Math.cos(a) * 5.6, -Math.sin(a) * 4.2 - 0.5, -a * 0.9 - 0.3);
  }
  group.add(head);
  return { group, reach: 5, spin: [] };
}

export function buildProbe(rng, mats) {
  const group = new THREE.Group();
  add(group, new THREE.CircleGeometry(9, 24), mats.scorch, 0, 0.06, 0, -Math.PI / 2);
  const body = new THREE.Group();
  body.rotation.set(0, rng.range(0, Math.PI * 2), 0);
  const hull = new THREE.Group();
  hull.rotation.z = rng.range(0.45, 0.75);
  hull.position.y = 0.8;
  add(hull, new THREE.CylinderGeometry(1.5, 1.7, 8, 12), mats.metal, 0, 2.5, 0);
  add(hull, new THREE.ConeGeometry(1.5, 2.2, 12), mats.metal, 0, 7.6, 0);
  add(hull, new THREE.SphereGeometry(2, 16, 8, 0, Math.PI * 2, 0, 1.1), mats.metal, 0, 9.4, 0, Math.PI);
  add(hull, new THREE.BoxGeometry(7, 0.1, 2.4), mats.panel, 4.8, 3, 0, 0.3, 0, rng.range(-0.3, 0.3));
  add(hull, new THREE.BoxGeometry(4.5, 0.1, 2.4), mats.panel, -3.6, 1.5, 0.4, -0.5, 0.2, 0.9);
  add(hull, new THREE.CylinderGeometry(0.06, 0.06, 5, 4), mats.metal, 1, 8.5, 0.6, 0.3, 0, -0.4);
  add(hull, new THREE.SphereGeometry(0.35, 8, 6), mats.rune, 1.3, 11, 1.2);
  add(hull, new THREE.BoxGeometry(0.4, 0.8, 1.4), mats.rune, 0, 4, 1.55);
  body.add(hull);
  group.add(body);
  for (let i = 0; i < 6; i++) {
    const s = rng.range(0.3, 0.9);
    add(group, new THREE.TetrahedronGeometry(s), mats.metal, rng.range(-7, 7), s * 0.3, rng.range(-7, 7),
      rng.next() * 3, rng.next() * 3, 0);
  }
  return { group, reach: 3, spin: [] };
}

export const BUILDERS = {
  monolit: { build: buildMonolith, label: 'Monolit' },
  cincin: { build: buildRing, label: 'Cincin Batu' },
  kepala: { build: buildHead, label: 'Kepala Raksasa' },
  wahana: { build: buildProbe, label: 'Wahana Kuno' },
};

export function disposeGroup(group) {
  group.traverse((o) => o.geometry?.dispose());
}
