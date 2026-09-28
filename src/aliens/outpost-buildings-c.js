// More race building styles: tinkerer workshops, light obelisks, bazaar tents, nomad yurts and
// neon merchant towers. Each returns { group, r } with the base at y = 0.
import { mesh, pivot } from './body-kit.js';

// Kribo: boxy workshop with chimneys and a spinning gear wheel.
function workshop(kit, m, rng) {
  const g = pivot(), w = rng.range(5, 7), d = rng.range(4, 5.5);
  g.add(mesh(kit.box(w, 3.2, d), m.wall, 0, 1.6, 0), mesh(kit.box(w + 0.4, 0.3, d + 0.4), m.trim, 0, 3.35, 0));
  g.add(mesh(kit.box(w * 0.5, 2, d * 0.6), m.wall, w * 0.15, 4.4, 0));
  for (const x of [-w * 0.35, -w * 0.2]) g.add(mesh(kit.cyl(0.25, 0.3, 3, 8), m.trim, x, 4.8, d * 0.2), mesh(kit.sphere(6), m.glow, x, 6.4, d * 0.2, 0.25));
  const gear = pivot(w / 2 + 0.2, 3.4, 0, mesh(kit.torus(1, 0.25), m.trim, 0, 0, 0, 1.3, 1.3, 1));
  for (let i = 0; i < 8; i++) gear.add(mesh(kit.box(0.3, 0.6, 0.3), m.trim, Math.cos(i * 0.785) * 1.6, Math.sin(i * 0.785) * 1.6, 0).rotateZ(i * 0.785));
  gear.rotation.y = Math.PI / 2;
  g.add(gear, mesh(kit.box(1.6, 2, 0.3), m.glow, 0, 1, -d / 2 - 0.1));
  g.userData.spin = gear;
  return { group: g, r: Math.max(w, d) * 0.6 + 0.8 };
}

// Lumari: tall hollow light obelisk inside floating rings.
function obelisk(kit, m, rng) {
  const g = pivot(), h = rng.range(12, 18);
  g.add(mesh(kit.cyl(0.6, 1.4, h, 4), m.glass, 0, h / 2, 0), mesh(kit.cyl(0.25, 0.5, h * 0.9, 4), m.glow, 0, h * 0.45, 0));
  for (let i = 0; i < 3; i++) g.add(mesh(kit.torus(1, 0.05), m.glow, 0, h * (0.3 + i * 0.25), 0, 2.4 - i * 0.5, 2.4 - i * 0.5, 1).rotateX(Math.PI / 2 + i * 0.2));
  g.add(mesh(kit.cyl(2.8, 3.2, 0.5, 8), m.trim, 0, 0.25, 0), mesh(kit.ico(1, 0), m.glow, 0, h + 1.2, 0, 0.7));
  return { group: g, r: 3.5 };
}

// Saurak: striped bazaar tent with a hanging lantern.
function bazaar(kit, m, rng) {
  const g = pivot(), s = rng.range(3, 4.2);
  g.add(mesh(kit.cyl(s, s, 2.4, 8), m.wall, 0, 1.2, 0), mesh(kit.cone(s * 1.2, s, 8), m.trim, 0, 2.4 + s / 2, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(mesh(kit.cyl(0.08, 0.1, 2.6, 5), m.trim, Math.cos(a) * s * 1.15, 1.3, Math.sin(a) * s * 1.15));
  }
  g.add(mesh(kit.box(2.4, 0.9, 0.7), m.trim, 0, 0.45, -s - 0.6), mesh(kit.sphere(8), m.glow, 0, 2.2, -s - 0.6, 0.35));
  g.add(mesh(kit.cyl(0.05, 0.05, 1.5, 4), m.trim, 0, 2.4 + s, 0), mesh(kit.sphere(8), m.glow, 0, 3.3 + s, 0, 0.25));
  return { group: g, r: s + 1.2 };
}

// Wolla: round felt yurt with a smoke hole and a pack animal cart.
function yurt(kit, m, rng) {
  const g = pivot(), s = rng.range(3, 4);
  g.add(mesh(kit.cyl(s, s, 2, 12), m.wall, 0, 1, 0), mesh(kit.cone(s * 1.1, 1.8, 12), m.trim, 0, 2.9, 0));
  g.add(mesh(kit.torus(1, 0.08), m.glow, 0, 1.6, 0, s * 1.01, s * 1.01, 1).rotateX(Math.PI / 2));
  g.add(mesh(kit.cyl(0.35, 0.35, 0.6, 8), m.trim, 0, 3.9, 0), mesh(kit.box(1.2, 1.7, 0.3), m.glow, 0, 0.85, -s - 0.05));
  const cart = pivot(s + 1.6, 0, 0.8, mesh(kit.box(1.4, 0.8, 2.2), m.trim, 0, 0.9, 0));
  for (const z of [-0.8, 0.8]) cart.add(mesh(kit.cyl(0.45, 0.45, 1.6, 10), m.wall, 0, 0.45, z).rotateZ(Math.PI / 2));
  g.add(cart);
  return { group: g, r: s + 1.5 };
}

// Nexar: slim merchant tower with stacked glowing bands and a rooftop antenna.
function tower(kit, m, rng) {
  const g = pivot(), h = rng.range(12, 20), w = rng.range(2.6, 3.6);
  g.add(mesh(kit.box(w, h, w), m.wall, 0, h / 2, 0), mesh(kit.box(w * 1.3, 2.6, w * 1.3), m.trim, 0, 1.3, 0));
  for (let y = 4; y < h - 1; y += 2.5) g.add(mesh(kit.box(w + 0.1, 0.2, w + 0.1), m.glow, 0, y, 0));
  g.add(mesh(kit.cyl(0.06, 0.1, 5, 5), m.trim, 0, h + 2.5, 0), mesh(kit.sphere(8), m.glow, 0, h + 5, 0, 0.3));
  const dish = pivot(w * 0.3, h + 0.6, 0, mesh(kit.get('Sphere', 1, 12, 6, 0, Math.PI * 2, 0, 0.9), m.trim, 0, 0, 0, 1, 0.4, 1));
  dish.children[0].rotation.x = 2.3;
  g.add(dish, mesh(kit.box(1.4, 2, 0.3), m.glow, 0, 1, -w * 0.65 - 0.2));
  g.userData.spin = dish;
  return { group: g, r: w * 0.9 + 0.5 };
}

export const BUILDING_C = { workshop, obelisk, bazaar, yurt, tower };
