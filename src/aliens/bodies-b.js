// Body builders: Blubo (floating gelatinous blob with inner glow) and Mekanid (robot with glowing core).
import { mesh, pivot, limb, eyePair, newRig } from './body-kit.js';

export function buildBlubo(kit, m, rng) {
  const rig = newRig();
  rig.unit = 1.45;
  rig.float = true;
  Object.assign(m.skin, { transparent: true, opacity: 0.62, roughness: 0.12, depthWrite: false });
  m.skin.emissive.copy(m.glow.emissive).multiplyScalar(0.25);
  const torso = pivot(0, 0.95, 0);
  const jelly = mesh(kit.sphere(24), m.skin, 0, 0, 0, 0.46, 0.5, 0.46);
  jelly.renderOrder = 2;
  const core = mesh(kit.ico(1, 1), m.glow, 0, -0.04, 0, 0.16);
  rig.spin.push(core);
  torso.add(core, jelly, mesh(kit.sphere(10), m.glow, 0.12, 0.14, 0.08, 0.05), mesh(kit.sphere(10), m.glow, -0.1, -0.2, 0.1, 0.04));
  rig.head = pivot(0, 0.12, 0);
  rig.eyes = eyePair(kit, m, rig.head, { x: 0.14, y: 0.1, z: -0.38, r: 0.1 });
  torso.add(rig.head);
  for (const s of [-1, 1]) rig.arms.push(limb(kit, m.skin, s * 0.4, 0.02, 0, 0.06, 0.22));
  torso.add(...rig.arms);
  const n = 4 + rng.int(3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const t = limb(kit, m.skin, Math.cos(a) * 0.22, -0.38, Math.sin(a) * 0.22, 0.035, 0.34 + rng.range(0, 0.18));
    t.userData.phase = a;
    rig.legs.push(t);
  }
  torso.add(...rig.legs);
  rig.torso = torso;
  rig.root.add(torso);
  return rig;
}

export function buildMekanid(kit, m, rng) {
  const rig = newRig();
  rig.unit = 2.05;
  for (const k of ['skin', 'dark']) Object.assign(m[k], { metalness: 0.45, roughness: 0.35 });
  m.skin.color.offsetHSL(0, -0.25, 0.15);
  const torso = pivot(0, 1.0, 0);
  torso.add(mesh(kit.box(0.56, 0.6, 0.34), m.skin, 0, 0.45, 0));
  torso.add(mesh(kit.cyl(0.14, 0.2, 0.22, 10), m.dark, 0, 0.06, 0));       // waist
  torso.add(mesh(kit.box(0.4, 0.14, 0.26), m.dark, 0, -0.08, 0));          // hips
  const core = mesh(kit.sphere(16), m.glow, 0, 0.46, -0.16, 0.11);
  const ring = mesh(kit.torus(0.16, 0.025), m.dark, 0, 0.46, -0.17);
  rig.spin.push(ring);
  torso.add(core, ring);
  rig.head = mekanidHead(kit, m, rig);
  rig.head.position.set(0, 0.86, 0);
  torso.add(rig.head);
  for (const s of [-1, 1]) {
    torso.add(mesh(kit.sphere(12), m.dark, s * 0.34, 0.68, 0, 0.1));
    const a = limb(kit, m.skin, s * 0.36, 0.66, 0, 0.055, 0.6);
    a.children[0].add(mesh(kit.box(0.1, 0.12, 0.1), m.dark, 0, -0.4, 0));
    rig.arms.push(a);
  }
  torso.add(...rig.arms);
  for (const s of [-1, 1]) {
    const leg = limb(kit, m.skin, s * 0.14, 0.87, 0, 0.07, 0.7);
    leg.children[0].add(mesh(kit.box(0.16, 0.08, 0.28), m.dark, 0, -0.44, -0.04));
    rig.legs.push(leg);
  }
  rig.torso = torso;
  rig.root.add(torso, ...rig.legs);
  return rig;
}

function mekanidHead(kit, m, rig) {
  const head = pivot();
  head.add(mesh(kit.cyl(0.16, 0.18, 0.26, 12), m.skin, 0, 0.1, 0));
  head.add(mesh(kit.sphere(14), m.skin, 0, 0.23, 0, 0.16, 0.08, 0.16));
  const visor = mesh(kit.box(0.24, 0.05, 0.04), m.glow, 0, 0.12, -0.155);
  head.add(visor);
  rig.eyes = [visor];
  const mast = mesh(kit.cyl(0.01, 0.012, 0.3, 5), m.dark, 0.08, 0.42, 0.04);
  const tip = mesh(kit.sphere(8), m.glow, 0, 0.16, 0, 0.03);
  mast.add(tip);
  rig.frills.push(mast);
  head.add(mast);
  rig.blinkTip = tip;
  return head;
}
