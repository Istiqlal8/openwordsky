// Alien village buildings, one architectural style per race. Each builder returns
// { group, r } with the base at y = 0 (sunk slightly by the caller) and footprint radius r.
import * as THREE from 'three';
import { hsl } from '../core/color.js';
import { mesh, pivot } from './body-kit.js';
import { BUILDING_B } from './outpost-buildings-b.js';
import { BUILDING_C } from './outpost-buildings-c.js';

// Shared outpost materials (one set per village).
export function outpostMats(race, rng) {
  const hue = rng.range(race.hue[0], race.hue[1]);
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.6, ...o });
  const mats = {
    wall: std({ color: hsl(hue, 0.25, 0.62) }),
    trim: std({ color: hsl(hue + 0.08, 0.4, 0.3), metalness: 0.3 }),
    glow: std({ color: 0x111111, emissive: race.glow, emissiveIntensity: 1.8 }),
    glass: std({ color: new THREE.Color(race.glow).lerp(new THREE.Color(0xffffff), 0.5), transparent: true,
      opacity: 0.35, roughness: 0.08, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide }),
  };
  if (race.building === 'tech' || race.building === 'tower') Object.assign(mats.wall, { metalness: 0.35, roughness: 0.35 });
  if (race.building === 'hive') {
    Object.assign(mats.wall, { metalness: 0.25, roughness: 0.3 });
    mats.wall.color.set(hsl(hue + 0.12, 0.45, 0.36));
  }
  mats.all = Object.values(mats);
  return mats;
}

function spire(kit, m, rng) {
  const g = pivot(), h = rng.range(9, 18);
  g.add(mesh(kit.cyl(0.35, 1.6, h, 8), m.wall, 0, h / 2, 0));
  g.add(mesh(kit.cone(0.5, 3.5, 8), m.trim, 0, h + 1.6, 0));
  g.add(mesh(kit.ico(1, 0), m.glow, 0, h + 4, 0, 0.55, 1.1, 0.55));
  for (let y = 2.5; y < h; y += 3.2) {
    const k = 1.55 - (y / h) * 1.1;
    g.add(mesh(kit.torus(1, 0.08), m.glow, 0, y, 0, k, k, 1).rotateX(Math.PI / 2));
  }
  if (rng.chance(0.6)) {
    const hall = mesh(kit.sphere(20), m.wall, 3.2, 0, 0, 3, 2.6, 3);
    g.add(hall, mesh(kit.box(1.2, 1.9, 0.6), m.trim, 3.2, 0.95, -2.8));
  }
  return { group: g, r: 6.5 };
}

// Ksirr hive: tall ribbed chitin mound with glowing cells and pods on stalks.
function hive(kit, m, rng) {
  const g = pivot(), n = 3 + rng.int(2);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const s = 2.8 - i * 0.55, hgt = 1.9 - i * 0.2;
    g.add(mesh(kit.sphere(16), m.wall, 0, y + hgt, 0, s, hgt * 1.25, s));
    g.add(mesh(kit.torus(1, 0.1), m.trim, 0, y + hgt * 1.9, 0, s * 0.85, s * 0.85, 1).rotateX(Math.PI / 2));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + i;
      g.add(mesh(kit.get('Sphere', 1, 6, 4), m.glow, Math.cos(a) * s * 0.95, y + hgt, Math.sin(a) * s * 0.95, 0.28, 0.4, 0.28));
    }
    y += hgt * 1.8;
  }
  g.add(mesh(kit.cone(0.9, 3.2, 8), m.wall, 0, y + 1.4, 0), mesh(kit.sphere(8), m.glow, 0, y + 3.2, 0, 0.3));
  for (let k = 0; k < 2; k++) {
    const a = rng.range(0, Math.PI * 2), stalk = rng.range(2.5, 4.5);
    const pod = pivot(Math.cos(a) * 3.4, 0, Math.sin(a) * 3.4, mesh(kit.cyl(0.12, 0.2, stalk, 6), m.trim, 0, stalk / 2, 0));
    pod.add(mesh(kit.sphere(12), m.wall, 0, stalk + 0.7, 0, 0.9, 1.1, 0.9), mesh(kit.sphere(8), m.glow, 0, stalk + 0.7, -0.75, 0.3));
    g.add(pod);
  }
  g.add(mesh(kit.sphere(12), m.trim, 0, 1.0, -2.6, 0.9, 1.2, 0.5)); // entrance
  return { group: g, r: 4.8 };
}

function bubble(kit, m, rng) {
  const g = pivot(), n = 2 + rng.int(3);
  for (let i = 0; i < n; i++) {
    const s = rng.range(1.8, 3.6), a = (i / n) * Math.PI * 2, d = i ? s * 0.9 : 0;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const dome = mesh(kit.sphere(24), m.glass, x, s * 0.55, z, s);
    dome.renderOrder = 2;
    g.add(dome, mesh(kit.sphere(12), m.glow, x, s * 0.5, z, s * 0.28));
    g.add(mesh(kit.torus(1, 0.12), m.trim, x, 0.15, z, s, s, 1).rotateX(Math.PI / 2));
  }
  return { group: g, r: 6 };
}

function tech(kit, m, rng) {
  const g = pivot(), s = rng.range(3, 4.5);
  g.add(mesh(kit.cyl(s, s * 1.05, 1.6, 16), m.trim, 0, 0.8, 0));
  g.add(mesh(kit.get('Sphere', 1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.wall, 0, 1.6, 0, s, s * 0.75, s));
  g.add(mesh(kit.torus(1, 0.1), m.glow, 0, 1.65, 0, s * 1.01, s * 1.01, 1).rotateX(Math.PI / 2));
  const mast = pivot(s * 0.4, s * 0.7 + 1.6, 0);
  mast.add(mesh(kit.cyl(0.08, 0.12, 5, 6), m.trim, 0, 2.5, 0), mesh(kit.sphere(8), m.glow, 0, 5.1, 0, 0.25));
  const dish = mesh(kit.get('Sphere', 1, 16, 8, 0, Math.PI * 2, 0, 0.9), m.wall, 0, 3.4, 0, 1.2, 0.5, 1.2);
  dish.rotation.x = 2.3;
  mast.add(dish);
  g.add(mast);
  g.userData.spin = dish;
  g.add(mesh(kit.box(1.4, 1.8, 0.4), m.glow, 0, 0.9, -s * 1.02));
  return { group: g, r: s + 1.5 };
}

function reed(kit, m, rng) {
  const g = pivot(), s = rng.range(2.4, 3.4), lift = rng.range(1.2, 2.2);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.78;
    g.add(mesh(kit.cyl(0.12, 0.16, lift + 0.4, 6), m.trim, Math.cos(a) * s * 0.7, lift / 2, Math.sin(a) * s * 0.7));
  }
  g.add(mesh(kit.cyl(s, s * 0.9, 2.2, 10), m.wall, 0, lift + 1.1, 0));
  g.add(mesh(kit.cone(s * 1.35, s * 1.3, 10), m.trim, 0, lift + 2.2 + s * 0.65, 0));
  for (const side of [-1, 1]) {
    const sail = mesh(kit.get('Circle', s * 0.9, 12, 0, Math.PI), m.glass, side * s * 0.95, lift + 2.4, 0);
    sail.rotation.set(0, Math.PI / 2, side * 0.4);
    g.add(sail);
  }
  g.add(mesh(kit.sphere(10), m.glow, 0, lift + 0.7, -s * 1.05, 0.3, 0.45, 0.3));
  return { group: g, r: s + 1.2 };
}

export const BUILDING = { spire, hive, bubble, tech, reed, ...BUILDING_B, ...BUILDING_C };
