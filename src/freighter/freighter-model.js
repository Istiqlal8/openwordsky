// Procedural capital ship in space units (~340 long, nose -Z, hangar opening on +X).
import * as THREE from 'three';
import { std, glow, box, cyl } from './kit.js';
import { buildBay, BAY } from './freighter-bay.js';

export const HULL = { L: 340, W: 46, H: 34, bow: -170, stern: 150 };
const CONTAINER_COLORS = [0xb8452e, 0x2f6fa8, 0xd9a13a, 0x4d8a4a, 0x8a8f99, 0xc96a2b];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

export function freighterMaterials(accent) {
  return {
    hull: std({ color: 0x8a909c, emissive: 0x272c36, flatShading: true, metalness: 0.55, roughness: 0.55 }),
    plate: std({ color: 0x5d636f, emissive: 0x101318, flatShading: true }),
    dark: std({ color: 0x23262d, emissive: 0x07080a, flatShading: true }),
    accent: std({ color: accent, emissive: accent, emissiveIntensity: 0.25, flatShading: true }),
    crate: std({ color: 0xffffff, roughness: 0.8, metalness: 0.2 }),
    window: glow(0xffe0a8, 1.8),
    engine: glow(0x6ad0ff, 3),
    bay: glow(0x7fe6ff, 2.4),
    warn: glow(0xffb040, 2.2),
  };
}

// Main hull sections from bow to stern, skipping the hangar span (built by the bay).
function hull(g, mats, rng) {
  const { W, H } = HULL;
  const cuts = [-140, -95, -50, BAY.z0, BAY.z1, 70, 110, 150];
  for (let i = 0; i < cuts.length - 1; i++) {
    const z0 = cuts[i], z1 = cuts[i + 1];
    if (z0 === BAY.z0) continue;
    const w = W * rng.range(0.94, 1.04), h = H * rng.range(0.92, 1.04);
    box(g, i % 2 ? mats.plate : mats.hull, w, h, z1 - z0 - 1.2, 0, 0, (z0 + z1) / 2);
    box(g, mats.dark, w + 1.5, 3, 1.6, 0, h * 0.2, z1 - 0.6); // rib between sections
    box(g, mats.accent, w + 0.6, 1.4, (z1 - z0) * 0.8, 0, -h * 0.32, (z0 + z1) / 2);
  }
  box(g, mats.dark, W * 0.7, 6, 290, 0, -HULL.H / 2 - 2, 0); // keel
}

function bow(g, mats) {
  const geo = new THREE.CylinderGeometry(4, HULL.W * 0.72, 44, 4).rotateY(Math.PI / 4);
  const m = new THREE.Mesh(geo, mats.hull);
  m.rotation.x = -Math.PI / 2;
  m.scale.set(1, 1, HULL.H / HULL.W);
  m.position.z = -162;
  g.add(m);
  box(g, mats.window, 10, 1.2, 0.8, 0, 6, -149.8);
}

// Bridge tower near the stern with a lit window band, antenna mast and dish.
function tower(g, mats) {
  const y0 = HULL.H / 2;
  box(g, mats.plate, 22, 26, 26, 0, y0 + 13, 118);
  box(g, mats.hull, 38, 9, 16, 0, y0 + 30, 112);
  box(g, mats.window, 36, 2.2, 0.6, 0, y0 + 30.5, 103.8);
  box(g, mats.window, 0.6, 2.2, 12, 19.1, y0 + 30.5, 112);
  box(g, mats.window, 0.6, 2.2, 12, -19.1, y0 + 30.5, 112);
  cyl(g, mats.dark, 0.6, 0.9, 38, 4, y0 + 53, 118);
  box(g, mats.dark, 14, 0.6, 0.6, 4, y0 + 62, 118);
  box(g, mats.dark, 9, 0.6, 0.6, 4, y0 + 56, 118);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.35), mats.hull);
  dish.position.set(-7, y0 + 38, 124);
  dish.rotation.set(-0.7, 0, 0.4);
  g.add(dish);
  return { strobe: new THREE.Vector3(4, y0 + 72, 118) };
}

// 3 x 2 engine nozzles at the stern with glowing cores.
function engines(g, mats) {
  const cores = [];
  for (const x of [-15, 0, 15]) for (const y of [-7, 8]) {
    const n = cyl(g, mats.dark, 6, 7.5, 18, x, y, 158, 18);
    n.rotation.x = Math.PI / 2;
    const core = cyl(g, mats.engine, 5.2, 5.2, 0.5, x, y, 167.3, 18);
    core.rotation.x = Math.PI / 2;
    cores.push(new THREE.Vector3(x, y, 172));
  }
  return cores;
}

// Stacks of cargo containers on the top deck and the port flank (one instanced draw).
function containers(g, mats, rng) {
  const spots = [];
  for (let z = -130; z < 90; z += 16) {
    if (z > -20 && z < 30 && rng.chance(0.5)) continue;
    const rows = 1 + rng.int(3);
    for (let r = 0; r < rows; r++) for (const x of [-12, 0, 12]) if (rng.chance(0.75)) spots.push([x, HULL.H / 2 + 3.2 + r * 6.2, z]);
  }
  for (let z = -120; z < 64; z += 16) for (const y of [-8, 2]) if (rng.chance(0.6)) spots.push([-HULL.W / 2 - 4, y, z]);
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(11, 6, 15), mats.crate, spots.length);
  const col = new THREE.Color();
  spots.forEach(([x, y, z], i) => {
    inst.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q.identity(), _s));
    inst.setColorAt(i, col.setHex(rng.pick(CONTAINER_COLORS)));
  });
  g.add(inst);
}

// Lit portholes along both flanks.
function windows(g, mats, rng) {
  const n = 90, inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1, 2.2), mats.window, n);
  for (let i = 0; i < n; i++) {
    let z = rng.range(-140, 145);
    if (z > BAY.z0 - 2 && z < BAY.z1 + 2) z += 60;
    const side = i % 3 ? 1 : -1;
    _p.set(side * (HULL.W / 2 + 0.3), rng.pick([-6, -2, 2, 6, 10]), z);
    inst.setMatrixAt(i, _m.compose(_p, _q.identity(), _s));
  }
  g.add(inst);
}

// Hull detail: sponsons near the stern and scattered plating blocks (one instanced draw).
function greebles(g, mats, rng) {
  for (const s of [-1, 1]) {
    box(g, mats.plate, 10, 12, 70, s * (HULL.W / 2 + 5), -4, 108);
    box(g, mats.accent, 10.4, 1.2, 60, s * (HULL.W / 2 + 5), 2.6, 108);
  }
  const n = 160, inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats.dark, n);
  for (let i = 0; i < n; i++) {
    let z = rng.range(-140, 145);
    if (z > BAY.z0 - 2 && z < BAY.z1 + 2) z -= 70;
    const top = i % 3 === 0, side = rng.chance(0.5) ? 1 : -1;
    _p.set(top ? rng.range(-18, 18) : side * (HULL.W / 2 + 0.6), top ? HULL.H / 2 + 0.6 : rng.range(-14, 14), z);
    _s.set(top ? rng.range(2, 6) : 1.2, top ? rng.range(0.8, 2) : rng.range(1, 3), rng.range(3, 12));
    inst.setMatrixAt(i, _m.compose(_p, _q.identity(), _s));
  }
  _s.set(1, 1, 1);
  g.add(inst);
}

// Returns { group, bay, engineCores, lights: { port, starboard, strobe } } in local space.
export function buildFreighterModel(rng, mats) {
  const group = new THREE.Group();
  group.name = 'freighter';
  hull(group, mats, rng);
  bow(group, mats);
  const t = tower(group, mats);
  const engineCores = engines(group, mats);
  containers(group, mats, rng);
  windows(group, mats, rng);
  greebles(group, mats, rng);
  const bay = buildBay(group, mats);
  const lights = {
    port: new THREE.Vector3(-HULL.W / 2 - 1, HULL.H / 2, -120),
    starboard: new THREE.Vector3(HULL.W / 2 + 1, HULL.H / 2, -120),
    strobe: t.strobe, bow: new THREE.Vector3(0, 8, -186),
  };
  return { group, bay, engineCores, lights };
}
