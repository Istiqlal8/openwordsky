// Alien ship hulls, one design language per race. Built in metres facing -Z; the caller scales
// them to space units. Returns { group, spin: [Object3D], flaps: [Object3D], mats: [Material] }.
import * as THREE from 'three';
import { hsl } from '../core/color.js';
import { mesh, pivot } from './body-kit.js';

function shipMats(race, rng) {
  const hue = rng.range(race.hue[0], race.hue[1]);
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.4, ...o });
  const hull = hsl(hue, 0.4, 0.58), dark = hsl(hue + 0.05, 0.3, 0.26);
  return {  // faint self-light keeps the night side readable against black space
    hull: std({ color: hull, emissive: hull, emissiveIntensity: 0.22 }),
    dark: std({ color: dark, emissive: dark, emissiveIntensity: 0.3 }),
    glow: std({ color: 0x111111, emissive: race.glow, emissiveIntensity: 2 }),
    clear: std({ color: new THREE.Color(race.glow).lerp(new THREE.Color(0xffffff), 0.4), transparent: true,
      opacity: 0.45, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }),
  };
}

function shard(kit, m, rng) {
  const g = pivot(), spin = [];
  m.hull.flatShading = true;
  Object.assign(m.hull, { metalness: 0.1, roughness: 0.15 });
  m.hull.emissive.copy(m.glow.emissive);
  m.hull.emissiveIntensity = 0.3;
  g.add(mesh(kit.get('Octahedron', 1, 0), m.hull, 0, 0, 0, 1.6, 1.6, 8));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4, s = rng.range(0.8, 1.3);
    const c = mesh(kit.get('Octahedron', 1, 0), m.hull, Math.cos(a) * 2, Math.sin(a) * 2, 3, 0.6 * s, 0.6 * s, 3.8 * s);
    c.rotation.set(Math.sin(a) * 0.35, -Math.cos(a) * 0.35, 0);
    g.add(c);
  }
  const core = mesh(kit.ico(1, 0), m.glow, 0, 0, 1.5, 0.9);
  spin.push(core);
  g.add(core, mesh(kit.get('Octahedron', 1, 0), m.clear, 0, 0, 1.5, 2.2, 2.2, 3));
  return { group: g, spin, flaps: [] };
}

function insect(kit, m, rng) {
  const g = pivot(), flaps = [];
  for (let i = 0; i < 3; i++) g.add(mesh(kit.sphere(12), i === 1 ? m.hull : m.dark, 0, 0, -4 + i * 3.6, 1.1, 0.9, 1.8 + i * 0.3));
  g.add(mesh(kit.sphere(10), m.glow, 0, 0.35, -5.3, 0.45, 0.35, 0.5));
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const leg = mesh(kit.cyl(0.06, 0.1, 4.5, 5), m.dark, s * 1.8, -0.9, -2 + k * 2);
      leg.rotation.set(0.25 * (k - 1), 0, s * 1.05);
      g.add(leg);
    }
    const wing = pivot(s * 0.6, 0.8, -0.5, mesh(kit.box(6, 0.05, 1.8), m.clear, s * 3.1, 0, 0));
    wing.userData.side = s;
    flaps.push(wing);
    g.add(wing, mesh(kit.cyl(0.35, 0.2, 1.5, 8), m.glow, s * 0.7, 0, 5.2).rotateX(Math.PI / 2));
  }
  return { group: g, spin: [], flaps };
}

function pod(kit, m, rng) {
  const g = pivot(), spin = [];
  Object.assign(m.hull, { metalness: 0.05, roughness: 0.55 });
  g.add(mesh(kit.sphere(20), m.hull, 0, 0, 0, 2.6, 2.4, 5));
  for (let i = 0; i < 4; i++) g.add(mesh(kit.torus(1, 0.07), m.glow, 0, 0, -3 + i * 2, 2.3 - Math.abs(i - 1.5) * 0.4, 2.1 - Math.abs(i - 1.5) * 0.4, 1));
  for (let i = 0; i < 5; i++) {
    const a = rng.range(0, Math.PI * 2);
    g.add(mesh(kit.sphere(10), m.dark, Math.cos(a) * 2.2, Math.sin(a) * 2, rng.range(-3, 3), rng.range(0.6, 1.1)));
  }
  const tails = pivot(0, 0, 4.5);
  for (let i = 0; i < 3; i++) tails.add(mesh(kit.cone(0.35, 5, 6), m.dark, (i - 1) * 0.8, 0, 2.2).rotateX(Math.PI / 2));
  spin.push(tails);
  g.add(tails, mesh(kit.sphere(12), m.glow, 0, 0, -4.8, 0.9));
  return { group: g, spin, flaps: [] };
}

function saucer(kit, m, rng) {
  const g = pivot(), spin = [];
  g.add(mesh(kit.sphere(28), m.hull, 0, 0, 0, 6.5, 1.1, 6.5));
  g.add(mesh(kit.get('Sphere', 1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.clear, 0, 0.6, 0, 2.4, 1.7, 2.4));
  g.add(mesh(kit.sphere(12), m.glow, 0, 0.8, 0, 0.9));
  const ring = pivot();
  ring.add(mesh(kit.torus(1, 0.05), m.dark, 0, 0, 0, 8, 8, 5).rotateX(Math.PI / 2));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ring.add(mesh(kit.sphere(8), m.glow, Math.cos(a) * 8, 0, Math.sin(a) * 8, 0.45));
  }
  spin.push(ring);
  g.add(ring);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(mesh(kit.sphere(8), m.glow, Math.cos(a) * 3.5, -0.8, Math.sin(a) * 3.5, 0.4, 0.2, 0.4));
  }
  return { group: g, spin, flaps: [] };
}

function manta(kit, m, rng) {
  const g = pivot(), flaps = [];
  g.add(mesh(kit.sphere(20), m.hull, 0, 0, 0, 2.2, 1, 5));
  for (const s of [-1, 1]) {
    const wing = pivot(s * 1.5, 0, 0.5);
    wing.add(mesh(kit.sphere(16), m.hull, s * 3.5, 0, 0.6, 4.2, 0.35, 2.8));
    wing.add(mesh(kit.sphere(8), m.glow, s * 7.3, 0, 1.4, 0.4));
    wing.userData.side = s;
    flaps.push(wing);
    g.add(wing, mesh(kit.cone(0.4, 2, 6), m.dark, s * 0.9, 0.2, -4.6).rotateX(-Math.PI / 2)); // head horns
  }
  g.add(mesh(kit.cone(0.3, 9, 6), m.dark, 0, 0, 8.5).rotateX(Math.PI / 2));
  g.add(mesh(kit.sphere(12), m.glow, 0, 0.7, -2, 0.8, 0.4, 1.4));
  return { group: g, spin: [], flaps };
}

const HULLS = { shard, insect, pod, saucer, manta };

export function buildAlienShip(kit, race, rng) {
  const m = shipMats(race, rng);
  const out = HULLS[race.ship](kit, m, rng);
  out.mats = Object.values(m);
  return out;
}
