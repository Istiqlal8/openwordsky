// Ship hulls for the newer races. Built in metres facing -Z (nose at -Z);
// each returns { group, spin: [Object3D], flaps: [Object3D] } using the shared ship materials.
import { mesh, pivot } from './body-kit.js';

const oct = (kit) => kit.get('Octahedron', 1, 0);

function prism(kit, m, rng) {
  const g = pivot(), spin = [];
  m.hull.flatShading = true;
  g.add(mesh(kit.cyl(0, 2.2, 10, 3), m.hull, 0, 0, 0).rotateX(-Math.PI / 2));
  for (const s of [-1, 1]) g.add(mesh(oct(kit), m.clear, s * 2.8, 0, 2, 0.8, 0.5, 3.2));
  const core = mesh(oct(kit), m.glow, 0, 0, 2.5, 1.1);
  spin.push(core);
  g.add(core);
  return { group: g, spin, flaps: [] };
}

function spore(kit, m, rng) {
  const g = pivot(), spin = [];
  g.add(mesh(kit.get('Sphere', 1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.hull, 0, 0, 0, 6, 3, 6));
  g.add(mesh(kit.cyl(1.6, 2.2, 3, 12), m.dark, 0, -1.4, 0));
  for (let i = 0; i < 8; i++) g.add(mesh(kit.sphere(8), m.glow, Math.cos(i * 0.785) * 4, 1.4, Math.sin(i * 0.785) * 4, 0.5));
  const ring = pivot(0, -2.8, 0, mesh(kit.torus(1, 0.1), m.glow, 0, 0, 0, 2.2, 2.2, 1).rotateX(Math.PI / 2));
  spin.push(ring);
  g.add(ring);
  return { group: g, spin, flaps: [] };
}

function wing(kit, m, rng) {
  const g = pivot(), flaps = [];
  g.add(mesh(kit.sphere(14), m.hull, 0, 0, 0, 1.4, 1.2, 5), mesh(kit.cone(0.7, 2.4, 8), m.dark, 0, 0, -6).rotateX(-Math.PI / 2));
  for (const s of [-1, 1]) {
    const w = pivot(s * 1, 0.4, 0);
    for (let i = 0; i < 4; i++) w.add(mesh(kit.cone(0.6, 6 - i, 5), i % 2 ? m.dark : m.hull, s * (2.5 + i * 0.4), 0, -1 + i * 1.2, 1, 1, 0.25).rotateZ(s * -Math.PI / 2));
    w.userData.side = s;
    flaps.push(w);
    g.add(w);
  }
  g.add(mesh(kit.sphere(10), m.glow, 0, 0.8, -2.5, 0.6, 0.4, 1.2), mesh(kit.cyl(0.5, 0.2, 1.4, 8), m.glow, 0, 0, 5.2).rotateX(Math.PI / 2));
  return { group: g, spin: [], flaps };
}

function rock(kit, m, rng) {
  const g = pivot(), d = kit.get('Dodecahedron', 1, 0);
  m.hull.flatShading = true;
  g.add(mesh(d, m.hull, 0, 0, 0, 4, 3, 6));
  for (let i = 0; i < 4; i++) g.add(mesh(d, m.dark, rng.range(-3, 3), rng.range(-2, 2), rng.range(-4, 4), rng.range(1, 1.8)));
  for (const s of [-1, 1]) g.add(mesh(kit.cyl(0.9, 0.6, 2, 8), m.glow, s * 1.8, 0, 6).rotateX(Math.PI / 2));
  g.add(mesh(kit.box(0.4, 3, 0.2), m.glow, 0, 0.5, -5.5));
  return { group: g, spin: [], flaps: [] };
}

function seed(kit, m, rng) {
  const g = pivot(), flaps = [];
  g.add(mesh(kit.sphere(16), m.hull, 0, 0, 0, 2.4, 2.4, 5.5), mesh(kit.sphere(12), m.glow, 0, 0, -3.8, 1.2, 1.2, 1.4));
  for (let i = 0; i < 3; i++) {
    const leaf = pivot(0, 0, 3.5);
    leaf.add(mesh(kit.sphere(10), m.dark, 0, 0, 3, 1.2, 0.2, 3.5));
    leaf.rotation.z = (i / 3) * Math.PI * 2;
    leaf.userData.side = i % 2 ? 1 : -1;
    flaps.push(leaf);
    g.add(leaf);
  }
  return { group: g, spin: [], flaps };
}

function squid(kit, m, rng) {
  const g = pivot(), flaps = [];
  g.add(mesh(kit.cone(2.2, 9, 12), m.hull, 0, 0, -1).rotateX(-Math.PI / 2));
  for (const s of [-1, 1]) g.add(mesh(kit.sphere(10), m.glow, s * 1.2, 0.6, 3, 0.6));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, t = pivot(Math.cos(a) * 1.4, Math.sin(a) * 1.4, 3.6);
    t.add(mesh(kit.cyl(0.25, 0.08, 5, 5), m.dark, 0, 0, 2.5).rotateX(Math.PI / 2));
    t.userData.side = i % 2 ? 1 : -1;
    flaps.push(t);
    g.add(t);
  }
  return { group: g, spin: [], flaps };
}

function junk(kit, m, rng) {
  const g = pivot(), spin = [];
  g.add(mesh(kit.box(3, 2.4, 7), m.hull, 0, 0, 0), mesh(kit.box(2, 1.6, 2.5), m.dark, rng.range(-1, 1), 1.8, 1));
  g.add(mesh(kit.cyl(0.8, 0.8, 3, 8), m.dark, 2.2, -0.4, 1).rotateX(Math.PI / 2), mesh(kit.box(4, 0.3, 1.5), m.dark, -2.4, 0.3, 2));
  const prop = pivot(0, 0, 4, mesh(kit.box(4, 0.4, 0.2), m.glow, 0, 0, 0), mesh(kit.box(0.4, 4, 0.2), m.glow, 0, 0, 0));
  prop.rotation.x = Math.PI / 2;
  spin.push(prop);
  g.add(prop, mesh(kit.sphere(8), m.glow, 0, 0.5, -3.6, 0.6));
  return { group: g, spin, flaps: [] };
}

function ring(kit, m, rng) {
  const g = pivot(), spin = [];
  const r = pivot(0, 0, 0, mesh(kit.torus(1, 0.08), m.glow, 0, 0, 0, 6, 6, 3));
  spin.push(r);
  g.add(r, mesh(kit.sphere(14), m.clear, 0, 0, 0, 2.2, 2.2, 3.5), mesh(kit.ico(1, 1), m.glow, 0, 0, 0, 1));
  for (let i = 0; i < 3; i++) g.add(mesh(kit.cyl(0.1, 0.1, 6, 4), m.hull, 0, 0, 0).rotateZ((i / 3) * Math.PI));
  return { group: g, spin, flaps: [] };
}

function barge(kit, m, rng) {
  const g = pivot();
  g.add(mesh(kit.box(4.5, 2, 11), m.hull, 0, 0, 0), mesh(kit.box(3, 1.4, 3), m.dark, 0, 1.6, 3));
  for (let i = 0; i < 3; i++) g.add(mesh(kit.box(3.8, 1.6, 2), i % 2 ? m.dark : m.clear, 0, 1.8, -3 + i * 2.2));
  for (const s of [-1, 1]) g.add(mesh(kit.cyl(0.8, 0.8, 1.6, 8), m.glow, s * 1.6, 0, 6).rotateX(Math.PI / 2));
  g.add(mesh(kit.cone(1.4, 2.5, 4), m.hull, 0, 0, -6.6).rotateX(-Math.PI / 2));
  return { group: g, spin: [], flaps: [] };
}

function caravan(kit, m, rng) {
  const g = pivot();
  for (let i = 0; i < 3; i++) g.add(mesh(kit.cap(1.3, 2.2), i ? m.dark : m.hull, 0, 0, -4 + i * 4).rotateX(Math.PI / 2));
  g.add(mesh(kit.cyl(0.3, 0.3, 11, 6), m.hull, 0, -1, 0).rotateX(Math.PI / 2));
  g.add(mesh(kit.sphere(10), m.glow, 0, 0.8, -5.8, 0.6), mesh(kit.cyl(0.7, 0.4, 1.2, 8), m.glow, 0, 0, 6.2).rotateX(Math.PI / 2));
  return { group: g, spin: [], flaps: [] };
}

function freighter(kit, m, rng) {
  const g = pivot(), spin = [];
  g.add(mesh(kit.box(3, 3, 12), m.hull, 0, 0, 0), mesh(kit.box(4.5, 1, 4), m.dark, 0, -1.8, 2));
  for (const s of [-1, 1]) g.add(mesh(kit.box(0.3, 4, 2), m.glow, s * 1.7, 0.5, -5), mesh(kit.cyl(1, 1, 2, 10), m.dark, s * 2.4, 0, 5).rotateX(Math.PI / 2));
  const dish = pivot(0, 2, 0, mesh(kit.cyl(1.4, 0.2, 0.4, 10), m.dark));
  spin.push(dish);
  g.add(dish, mesh(kit.box(3.1, 0.4, 0.4), m.glow, 0, 1.3, -6));
  return { group: g, spin, flaps: [] };
}

export const HULLS_B = { prism, spore, wing, rock, seed, squid, junk, ring, barge, caravan, freighter };
