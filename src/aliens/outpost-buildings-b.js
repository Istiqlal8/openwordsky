// More race building styles: crystal clusters, mushroom houses, perch nests, rune monoliths,
// tree houses and spiral shells. Each returns { group, r } with the base at y = 0.
import { mesh, pivot } from './body-kit.js';

const oct = (kit) => kit.get('Octahedron', 1, 0);

// Kristalin: cluster of tall glowing crystal pillars.
function crystal(kit, m, rng) {
  const g = pivot(), n = 5 + rng.int(4);
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, Math.PI * 2), d = i ? rng.range(1.2, 3.2) : 0, h = i ? rng.range(3, 8) : rng.range(9, 14);
    const c = mesh(oct(kit), i % 3 ? m.glass : m.wall, Math.cos(a) * d, h * 0.45, Math.sin(a) * d, h * 0.14, h / 2, h * 0.14);
    c.rotation.set(rng.range(-0.25, 0.25), 0, rng.range(-0.25, 0.25));
    g.add(c);
  }
  g.add(mesh(kit.ico(1, 1), m.glow, 0, 2.2, 0, 0.8), mesh(kit.box(1.4, 2, 0.4), m.trim, 0, 1, -3.2));
  return { group: g, r: 4.5 };
}

// Mikoni: giant mushroom with a round door and windows in the stalk.
function shroom(kit, m, rng) {
  const g = pivot(), h = rng.range(5, 8), cap = rng.range(3.5, 5);
  g.add(mesh(kit.cyl(1.6, 2.1, h, 12), m.wall, 0, h / 2, 0));
  g.add(mesh(kit.get('Sphere', 1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.trim, 0, h - 0.4, 0, cap, cap * 0.55, cap));
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9, r = cap * (0.4 + (i % 3) * 0.18);
    g.add(mesh(kit.sphere(8), m.wall, Math.cos(a) * r, h - 0.4 + cap * 0.55 * Math.sqrt(1 - (r / cap) ** 2), Math.sin(a) * r, 0.45, 0.2, 0.45));
  }
  g.add(mesh(kit.cyl(0.8, 0.8, 0.2, 12), m.glow, 0, 1.1, -1.95).rotateX(Math.PI / 2));
  g.add(mesh(kit.sphere(8), m.glow, 1.3, h * 0.6, -1.2, 0.35));
  return { group: g, r: cap * 0.8 };
}

// Aveli: tall perch tower with round nests at several heights.
function nest(kit, m, rng) {
  const g = pivot(), h = rng.range(10, 16);
  g.add(mesh(kit.cyl(0.4, 0.8, h, 8), m.trim, 0, h / 2, 0));
  for (let i = 0; i < 3; i++) {
    const y = h * (0.45 + i * 0.25), a = i * 2.1, d = i === 2 ? 0 : 1.6;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    g.add(mesh(kit.torus(1, 0.35), m.wall, x, y, z, 1.8 - i * 0.3, 1.8 - i * 0.3, 1.2).rotateX(Math.PI / 2));
    g.add(mesh(kit.get('Sphere', 1, 12, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m.wall, x, y + 0.2, z, 1.8 - i * 0.3, 1, 1.8 - i * 0.3));
    g.add(mesh(kit.sphere(8), m.glow, x, y + 0.5, z, 0.3));
  }
  g.add(mesh(kit.cone(1.4, 1.5, 8), m.trim, 0, 0.75, 0), mesh(kit.box(1, 1.6, 0.4), m.glow, 0, 0.8, -1.1));
  return { group: g, r: 4 };
}

// Batugar: standing stones around a rune-lit monolith hall.
function monolith(kit, m, rng) {
  const g = pivot(), h = rng.range(8, 12);
  const dodeca = kit.get('Dodecahedron', 1, 0);
  g.add(mesh(kit.box(3.4, h, 2.4), m.wall, 0, h / 2, 0), mesh(kit.box(4, 0.8, 3), m.trim, 0, h + 0.4, 0));
  for (let y = 1.5; y < h - 1; y += 2.2) g.add(mesh(kit.box(0.2, 1.2, 0.05), m.glow, rng.range(-1, 1), y, -1.23));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.6, s = rng.range(0.8, 1.4);
    g.add(mesh(dodeca, m.trim, Math.cos(a) * 4, s * 1.4, Math.sin(a) * 4, s * 0.7, s * 1.6, s * 0.7));
  }
  g.add(mesh(kit.box(1.4, 2.4, 0.3), m.glow, 0, 1.2, -1.3));
  return { group: g, r: 5 };
}

// Rimbuna: tree house on a thick trunk with a round leafy crown and a ladder.
function grove(kit, m, rng) {
  const g = pivot(), h = rng.range(6, 9);
  g.add(mesh(kit.cyl(1.0, 1.6, h, 9), m.trim, 0, h / 2, 0));
  g.add(mesh(kit.cyl(3, 3, 2.2, 10), m.wall, 0, h + 1.1, 0), mesh(kit.cone(3.6, 2.2, 10), m.trim, 0, h + 3.3, 0));
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57 + 0.4;
    g.add(mesh(kit.ico(1, 1), m.glass, Math.cos(a) * 2.6, h + 4 + (i % 2), Math.sin(a) * 2.6, 2.1));
  }
  for (let i = 0; i < 4; i++) g.add(mesh(kit.cone(0.4, 2.4, 6), m.trim, Math.cos(i * 1.57) * 1.8, 0.6, Math.sin(i * 1.57) * 1.8).rotateZ(Math.PI / 2 + i));
  g.add(mesh(kit.box(0.6, h, 0.1), m.trim, 0, h / 2, -1.7), mesh(kit.sphere(8), m.glow, 0, h + 1.1, -3.05, 0.4));
  return { group: g, r: 4 };
}

// Tintari: spiral shell house with a glowing mouth.
function shell(kit, m, rng) {
  const g = pivot(), s = rng.range(2.4, 3.4);
  for (let i = 0; i < 5; i++) {
    const k = s * (1 - i * 0.17);
    g.add(mesh(kit.sphere(14), i % 2 ? m.trim : m.wall, i * 0.25, k * 0.8 + i * k * 0.7, i * 0.2, k, k * 0.8, k));
  }
  g.add(mesh(kit.cone(0.3, 2, 8), m.trim, 1.2, s * 4.4, 1, 1, 1, 1));
  g.add(mesh(kit.sphere(12), m.glow, 0, s * 0.6, -s * 0.9, s * 0.5, s * 0.45, 0.3));
  return { group: g, r: s + 1 };
}

export const BUILDING_B = { crystal, shroom, nest, monolith, grove, shell };
