// Body builders: Saurak (reptilian trader), Wolla (furry nomad with backpack), Nexar (cyborg
// merchant, half flesh half machine). Models face -Z, feet at y = 0.
import { mesh, pivot, limb, eyePair, newRig } from './body-kit.js';

export function buildSaurak(kit, m, rng) {
  const rig = newRig();
  rig.unit = 2.2;
  const torso = pivot(0, 1.0, 0);
  torso.add(mesh(kit.sphere(10), m.skin, 0, 0.4, 0.05, 0.26, 0.42, 0.24).rotateX(0.2));
  torso.add(mesh(kit.cyl(0.28, 0.26, 0.42, 10), m.accent, 0, 0.42, 0.05));
  torso.add(mesh(kit.box(0.18, 0.2, 0.1), m.dark, 0.3, 0.1, 0.05));
  for (let i = 0; i < 4; i++) torso.add(mesh(kit.cone(0.04, 0.14, 5), m.dark, 0, 0.72 - i * 0.16, 0.26 + i * 0.02).rotateX(-0.5));
  const tail = pivot(0, 0.05, 0.2, mesh(kit.cone(0.13, 0.95, 8), m.skin, 0, -0.1, 0.45).rotateX(Math.PI / 2 + 0.3));
  torso.add(tail);
  rig.frills.push(tail);
  rig.head = saurakHead(kit, m, rig);
  rig.head.position.set(0, 0.85, -0.08);
  torso.add(rig.head);
  for (const s of [-1, 1]) {
    const a = limb(kit, m.skin, s * 0.3, 0.62, 0, 0.05, 0.58);
    a.children[0].add(mesh(kit.cone(0.035, 0.12, 5), m.dark, 0, -0.42, -0.03).rotateX(Math.PI));
    rig.arms.push(a);
    rig.legs.push(saurakLeg(kit, m, s * 0.14));
  }
  torso.add(...rig.arms);
  rig.torso = torso;
  rig.root.add(torso, ...rig.legs);
  return rig;
}

function saurakHead(kit, m, rig) {
  const head = pivot(0, 0, 0, mesh(kit.sphere(10), m.skin, 0, 0.04, 0, 0.14, 0.13, 0.16));
  head.add(mesh(kit.sphere(8), m.skin, 0, -0.01, -0.18, 0.09, 0.08, 0.16), mesh(kit.box(0.12, 0.02, 0.2), m.dark, 0, -0.06, -0.18));
  rig.eyes = eyePair(kit, m, head, { x: 0.09, y: 0.08, z: -0.09, r: 0.04 });
  for (const e of rig.eyes) { e.material = m.glow; e.children[0].scale.set(0.15, 0.9, 0.5); }
  for (let i = 0; i < 3; i++) {
    const c = pivot(0, 0.15, 0.02 + i * 0.07, mesh(kit.cone(0.04, 0.22 - i * 0.04, 5), m.accent, 0, 0.1, 0));
    c.rotation.x = 0.6;
    head.add(c);
    rig.frills.push(c);
  }
  return head;
}

// Digitigrade leg: thigh forward, shin back, clawed foot.
function saurakLeg(kit, m, x) {
  const hip = limb(kit, m.skin, x, 1.02, 0, 0.07, 0.45);
  const knee = limb(kit, m.dark, 0, -0.55, 0, 0.05, 0.38);
  knee.rotation.x = -0.55;
  knee.add(mesh(kit.cone(0.07, 0.18, 6), m.dark, 0, -0.46, -0.06).rotateX(-Math.PI / 2));
  hip.add(knee);
  hip.rotation.x = 0.3;
  hip.userData.base = 0.3;
  return hip;
}

export function buildWolla(kit, m, rng) {
  const rig = newRig();
  rig.unit = 2.1;
  m.skin.color.setHSL(rng.range(0.05, 0.11), 0.4, rng.range(0.42, 0.6));
  m.skin.roughness = 1;
  const torso = pivot(0, 0.75, 0);
  torso.add(mesh(kit.sphere(10), m.skin, 0, 0.45, 0, 0.42, 0.5, 0.38));
  for (let i = 0; i < 5; i++) torso.add(mesh(kit.sphere(8), m.skin, Math.cos(i * 1.3) * 0.36, 0.2 + i * 0.12, Math.sin(i * 1.3) * 0.3, 0.14));
  torso.add(mesh(kit.torus(1, 0.1), m.accent, 0, 0.88, 0, 0.26, 0.26, 0.5).rotateX(Math.PI / 2));
  torso.add(mesh(kit.box(0.5, 0.55, 0.25), m.dark, 0, 0.5, 0.42));
  torso.add(mesh(kit.cyl(0.1, 0.1, 0.6, 8), m.accent, 0, 0.86, 0.42).rotateZ(Math.PI / 2));
  torso.add(mesh(kit.sphere(8), m.glow, 0.28, 0.25, 0.5, 0.06));
  rig.head = wollaHead(kit, m, rig);
  rig.head.position.set(0, 1.0, -0.05);
  torso.add(rig.head);
  for (const s of [-1, 1]) {
    rig.arms.push(limb(kit, m.skin, s * 0.42, 0.62, 0, 0.09, 0.4));
    const leg = limb(kit, m.skin, s * 0.17, 0.78, 0, 0.1, 0.45);
    leg.children[0].add(mesh(kit.sphere(8), m.dark, 0, -0.3, -0.06, 0.13, 0.07, 0.18));
    rig.legs.push(leg);
  }
  torso.add(...rig.arms);
  rig.torso = torso;
  rig.root.add(torso, ...rig.legs);
  return rig;
}

function wollaHead(kit, m, rig) {
  const head = pivot(0, 0, 0, mesh(kit.sphere(10), m.skin, 0, 0.05, 0, 0.25));
  head.add(mesh(kit.sphere(8), m.eye, 0, -0.02, -0.2, 0.12, 0.09, 0.1), mesh(kit.sphere(8), m.dark, 0, 0.02, -0.3, 0.04));
  for (const s of [-1, 1]) {
    head.add(mesh(kit.cone(0.05, 0.3, 6), m.dark, s * 0.18, 0.28, 0).rotateZ(s * -0.6));
    const ear = pivot(s * 0.22, 0.05, 0.02, mesh(kit.sphere(8), m.skin, s * 0.1, -0.12, 0, 0.06, 0.2, 0.05));
    ear.rotation.z = s * 0.4;
    head.add(ear);
    rig.frills.push(ear);
  }
  rig.eyes = eyePair(kit, m, head, { x: 0.1, y: 0.08, z: -0.2, r: 0.045 });
  return head;
}

export function buildNexar(kit, m, rng) {
  const rig = newRig();
  rig.unit = 2.0;
  Object.assign(m.dark, { metalness: 0.7, roughness: 0.3 });
  m.dark.color.setHSL(0.6, 0.06, 0.4);
  m.accent.color.setHSL(rng.range(0, 1), 0.3, 0.2);
  const torso = pivot(0, 1.0, 0);
  torso.add(mesh(kit.cap(0.2, 0.4), m.accent, 0, 0.42, 0, 1.2, 1, 0.8), mesh(kit.cone(0.32, 0.8, 10), m.accent, 0, -0.05, 0));
  torso.add(mesh(kit.torus(1, 0.06), m.dark, 0, 0.18, 0, 0.23, 0.23, 0.5).rotateX(Math.PI / 2));
  torso.add(mesh(kit.box(0.12, 0.06, 0.03), m.glow, -0.08, 0.55, -0.17), mesh(kit.sphere(8), m.dark, 0.28, 0.74, 0, 0.14, 0.1, 0.14));
  rig.head = nexarHead(kit, m, rig);
  rig.head.position.set(0, 0.9, 0);
  torso.add(rig.head);
  const left = limb(kit, m.accent, -0.3, 0.68, 0, 0.05, 0.6);
  left.children[0].add(mesh(kit.sphere(8), m.skin, 0, -0.38, 0, 0.06));
  const right = limb(kit, m.dark, 0.32, 0.68, 0, 0.055, 0.6);
  right.children[0].add(mesh(kit.sphere(8), m.glow, 0, 0, 0, 0.07), mesh(kit.box(0.1, 0.14, 0.08), m.dark, 0, -0.4, 0));
  rig.arms.push(left, right);
  torso.add(...rig.arms);
  for (const s of [-1, 1]) {
    const leg = limb(kit, m.dark, s * 0.12, 1.0, 0, 0.065, 0.85);
    leg.children[0].add(mesh(kit.box(0.14, 0.1, 0.26), m.accent, 0, -0.5, -0.04));
    rig.legs.push(leg);
  }
  rig.torso = torso;
  rig.root.add(torso, ...rig.legs);
  return rig;
}

function nexarHead(kit, m, rig) {
  const head = pivot(0, 0, 0, mesh(kit.sphere(10), m.skin, 0, 0.1, 0, 0.14, 0.17, 0.15));
  head.add(mesh(kit.box(0.12, 0.22, 0.24), m.dark, 0.08, 0.1, 0));
  const eye = mesh(kit.sphere(8), m.eye, -0.055, 0.12, -0.12, 0.035);
  eye.add(mesh(kit.sphere(8), m.pupil, 0, 0, -0.62, 0.5));
  const lens = mesh(kit.cyl(0.04, 0.04, 0.05, 10), m.glow, 0.06, 0.12, -0.13).rotateX(Math.PI / 2);
  head.add(eye, lens);
  rig.eyes = [eye, lens];
  const mast = mesh(kit.cyl(0.008, 0.01, 0.3, 5), m.dark, 0.1, 0.36, 0.04);
  const tip = mesh(kit.sphere(6), m.glow, 0, 0.16, 0, 0.025);
  mast.add(tip);
  head.add(mast);
  rig.frills.push(mast);
  rig.blinkTip = tip;
  return head;
}
