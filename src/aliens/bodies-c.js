// Body builders: Kristalin (living crystal), Mikoni (mushroom-folk), Aveli (winged avian),
// Batugar (stone golem). Models face -Z, feet at y = 0; `rig.unit` is the unscaled height.
import { mesh, pivot, limb, eyePair, newRig } from './body-kit.js';

const oct = (kit) => kit.get('Octahedron', 1, 0);
const dodeca = (kit) => kit.get('Dodecahedron', 1, 0);

// Tapered crystal limb hanging from its pivot.
function shardLimb(kit, mat, x, y, z, w, len) {
  return pivot(x, y, z, mesh(oct(kit), mat, 0, -len / 2, 0, w, len / 2, w));
}

export function buildKristalin(kit, m, rng) {
  const rig = newRig();
  rig.unit = 2.3;
  Object.assign(m.skin, { flatShading: true, metalness: 0.1, roughness: 0.08 });
  m.skin.emissive.copy(m.glow.emissive).multiplyScalar(0.18);
  m.dark.flatShading = true;
  const torso = pivot(0, 1.15, 0);
  torso.add(mesh(oct(kit), m.skin, 0, 0.42, 0, 0.3, 0.55, 0.22), mesh(oct(kit), m.dark, 0, -0.02, 0, 0.2, 0.22, 0.16));
  const core = mesh(kit.ico(1, 0), m.glow, 0, 0.42, -0.06, 0.1);
  rig.spin.push(core);
  torso.add(core);
  for (const s of [-1, 1]) torso.add(mesh(oct(kit), m.skin, s * 0.3, 0.72, 0, 0.1, 0.24, 0.1).rotateZ(s * -0.5));
  rig.head = pivot(0, 0.98, 0, mesh(kit.ico(1, 0), m.skin, 0, 0.14, 0, 0.16, 0.2, 0.15));
  for (let i = 0; i < 3; i++) rig.head.add(mesh(oct(kit), m.dark, (i - 1) * 0.08, 0.36, 0.02, 0.04, 0.14 - Math.abs(i - 1) * 0.05, 0.04));
  rig.eyes = eyePair(kit, m, rig.head, { x: 0.06, y: 0.16, z: -0.12, r: 0.035, glow: true });
  torso.add(rig.head);
  for (const s of [-1, 1]) {
    const a = shardLimb(kit, m.skin, s * 0.36, 0.72, 0, 0.07, 0.8);
    a.children[0].add(mesh(oct(kit), m.glow, 0, -0.9, 0, 0.5, 0.2, 0.5));
    rig.arms.push(a);
    rig.legs.push(shardLimb(kit, m.skin, s * 0.12, 1.15, 0, 0.09, 1.15));
  }
  torso.add(...rig.arms);
  rig.torso = torso;
  rig.root.add(torso, ...rig.legs);
  return rig;
}

export function buildMikoni(kit, m, rng) {
  const rig = newRig();
  rig.unit = 1.5;
  m.dark.color.setHSL(0.1, 0.3, rng.range(0.68, 0.8));
  m.accent.color.setHSL(0.12, 0.2, 0.92);
  const torso = pivot(0, 0.45, 0);
  torso.add(mesh(kit.cap(0.22, 0.32), m.dark, 0, 0.3, 0, 1, 1, 0.9));
  rig.head = mikoniCap(kit, m, rig);
  rig.head.position.set(0, 0.72, 0);
  torso.add(rig.head);
  for (const s of [-1, 1]) {
    rig.arms.push(limb(kit, m.dark, s * 0.24, 0.42, 0, 0.045, 0.3));
    const leg = limb(kit, m.dark, s * 0.1, 0.45, 0, 0.07, 0.28);
    leg.children[0].add(mesh(kit.sphere(8), m.dark, 0, -0.2, -0.05, 0.1, 0.06, 0.13));
    rig.legs.push(leg);
  }
  torso.add(...rig.arms);
  rig.torso = torso;
  rig.root.add(torso, ...rig.legs);
  return rig;
}

function mikoniCap(kit, m, rig) {
  const head = pivot();
  head.add(mesh(kit.get('Sphere', 1, 16, 7, 0, Math.PI * 2, 0, Math.PI / 2), m.skin, 0, 0, 0, 0.52, 0.4, 0.52));
  head.add(mesh(kit.cyl(0.5, 0.2, 0.08, 16), m.accent, 0, -0.03, 0));      // gills
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3, r = i % 2 ? 0.3 : 0.4;
    head.add(mesh(kit.sphere(8), m.accent, Math.cos(a) * r, 0.36 - r * 0.45, Math.sin(a) * r, 0.07, 0.03, 0.07));
  }
  for (const s of [-1, 1]) {
    const puff = pivot(s * 0.12, 0.38, 0.05, mesh(kit.sphere(8), m.glow, 0, 0.08, 0, 0.045));
    head.add(puff);
    rig.frills.push(puff);
  }
  rig.eyes = eyePair(kit, m, head, { x: 0.075, y: -0.15, z: -0.2, r: 0.045 });
  return head;
}

export function buildAveli(kit, m, rng) {
  const rig = newRig();
  rig.unit = 2.0;
  const torso = pivot(0, 1.0, 0);
  torso.add(mesh(kit.sphere(10), m.skin, 0, 0.36, 0.03, 0.25, 0.4, 0.24).rotateX(-0.2));
  torso.add(mesh(kit.sphere(10), m.accent, 0, 0.34, -0.1, 0.19, 0.3, 0.14));
  const tail = pivot(0, 0.08, 0.2);
  for (let i = 0; i < 3; i++) tail.add(mesh(kit.cone(0.08, 0.6, 6), m.dark, (i - 1) * 0.1, -0.15, 0.25, 1, 1, 0.3).rotateX(2.2));
  torso.add(tail);
  rig.frills.push(tail);
  rig.head = aveliHead(kit, m, rig);
  rig.head.position.set(0, 0.82, -0.05);
  torso.add(rig.head);
  for (const s of [-1, 1]) {
    const wing = pivot(s * 0.24, 0.6, 0.05, mesh(kit.sphere(8), m.skin, s * 0.05, -0.38, 0.06, 0.07, 0.45, 0.24));
    for (let i = 0; i < 3; i++) wing.add(mesh(kit.cone(0.06, 0.34, 5), m.dark, s * 0.05, -0.85, 0.12 * i - 0.05).rotateX(Math.PI));
    rig.arms.push(wing);
    const leg = limb(kit, m.dark, s * 0.1, 1.02, 0, 0.035, 0.9);
    leg.children[0].add(mesh(kit.cone(0.05, 0.16, 6), m.dark, 0, -0.5, -0.06).rotateX(-Math.PI / 2));
    rig.legs.push(leg);
  }
  torso.add(...rig.arms);
  rig.torso = torso;
  rig.root.add(torso, ...rig.legs);
  return rig;
}

function aveliHead(kit, m, rig) {
  const head = pivot(0, 0, 0, mesh(kit.sphere(10), m.skin, 0, 0.05, 0, 0.15, 0.16, 0.16));
  head.add(mesh(kit.cone(0.055, 0.26, 8), m.accent, 0, 0.02, -0.25).rotateX(-Math.PI / 2));
  rig.eyes = eyePair(kit, m, head, { x: 0.09, y: 0.08, z: -0.1, r: 0.035 });
  for (let i = 0; i < 3; i++) {
    const c = pivot(0, 0.18, 0.02 + i * 0.05, mesh(kit.cone(0.03, 0.32 - i * 0.06, 5), m.glow, 0, 0.14, 0));
    c.rotation.x = 0.5 + i * 0.35;
    head.add(c);
    rig.frills.push(c);
  }
  return head;
}

export function buildBatugar(kit, m, rng) {
  const rig = newRig();
  rig.unit = 2.8;
  m.skin.color.setHSL(rng.range(0.05, 0.12), 0.08, rng.range(0.34, 0.46));
  m.dark.color.setHSL(0.05, 0.1, 0.2);
  for (const k of ['skin', 'dark']) Object.assign(m[k], { flatShading: true, roughness: 0.95 });
  const torso = pivot(0, 1.3, 0);
  torso.add(mesh(dodeca(kit), m.skin, 0, 0.6, 0, 0.62, 0.55, 0.45), mesh(dodeca(kit), m.dark, 0, 0.05, 0, 0.42, 0.35, 0.34));
  torso.add(mesh(kit.box(0.05, 0.42, 0.03), m.glow, -0.16, 0.62, -0.43), mesh(kit.box(0.3, 0.05, 0.03), m.glow, 0.05, 0.72, -0.43));
  for (const s of [-1, 1]) torso.add(mesh(dodeca(kit), m.skin, s * 0.62, 0.9, 0, 0.3));
  rig.head = pivot(0, 1.18, -0.1, mesh(dodeca(kit), m.skin, 0, 0.1, 0, 0.24, 0.2, 0.22));
  rig.eyes = eyePair(kit, m, rig.head, { x: 0.09, y: 0.12, z: -0.19, r: 0.04, glow: true });
  for (const e of rig.eyes) e.scale.set(0.06, 0.025, 0.03);
  torso.add(rig.head);
  for (const s of [-1, 1]) {
    const arm = pivot(s * 0.74, 0.85, 0, mesh(dodeca(kit), m.skin, 0, -0.38, 0, 0.2, 0.36, 0.2));
    arm.add(mesh(dodeca(kit), m.dark, 0, -0.95, 0, 0.27));
    rig.arms.push(arm);
    const leg = pivot(s * 0.25, 1.3, 0, mesh(dodeca(kit), m.skin, 0, -0.5, 0, 0.24, 0.5, 0.24));
    leg.add(mesh(dodeca(kit), m.dark, 0, -1.15, -0.06, 0.26, 0.15, 0.32));
    rig.legs.push(leg);
  }
  torso.add(...rig.arms);
  rig.torso = torso;
  rig.root.add(torso, ...rig.legs);
  return rig;
}
