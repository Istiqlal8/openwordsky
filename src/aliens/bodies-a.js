// Body builders: Kaum Vorran (tall, elongated skull), Ksirr (four-armed insectoid), Aquor (frilled amphibian).
// All models face -Z, feet at y = 0; `rig.unit` is the model height before per-individual scaling.
import { mesh, pivot, limb, eyePair, newRig } from './body-kit.js';

export function buildVorran(kit, m, rng) {
  const rig = newRig();
  rig.unit = 2.7;
  const torso = pivot(0, 1.3, 0);
  torso.add(mesh(kit.cap(0.17, 0.62), m.skin, 0, 0.5, 0, 1.15, 1, 0.8));
  torso.add(mesh(kit.cone(0.34, 0.75, 14), m.dark, 0, 0.12, 0));          // robe skirt
  torso.add(mesh(kit.cyl(0.05, 0.06, 0.28), m.skin, 0, 0.95, 0));         // neck
  torso.add(mesh(kit.torus(0.16, 0.03), m.glow, 0, 0.78, 0, 1, 1, 1).rotateX(Math.PI / 2));
  rig.head = vorranHead(kit, m, rig);
  rig.head.position.set(0, 1.12, 0);
  torso.add(rig.head);
  for (const s of [-1, 1]) rig.arms.push(limb(kit, m.skin, s * 0.25, 0.78, 0, 0.045, 0.95));
  for (const a of rig.arms) a.children[0].add(mesh(kit.sphere(10), m.dark, 0, -0.55, 0, 0.06, 0.14, 0.04));
  torso.add(...rig.arms);
  rig.legs.push(limb(kit, m.skin, -0.11, 1.36, 0, 0.06, 1.18), limb(kit, m.skin, 0.11, 1.36, 0, 0.06, 1.18));
  rig.torso = torso;
  rig.root.add(torso, ...rig.legs);
  return rig;
}

function vorranHead(kit, m, rig) {
  const head = pivot();
  head.add(mesh(kit.sphere(), m.skin, 0, 0.08, 0, 0.14, 0.17, 0.15));
  const skull = mesh(kit.sphere(), m.skin, 0, 0.26, 0.16, 0.12, 0.13, 0.34);
  skull.rotation.x = -0.75;                                                 // swept-back crest
  head.add(skull, mesh(kit.sphere(8), m.glow, 0, 0.2, -0.13, 0.025));       // forehead gem
  rig.eyes = eyePair(kit, m, head, { x: 0.058, y: 0.1, z: -0.115, r: 0.04, glow: true });
  for (const e of rig.eyes) e.scale.set(0.05, 0.022, 0.03);
  return head;
}

export function buildKsirr(kit, m, rng) {
  const rig = newRig();
  rig.unit = 1.7;
  m.skin.metalness = 0.35;
  m.skin.roughness = 0.3;
  const torso = pivot(0, 0.82, 0);
  torso.add(mesh(kit.sphere(), m.skin, 0, 0.3, 0, 0.2, 0.3, 0.17));        // thorax
  const abdomen = mesh(kit.sphere(), m.dark, 0, 0.02, 0.32, 0.22, 0.2, 0.36);
  abdomen.rotation.x = 0.5;
  torso.add(abdomen, mesh(kit.torus(0.2, 0.025), m.skin, 0, 0.1, 0.3, 1, 1, 1).rotateX(1.1));
  rig.head = ksirrHead(kit, m, rig);
  rig.head.position.set(0, 0.68, -0.04);
  torso.add(rig.head);
  for (const [y, len, r] of [[0.48, 0.55, 0.045], [0.26, 0.42, 0.035]]) {
    for (const s of [-1, 1]) {
      const a = limb(kit, m.skin, s * 0.2, y, 0, r, len);
      a.children[0].add(mesh(kit.cone(0.04, 0.14, 6), m.dark, 0, -len / 2 - 0.08, 0).rotateX(Math.PI));
      rig.arms.push(a);
    }
  }
  torso.add(...rig.arms);
  rig.legs.push(ksirrLeg(kit, m, -0.12), ksirrLeg(kit, m, 0.12));
  rig.torso = torso;
  rig.root.add(torso, ...rig.legs);
  return rig;
}

function ksirrHead(kit, m, rig) {
  const head = pivot();
  head.add(mesh(kit.sphere(), m.skin, 0, 0, 0, 0.14, 0.13, 0.15));
  rig.eyes = [];
  for (const s of [-1, 1]) {
    const e = mesh(kit.ico(1, 2), m.glow, s * 0.09, 0.03, -0.07, 0.075, 0.09, 0.07); // faceted compound eye
    head.add(e);
    rig.eyes.push(e);
    head.add(mesh(kit.cone(0.02, 0.1, 6), m.dark, s * 0.04, -0.1, -0.1).rotateX(Math.PI * 0.8)); // mandible
    const ant = pivot(s * 0.05, 0.1, -0.05, mesh(kit.cyl(0.008, 0.012, 0.35, 5), m.dark, 0, 0.17, 0));
    ant.children[0].add(mesh(kit.sphere(8), m.glow, 0, 0.18, 0, 0.025));
    ant.rotation.set(-0.4, 0, s * -0.35);
    head.add(ant);
    rig.frills.push(ant);
  }
  rig.eyeGlowOnly = true;
  return head;
}

// Digitigrade leg: thigh forward, shin back, clawed foot.
function ksirrLeg(kit, m, x) {
  const hip = limb(kit, m.skin, x, 0.86, 0, 0.055, 0.42);
  const knee = limb(kit, m.dark, 0, -0.5, 0, 0.04, 0.36);
  knee.rotation.x = -0.55;
  hip.rotation.x = 0.3;
  knee.add(mesh(kit.cone(0.06, 0.16, 6), m.dark, 0, -0.44, -0.05).rotateX(-Math.PI / 2));
  hip.add(knee);
  hip.userData.base = 0.3;
  return hip;
}

export function buildAquor(kit, m, rng) {
  const rig = newRig();
  rig.unit = 1.75;
  const torso = pivot(0, 0.72, 0);
  torso.add(mesh(kit.sphere(), m.skin, 0, 0.32, 0, 0.3, 0.38, 0.26));
  torso.add(mesh(kit.sphere(), m.eye, 0, 0.26, -0.1, 0.22, 0.3, 0.18)); // pale belly
  for (let i = 0; i < 4; i++) torso.add(mesh(kit.cone(0.05, 0.16, 6), m.accent, 0, 0.55 - i * 0.14, 0.24 + i * 0.01).rotateX(-0.4));
  rig.head = aquorHead(kit, m, rig);
  rig.head.position.set(0, 0.78, -0.02);
  torso.add(rig.head);
  for (const s of [-1, 1]) {
    const a = limb(kit, m.skin, s * 0.3, 0.52, 0, 0.06, 0.45);
    a.children[0].add(mesh(kit.sphere(10), m.accent, 0, -0.32, 0, 0.1, 0.05, 0.1)); // webbed hand
    rig.arms.push(a);
  }
  torso.add(...rig.arms);
  for (const s of [-1, 1]) {
    const leg = limb(kit, m.skin, s * 0.15, 0.68, 0, 0.09, 0.5);
    leg.children[0].add(mesh(kit.sphere(10), m.skin, 0, -0.34, -0.1, 0.12, 0.04, 0.2));
    rig.legs.push(leg);
  }
  rig.torso = torso;
  rig.root.add(torso, ...rig.legs);
  return rig;
}

function aquorHead(kit, m, rig) {
  const head = pivot();
  head.add(mesh(kit.sphere(), m.skin, 0, 0.1, -0.04, 0.3, 0.19, 0.27));
  head.add(mesh(kit.sphere(), m.dark, 0, 0.04, -0.27, 0.16, 0.02, 0.04)); // wide mouth
  rig.eyes = eyePair(kit, m, head, { x: 0.15, y: 0.25, z: -0.14, r: 0.085 });
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const fin = pivot(s * 0.26, 0.14 + i * 0.04, 0.02 + i * 0.06);
      fin.add(mesh(kit.get('Circle', 0.3, 12, 0, Math.PI), m.accent, 0, 0, 0, 1, 0.8 - i * 0.15, 1));
      fin.rotation.set(0, s * 0.45, s * (-0.7 - i * 0.5)); // fanned out, facing forward
      head.add(fin);
      rig.frills.push(fin);
    }
  }
  return head;
}
