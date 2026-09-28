// Procedural models for the three space bosses. Each builder returns
//   { root, mats, slots: { <groupId>: [Object3D], core: Object3D }, spin?: Object3D[] }
// Geometry is shared between repeated pieces and freed by disposeModel().
import * as THREE from 'three';

// Low metalness on purpose: the space scene has no environment map, so a metallic surface would
// render as a black silhouette against the star field.
const metal = (color, emissive = 0x0b0e14, rough = 0.55) =>
  new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.9, metalness: 0.22, roughness: rough });

const lamp = (color) =>
  new THREE.MeshStandardMaterial({ color: 0x101018, emissive: color, emissiveIntensity: 1.6, roughness: 0.3 });

function bump(geo, amount, seed = 1) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const n = Math.sin((i + seed) * 12.9898) * 43758.5453;
    const k = 1 + (n - Math.floor(n) - 0.5) * amount;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---------------------------------------------------------------- capital ship
export function buildCapital(R) {
  const root = new THREE.Group();
  const mats = [metal(0x4a4f5c, 0x1a0d06), metal(0x2e323c), lamp(0xff8a3a), lamp(0x6fe3ff), lamp(0xff8a3a)];
  const [hullM, ribM, hotM, coolM, coreM] = mats;
  const geos = [];
  const hullG = new THREE.CylinderGeometry(R * 0.3, R * 0.1, R * 2.6, 8, 1);
  hullG.rotateX(Math.PI / 2);
  geos.push(hullG);
  const hull = new THREE.Mesh(hullG, hullM);
  root.add(hull);
  const finG = new THREE.BoxGeometry(R * 1.5, R * 0.1, R * 0.7);
  geos.push(finG);
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(finG, ribM);
    fin.position.z = (i - 1) * R * 0.55;
    fin.rotation.z = i * 0.25;
    root.add(fin);
  }
  const turG = new THREE.SphereGeometry(R * 0.17, 10, 8);
  const barG = new THREE.CylinderGeometry(R * 0.035, R * 0.05, R * 0.5, 6);
  barG.rotateX(Math.PI / 2);
  geos.push(turG, barG);
  const turrets = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const up = i < 2 ? 1 : -1;
    g.position.set((i % 2 ? 1 : -1) * R * 0.34, up * R * 0.3, (i < 2 ? -1 : 1) * R * 0.5);
    g.add(new THREE.Mesh(turG, hullM));
    const bar = new THREE.Mesh(barG, ribM);
    bar.position.z = -R * 0.25;
    g.add(bar);
    root.add(g);
    turrets.push(g);
  }
  const genG = new THREE.IcosahedronGeometry(R * 0.26, 1);
  const ringG = new THREE.TorusGeometry(R * 0.36, R * 0.04, 6, 18);
  geos.push(genG, ringG);
  const shields = [];
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group();
    g.position.set((i ? 1 : -1) * R * 0.62, 0, R * 0.1);
    g.add(new THREE.Mesh(genG, coolM), new THREE.Mesh(ringG, ribM));
    root.add(g);
    shields.push(g);
  }
  const coreG = new THREE.IcosahedronGeometry(R * 0.3, 1);
  geos.push(coreG);
  const core = new THREE.Group();
  core.position.z = R * 0.85;
  core.add(new THREE.Mesh(coreG, coreM));
  root.add(core);
  const bayG = new THREE.BoxGeometry(R * 0.3, R * 0.12, R * 0.3);
  geos.push(bayG);
  const bays = [];
  for (let i = 0; i < 2; i++) {
    const b = new THREE.Mesh(bayG, hotM);
    b.position.set((i ? 1 : -1) * R * 0.3, -R * 0.24, R * 0.2);
    root.add(b);
    bays.push(b);
  }
  return { root, mats, geos, coreMat: coreM, slots: { turret: turrets, shield: shields, core }, bays, spin: [] };
}

// ------------------------------------------------------------- ancient machine
export function buildMachine(R) {
  const root = new THREE.Group();
  const mats = [metal(0x3c3a52, 0x100a20), metal(0x6a5fa0), lamp(0xd8c8ff), lamp(0xff6adf)];
  const [stoneM, trimM, runeM, weakM] = mats;
  const geos = [];
  const ringG = new THREE.TorusGeometry(R * 0.78, R * 0.1, 8, 28);
  geos.push(ringG);
  root.add(new THREE.Mesh(ringG, stoneM));
  const spokeG = new THREE.BoxGeometry(R * 1.5, R * 0.07, R * 0.16);
  geos.push(spokeG);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(spokeG, trimM);
    s.rotation.z = (i / 3) * Math.PI;
    root.add(s);
  }
  const shell = new THREE.Group();
  root.add(shell);
  const plateG = new THREE.BoxGeometry(R * 0.36, R * 0.52, R * 0.12);
  geos.push(plateG);
  const plates = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * R * 0.44, Math.sin(a) * R * 0.44, 0);
    g.rotation.z = a;
    const m = new THREE.Mesh(plateG, stoneM);
    g.add(m);
    g.userData.angle = a;
    shell.add(g);
    plates.push(g);
  }
  const weakG = new THREE.IcosahedronGeometry(R * 0.15, 1);
  geos.push(weakG);
  const weaks = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * R * 0.44, Math.sin(a) * R * 0.44, 0);
    g.add(new THREE.Mesh(weakG, weakM));
    root.add(g);
    weaks.push(g);
  }
  const coreG = bump(new THREE.IcosahedronGeometry(R * 0.28, 2), 0.18, 7);
  geos.push(coreG);
  const core = new THREE.Group();
  core.add(new THREE.Mesh(coreG, runeM));
  root.add(core);
  return { root, mats, geos, coreMat: runeM, slots: { plate: plates, weak: weaks, core }, shell, spin: [shell] };
}

// ------------------------------------------------------------------------ hive
export function buildHive(R) {
  const root = new THREE.Group();
  const mats = [metal(0x3a5a2a, 0x0a1a06, 0.85), metal(0x6a8a3a, 0x122008, 0.9), lamp(0xb6ff5a), lamp(0xffe06a)];
  const [shellM, limbM, sacM, coreM] = mats;
  const geos = [];
  const shellG = bump(new THREE.IcosahedronGeometry(R * 0.62, 2), 0.35, 3);
  geos.push(shellG);
  root.add(new THREE.Mesh(shellG, shellM));
  const armG = new THREE.CylinderGeometry(R * 0.05, R * 0.12, R * 0.7, 6);
  geos.push(armG);
  const sacG = bump(new THREE.SphereGeometry(R * 0.19, 10, 8), 0.28, 11);
  geos.push(sacG);
  const sacs = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2, tilt = ((i % 3) - 1) * 0.5;
    const arm = new THREE.Group();
    arm.rotation.set(tilt, a, 0);
    const limb = new THREE.Mesh(armG, limbM);
    limb.position.y = R * 0.6;
    limb.rotation.z = Math.PI / 2;
    limb.position.set(R * 0.6, 0, 0);
    limb.rotation.set(0, 0, Math.PI / 2);
    arm.add(limb);
    const sac = new THREE.Group();
    sac.position.set(R * 0.95, 0, 0);
    sac.add(new THREE.Mesh(sacG, sacM));
    arm.add(sac);
    root.add(arm);
    sacs.push(sac);
  }
  const coreG = bump(new THREE.IcosahedronGeometry(R * 0.3, 1), 0.2, 23);
  geos.push(coreG);
  const core = new THREE.Group();
  core.add(new THREE.Mesh(coreG, coreM));
  root.add(core);
  return { root, mats, geos, coreMat: coreM, slots: { sac: sacs, core }, spin: [] };
}

export const SPACE_MODELS = { 'kapal-induk': buildCapital, 'mesin-purba': buildMachine, sarang: buildHive };

export function disposeModel(m) {
  m.root.removeFromParent();
  for (const g of m.geos) g.dispose();
  for (const mat of m.mats) mat.dispose();
}
