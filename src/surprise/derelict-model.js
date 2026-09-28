// Procedural hulk of an abandoned capital ship, built along +X from boxes and cylinders.
import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

export function hulkMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.75, metalness: 0.55, ...o });
  return {
    hull: std({ color: 0x5a5e68, emissive: 0x1a1e28 }), // faint self-light: readable on the night side
    dark: std({ color: 0x1d1f25, emissive: 0x08090c }),
    rust: std({ color: 0x74402a, metalness: 0.2, emissive: 0x1c0e08 }),
    window: new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd49a, emissiveIntensity: 1.6 }),
    warn: new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2a18, emissiveIntensity: 2 }),
  };
}

function box(parent, mat, w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// Lit windows along both flanks of a section (one instanced draw).
function windows(parent, mat, rng, len, w, h, x0) {
  const n = 24, inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 0.8, 0.4), mat, n);
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    _p.set(x0 + rng.range(-len / 2 + 2, len / 2 - 2), rng.range(-h * 0.35, h * 0.35), side * (w / 2 + 0.1));
    inst.setMatrixAt(i, _m.compose(_p, _q.identity(), _s.set(1, 1, 1)));
  }
  parent.add(inst);
}

function section(g, mats, rng, x, len, W, H, broken) {
  const part = new THREE.Group();
  const w = W * rng.range(0.8, 1.1), h = H * rng.range(0.8, 1.15);
  box(part, rng.chance(0.2) ? mats.rust : mats.hull, len, h, w, x, 0, 0);
  box(part, mats.dark, len * 0.6, h * 0.25, w * 1.1, x, -h * 0.3, 0);
  windows(part, mats.window, rng, len, w, h, x);
  if (broken) {
    part.position.set(0, rng.range(-H, H) * 0.8, rng.range(-W, W) * 0.6);
    part.rotation.copy(_e.set(rng.range(-0.3, 0.3), rng.range(-0.25, 0.25), rng.range(-0.35, 0.35)));
  }
  g.add(part);
}

function girders(g, mats, x, len, W, H) {
  for (const [y, z] of [[H * 0.3, W * 0.3], [-H * 0.3, W * 0.3], [H * 0.3, -W * 0.3], [-H * 0.3, -W * 0.3]]) {
    box(g, mats.dark, len, 1.2, 1.2, x, y, z);
  }
}

function sternAndBow(g, mats, rng, L, W, H) {
  const bow = new THREE.Mesh(new THREE.ConeGeometry(W * 0.6, L * 0.14, 4), mats.hull);
  bow.rotation.set(Math.PI / 4, 0, -Math.PI / 2);
  bow.position.x = L / 2 + L * 0.07;
  g.add(bow);
  const tower = box(g, mats.hull, L * 0.08, H * 0.9, W * 0.35, -L * 0.28, H * 0.85, 0);
  box(tower, mats.window, L * 0.05, 1, W * 0.37, 0, H * 0.3, 0);
  box(g, mats.warn, 1.5, 1.5, 1.5, -L * 0.28, H * 1.4, 0);
  const nozzle = new THREE.CylinderGeometry(H * 0.28, H * 0.36, L * 0.08, 12);
  for (const [y, z] of [[H * 0.22, W * 0.25], [H * 0.22, -W * 0.25], [-H * 0.22, 0]]) {
    const n = new THREE.Mesh(nozzle, rng.chance(0.3) ? mats.rust : mats.dark);
    n.rotation.z = Math.PI / 2;
    n.position.set(-L / 2 - L * 0.03, y, z);
    g.add(n);
  }
}

// -> { group, length, sparks: Vector3[] (local emitters) }
export function buildHulk(rng, mats) {
  const g = new THREE.Group();
  const L = rng.range(200, 400), W = L * 0.13, H = L * 0.1;
  const n = 5 + rng.int(3), step = L / n, sparks = [];
  const gap = 1 + rng.int(n - 2); // a missing section shows the skeleton
  const drift = rng.chance(0.6) ? n - 1 : -1; // last section torn loose, drifting askew
  for (let i = 0; i < n; i++) {
    const x = L / 2 - step * (i + 0.5);
    if (i === gap) { girders(g, mats, x, step, W, H); sparks.push(new THREE.Vector3(x, 0, 0)); continue; }
    section(g, mats, rng, x, step * 0.94, W, H, i === drift);
  }
  sternAndBow(g, mats, rng, L, W, H);
  for (let i = 0; i < 8; i++) {
    const c = box(g, rng.chance(0.5) ? mats.rust : mats.hull, 6, 4, 4,
      L / 2 - step * (gap + 0.5) + rng.range(-step, step), rng.range(-H, H) * 1.6, rng.range(-W, W) * 1.4);
    c.rotation.set(rng.next() * 3, rng.next() * 3, 0);
  }
  sparks.push(new THREE.Vector3(L / 2 - step * (gap - 0.5) - step * 0.47, 0, 0));
  return { group: g, length: L, sparks };
}
