// Explorer-suit gear: helmet with a tinted visor, life-support pack, trim rings and a chest decal.
import { mesh, pivot, sphere, box, cyl, torus, octa, shell } from './parts.js';

const DOME = { bulat: 1, kubah: 1.14, tertutup: 1.02 };

// Helmet parts, in head space. The visor is see-through unless the helmet is 'tertutup'.
export function buildHelmet(look, mats) {
  const g = pivot();
  const sy = DOME[look.suit.helmet] ?? 1;
  g.add(mesh(sphere(0.25, 16), mats.visor, 0, 0.012, 0, 1, sy, 1));
  const back = mesh(shell(0.256, 0, Math.PI * 0.52, 14), mats.suit, 0, 0.012, 0, 1, sy, 1);
  back.rotation.x = 1.15;
  const collar = mesh(torus(0.2, 0.032), mats.trim, 0, -0.185, 0);
  collar.rotation.x = Math.PI / 2;
  g.add(back, collar, mesh(cyl(0.018, 0.018, 0.12), mats.suit, 0.2, 0.16, 0.1),
    mesh(sphere(0.03, 8), mats.trim, 0.2, 0.23, 0.1));
  return g;
}

function decal(look, mats) {
  const g = pivot(0.11, 1.26, -0.24);
  if (look.suit.decal === 'garis') g.add(mesh(box(0.055, 0.28, 0.04), mats.trim, -0.11, 0, 0));
  if (look.suit.decal === 'bintang') g.add(mesh(octa(0.07), mats.trim, 0, 0, 0, 1, 1, 0.4));
  if (look.suit.decal === 'bendera') g.add(mesh(box(0.14, 0.09, 0.03), mats.trim), mesh(box(0.14, 0.04, 0.035), mats.dark, 0, -0.025, 0));
  return g;
}

// Body-space suit parts: pack, chest decal, shoulder and knee trim.
export function buildSuitBody(look, mats, width) {
  const parts = [decal(look, mats)];
  if (look.suit.backpack) {
    const pack = pivot(0, 1.12, 0.27);
    pack.add(mesh(box(0.44, 0.54, 0.22), mats.dark), mesh(box(0.1, 0.42, 0.24), mats.trim, -0.14, 0, 0.01),
      mesh(cyl(0.05, 0.05, 0.2), mats.trim, 0.16, -0.06, 0.02));
    parts.push(pack);
  }
  for (const side of [-1, 1]) {
    const ring = mesh(torus(0.1, 0.028), mats.trim, side * 0.36 * width, 1.32, 0);
    ring.rotation.y = Math.PI / 2;
    parts.push(ring);
  }
  parts.push(mesh(box(0.34 * width, 0.05, 0.3 * width), mats.trim, 0, 0.86, 0));
  return parts;
}
