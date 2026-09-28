// Body builders: Rimbuna (walking tree), Tintari (floating squid), Kribo (gnome tinkerer in a
// walker), Lumari (tall ghostly energy being). Models face -Z, feet at y = 0.
import * as THREE from 'three';
import { mesh, pivot, limb, eyePair, newRig } from './body-kit.js';

export function buildRimbuna(kit, m, rng) {
  const rig = newRig();
  rig.unit = 3.5;
  m.skin.color.setHSL(0.07, 0.35, rng.range(0.24, 0.34));
  m.dark.color.setHSL(0.06, 0.3, 0.15);
  m.accent.color.setHSL(rng.range(0.22, 0.38), 0.55, 0.36);
  const torso = pivot(0, 1.1, 0);
  torso.add(mesh(kit.cyl(0.26, 0.36, 1.5, 9), m.skin, 0, 0.75, 0), mesh(kit.sphere(8), m.dark, 0.2, 0.6, -0.2, 0.08));
  rig.head = pivot(0, 1.5, 0);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7, r = i ? 0.35 : 0;
    rig.head.add(mesh(kit.ico(1, 1), m.accent, Math.cos(a) * r, 0.55 + (i ? 0 : 0.3), Math.sin(a) * r, 0.62 - (i ? 0.12 : 0)));
  }
  rig.head.add(mesh(kit.sphere(8), m.glow, 0.3, 0.8, -0.4, 0.07), mesh(kit.sphere(8), m.glow, -0.35, 0.6, -0.3, 0.06));
  rig.eyes = eyePair(kit, m, rig.head, { x: 0.1, y: -0.12, z: -0.26, r: 0.05, glow: true });
  torso.add(rig.head);
  for (const s of [-1, 1]) {
    const arm = pivot(s * 0.3, 1.25, 0, mesh(kit.cyl(0.05, 0.09, 1.0, 6), m.skin, 0, -0.5, 0));
    arm.add(mesh(kit.cyl(0.02, 0.04, 0.4, 5), m.skin, s * 0.12, -0.7, 0).rotateZ(s * 0.6));
    arm.add(mesh(kit.ico(1, 0), m.accent, s * 0.2, -0.9, 0, 0.18));
    rig.arms.push(arm);
    const leg = pivot(s * 0.16, 1.1, 0, mesh(kit.cone(0.2, 1.1, 7), m.dark, 0, -0.55, 0).rotateX(Math.PI));
    for (let k = 0; k < 3; k++) leg.add(mesh(kit.cone(0.06, 0.4, 5), m.dark, Math.cos(k * 2.1) * 0.15, -1.02, Math.sin(k * 2.1) * 0.15).rotateZ(Math.PI / 2 + k));
    rig.legs.push(leg);
  }
  torso.add(...rig.arms);
  rig.torso = torso;
  rig.root.add(torso, ...rig.legs);
  return rig;
}

export function buildTintari(kit, m, rng) {
  const rig = newRig();
  rig.unit = 2.1;
  rig.float = true;
  Object.assign(m.skin, { roughness: 0.2, metalness: 0.1 });
  const torso = pivot(0, 1.0, 0);
  torso.add(mesh(kit.sphere(10), m.skin, 0, 0.45, 0.05, 0.3, 0.6, 0.3));
  for (let i = 0; i < 4; i++) torso.add(mesh(kit.sphere(6), m.glow, (i % 2 ? 1 : -1) * 0.2, 0.3 + i * 0.12, -0.18, 0.035));
  for (const s of [-1, 1]) {
    const fin = pivot(s * 0.18, 0.85, 0.1, mesh(kit.get('Circle', 0.3, 10, 0, Math.PI), m.accent));
    fin.rotation.set(0, Math.PI / 2, s * -0.6);
    torso.add(fin);
    rig.frills.push(fin);
  }
  rig.head = pivot(0, 0.02, -0.04, mesh(kit.sphere(10), m.skin, 0, 0, 0, 0.3, 0.26, 0.28));
  rig.eyes = eyePair(kit, m, rig.head, { x: 0.16, y: 0.05, z: -0.2, r: 0.09 });
  torso.add(rig.head);
  for (const s of [-1, 1]) rig.arms.push(limb(kit, m.skin, s * 0.18, -0.1, -0.14, 0.04, 0.6));
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const t = limb(kit, m.skin, Math.cos(a) * 0.18, -0.2, Math.sin(a) * 0.18, 0.035, 0.55 + rng.range(0, 0.2));
    t.userData.phase = a;
    rig.legs.push(t);
  }
  torso.add(...rig.arms, ...rig.legs);
  rig.torso = torso;
  rig.root.add(torso);
  return rig;
}

export function buildKribo(kit, m, rng) {
  const rig = newRig();
  rig.unit = 2.1;
  Object.assign(m.dark, { metalness: 0.6, roughness: 0.35 });
  m.dark.color.setHSL(0.6, 0.08, 0.32);
  m.skin.color.setHSL(0.05, 0.45, rng.range(0.55, 0.68));
  const torso = pivot(0, 1.0, 0);
  torso.add(mesh(kit.get('Sphere', 1, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m.dark, 0, 0.25, 0, 0.42, 0.35, 0.42));
  torso.add(mesh(kit.torus(1, 0.05), m.dark, 0, 0.25, 0, 0.42, 0.42, 0.6).rotateX(Math.PI / 2));
  torso.add(mesh(kit.sphere(8), m.accent, 0, 0.32, 0, 0.2, 0.18, 0.2));
  for (const s of [-1, 1]) torso.add(mesh(kit.cyl(0.04, 0.05, 0.4, 6), m.dark, s * 0.18, 0.4, 0.36), mesh(kit.sphere(6), m.glow, s * 0.18, 0.62, 0.36, 0.05));
  rig.head = kriboHead(kit, m, rig);
  rig.head.position.set(0, 0.56, 0);
  torso.add(rig.head);
  for (const s of [-1, 1]) {
    const a = limb(kit, m.dark, s * 0.46, 0.2, 0, 0.035, 0.45);
    a.children[0].add(mesh(kit.cone(0.04, 0.14, 5), m.glow, s * 0.03, -0.33, 0).rotateX(Math.PI));
    rig.arms.push(a);
    const leg = pivot(s * 0.22, 1.0, 0, mesh(kit.box(0.1, 0.5, 0.1), m.dark, 0, -0.25, 0));
    leg.add(mesh(kit.sphere(8), m.accent, 0, -0.5, 0, 0.07), mesh(kit.cyl(0.04, 0.05, 0.45, 6), m.dark, 0, -0.73, 0));
    leg.add(mesh(kit.box(0.18, 0.06, 0.3), m.dark, 0, -0.97, -0.04));
    rig.legs.push(leg);
  }
  torso.add(...rig.arms);
  rig.torso = torso;
  rig.root.add(torso, ...rig.legs);
  return rig;
}

function kriboHead(kit, m, rig) {
  const head = pivot(0, 0, 0, mesh(kit.sphere(8), m.skin, 0, 0, 0, 0.15));
  head.add(mesh(kit.sphere(8), m.skin, 0, -0.02, -0.15, 0.06));
  head.add(mesh(kit.cone(0.13, 0.24, 8), m.eye, 0, -0.14, -0.04).rotateX(Math.PI));
  const hat = pivot(0, 0.1, 0.02, mesh(kit.cone(0.16, 0.42, 8), m.accent, 0, 0.2, 0));
  hat.rotation.x = 0.35;
  head.add(hat);
  rig.frills.push(hat);
  rig.eyes = eyePair(kit, m, head, { x: 0.06, y: 0.05, z: -0.12, r: 0.04, glow: true });
  return head;
}

export function buildLumari(kit, m, rng) {
  const rig = newRig();
  rig.unit = 3.1;
  rig.float = true;
  Object.assign(m.skin, { transparent: true, opacity: 0.5, depthWrite: false, roughness: 0.1, side: THREE.DoubleSide });
  m.skin.emissive.copy(m.glow.emissive).multiplyScalar(0.5);
  const torso = pivot(0, 1.1, 0);
  const robe = mesh(kit.cone(0.42, 1.6, 12), m.skin, 0, 0.1, 0);
  robe.renderOrder = 2;
  const core = mesh(kit.ico(1, 1), m.glow, 0, 0.35, 0, 0.14);
  rig.spin.push(core);
  torso.add(core, robe, mesh(kit.sphere(10), m.skin, 0, 0.9, 0, 0.3, 0.12, 0.2));
  rig.head = pivot(0, 1.15, 0, mesh(kit.sphere(10), m.skin, 0, 0.12, 0, 0.13, 0.24, 0.13));
  rig.head.add(mesh(kit.torus(1, 0.06), m.glow, 0, 0.46, 0, 0.22, 0.22, 0.3).rotateX(Math.PI / 2));
  rig.eyes = eyePair(kit, m, rig.head, { x: 0.05, y: 0.14, z: -0.11, r: 0.03, glow: true });
  torso.add(rig.head);
  for (const s of [-1, 1]) {
    const a = limb(kit, m.skin, s * 0.3, 0.85, 0, 0.03, 0.9);
    a.children[0].add(mesh(kit.sphere(6), m.glow, 0, -0.52, 0, 0.05));
    rig.arms.push(a);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const w = limb(kit, m.skin, Math.cos(a) * 0.15, -0.6, Math.sin(a) * 0.15, 0.05, 0.5);
    w.userData.phase = a;
    rig.legs.push(w);
  }
  torso.add(...rig.arms, ...rig.legs);
  rig.torso = torso;
  rig.root.add(torso);
  return rig;
}
