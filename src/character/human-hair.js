// Hair styles and hats, built as two groups parented to the head (casual clothing only).
import { mesh, pivot, sphere, box, cyl, cone, shell } from './parts.js';

// Hair cap: a top shell tilted back so the hairline sits above the brows, plus a patch for the nape.
function cap(mats, sy = 0.9, r = 0.205) {
  const g = pivot(0, 0.005, 0);
  const top = mesh(shell(r, 0, Math.PI * 0.5), mats.hair, 0, 0, 0, 1, sy, 1);
  top.rotation.x = 0.35;
  const nape = mesh(shell(r * 1.01, 0, Math.PI * 0.45), mats.hair, 0, 0, 0, 1, sy, 1);
  nape.rotation.x = 1.3;
  g.add(top, nape);
  return g;
}

const STYLES = {
  pendek: (g, m) => g.add(cap(m)),
  jambul: (g, m) => {
    const tuft = mesh(box(0.16, 0.1, 0.1), m.hair, 0, 0.19, -0.075);
    tuft.rotation.x = -0.45;
    g.add(cap(m, 0.85), tuft);
  },
  kuncir: (g, m) => g.add(cap(m, 0.85), mesh(sphere(0.085, 10), m.hair, 0, 0.02, 0.19),
    mesh(cyl(0.05, 0.028, 0.26), m.hair, 0, -0.13, 0.22)),
  panjang: (g, m) => {
    g.add(cap(m, 0.95), mesh(box(0.23, 0.32, 0.09), m.hair, 0, -0.13, 0.145));
    for (const side of [-1, 1]) g.add(mesh(box(0.07, 0.3, 0.13), m.hair, side * 0.17, -0.12, 0.03));
  },
  keriting: (g, m) => {
    g.add(cap(m, 1, 0.215));
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI * 0.55 + (i / 5) * Math.PI * 1.1; // sides and back only: never over the face
      g.add(mesh(sphere(0.075, 8), m.hair, Math.sin(a) * 0.16, 0.08 + (i % 2) * 0.06, Math.cos(a) * 0.16));
    }
  },
};

const HATS = {
  topi: (g, m) => {
    const brim = mesh(box(0.25, 0.022, 0.17), m.hat, 0, 0.115, -0.2);
    brim.rotation.x = -0.12;
    g.add(mesh(cyl(0.185, 0.2, 0.11), m.hat, 0, 0.16, 0), brim);
  },
  peci: (g, m) => g.add(mesh(cyl(0.175, 0.185, 0.15), m.hat, 0, 0.19, 0)),
  hijab: (g, m) => {
    const wrap = mesh(shell(0.235, 0, Math.PI * 0.54, 16), m.hat, 0, 0.01, 0.01, 1, 1.06, 1);
    wrap.rotation.x = 0.57;                                   // open at the face, closed at the nape
    g.add(wrap, mesh(cone(0.27, 0.36, 12), m.hat, 0, -0.24, 0.02));
  },
  hood: (g, m) => {
    const hood = mesh(shell(0.265, 0, Math.PI * 0.54), m.hat, 0, -0.01, 0.04, 1, 1, 1.12);
    hood.rotation.x = 0.55;
    g.add(hood);
  },
};

// { hair, hat }: two groups, already positioned in head space.
export function buildHairAndHat(look, mats) {
  const hair = pivot(), hat = pivot();
  STYLES[look.hair.style]?.(hair, mats);
  HATS[look.casual.hat]?.(hat, mats);
  if (look.casual.hat === 'hijab') hair.visible = false; // covered
  return { hair, hat };
}
