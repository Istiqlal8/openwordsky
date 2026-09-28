// Procedural models for the two on-foot bosses. Both are built so the player reads them as
// colossal from the ground: legs taller than the trees, a hull far overhead, a core you can only
// reach once the thing kneels.
import * as THREE from 'three';

// Kept barely metallic: the surface scene has no environment map, so a high metalness would
// swallow the sun and leave a black cut-out on the horizon.
const mat = (color, emissive, rough = 0.6, metal = 0.2) =>
  new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 1, metalness: metal, roughness: rough });

// A jointed leg: thigh -> shin, hinged so the walk cycle and the kneel both work.
function buildLeg(len, r, m) {
  const hip = new THREE.Group();
  const thighG = new THREE.CylinderGeometry(r, r * 0.8, len, 7);
  thighG.translate(0, -len / 2, 0);
  const thigh = new THREE.Mesh(thighG, m);
  hip.add(thigh);
  const knee = new THREE.Group();
  knee.position.y = -len;
  const shinG = new THREE.CylinderGeometry(r * 0.8, r * 0.45, len * 0.95, 7);
  shinG.translate(0, -len * 0.475, 0);
  knee.add(new THREE.Mesh(shinG, m));
  const footG = new THREE.BoxGeometry(r * 3, r * 0.7, r * 4);
  footG.translate(0, -len * 0.95, r * 0.6);
  knee.add(new THREE.Mesh(footG, m));
  hip.add(knee);
  // The hit sphere belongs on the leg, not on the hip joint the group is anchored at.
  const anchor = new THREE.Object3D();
  anchor.position.y = -len * 1.45; // Wildlife offsets the hit sphere up by 0.8 * radius
  hip.add(anchor);
  hip.userData.hit = anchor;
  return { hip, knee, geos: [thighG, shinG, footG] };
}

export function buildTitan(S) {
  const root = new THREE.Group();
  const mats = [mat(0x5c6068, 0x100404), mat(0x2a2d33, 0x000000, 0.8), mat(0x1a1010, 0xff3a2a, 0.3, 0.2), mat(0x1a1010, 0x6fe3ff, 0.3, 0.2)];
  const [plateM, darkM, hotM, eyeM] = mats;
  const geos = [];
  const legLen = S * 1.5;
  const body = new THREE.Group();
  body.position.y = legLen * 2 + S * 0.4;
  root.add(body);
  const hullG = new THREE.BoxGeometry(S * 2.4, S * 1.1, S * 3.2);
  geos.push(hullG);
  body.add(new THREE.Mesh(hullG, plateM));
  const browG = new THREE.BoxGeometry(S * 2.6, S * 0.3, S * 1.2);
  geos.push(browG);
  const brow = new THREE.Mesh(browG, darkM);
  brow.position.set(0, S * 0.66, -S * 0.9);
  body.add(brow);
  const headG = new THREE.SphereGeometry(S * 0.42, 12, 10);
  geos.push(headG);
  const head = new THREE.Mesh(headG, eyeM);
  head.position.set(0, S * 0.5, -S * 1.7);
  body.add(head);
  const legs = [];
  for (let i = 0; i < 4; i++) {
    const { hip, knee, geos: lg } = buildLeg(legLen, S * 0.3, plateM);
    geos.push(...lg);
    hip.position.set((i % 2 ? 1 : -1) * S * 1.1, body.position.y - S * 0.4, (i < 2 ? -1 : 1) * S * 1.2);
    Object.assign(hip.userData, { knee, phase: i * 1.55 });
    root.add(hip);
    legs.push(hip);
  }
  const coreG = new THREE.IcosahedronGeometry(S * 0.5, 1);
  geos.push(coreG);
  const core = new THREE.Group();
  core.position.set(0, body.position.y - S * 0.7, 0);
  core.add(new THREE.Mesh(coreG, hotM));
  root.add(core);
  return { root, mats, geos, coreMat: hotM, body, head, legLen, slots: { leg: legs, core }, scale: S };
}

export function buildKolosus(S) {
  const root = new THREE.Group();
  const mats = [mat(0x6a5a44, 0x0a0600, 0.9, 0.15), mat(0x3c3226, 0x000000, 0.95, 0.1), mat(0x201404, 0xffc14a, 0.4, 0.2), mat(0x201404, 0xffc14a, 0.4, 0.2)];
  const [stoneM, darkM, runeM, coreM] = mats;
  const geos = [];
  const legLen = S * 1.05;
  const body = new THREE.Group();
  body.position.y = legLen * 2 + S * 1.1;
  root.add(body);
  const torsoG = new THREE.BoxGeometry(S * 2.1, S * 2.2, S * 1.4);
  geos.push(torsoG);
  body.add(new THREE.Mesh(torsoG, stoneM));
  const headG = new THREE.BoxGeometry(S * 1.1, S * 1, S * 1.1);
  geos.push(headG);
  const head = new THREE.Mesh(headG, darkM);
  head.position.y = S * 1.6;
  body.add(head);
  const armG = new THREE.BoxGeometry(S * 0.62, S * 2.1, S * 0.62);
  armG.translate(0, -S * 1.05, 0);
  geos.push(armG);
  const arms = [];
  for (let i = 0; i < 2; i++) {
    const a = new THREE.Mesh(armG, darkM);
    a.position.set((i ? 1 : -1) * S * 1.4, S * 0.95, 0);
    a.rotation.z = (i ? -1 : 1) * 0.18;
    body.add(a);
    arms.push(a);
  }
  const legs = [];
  for (let i = 0; i < 2; i++) {
    const { hip, knee, geos: lg } = buildLeg(legLen, S * 0.42, stoneM);
    geos.push(...lg);
    hip.position.set((i ? 1 : -1) * S * 0.6, body.position.y - S * 1.1, 0);
    Object.assign(hip.userData, { knee, phase: i * Math.PI });
    root.add(hip);
    legs.push(hip);
  }
  const runeG = new THREE.OctahedronGeometry(S * 0.34, 0);
  geos.push(runeG);
  // Runes sit on the shoulders and the crown: readable from any side, so phase one is obvious.
  const RUNE_AT = [[-1.15, 1.05, 0], [1.15, 1.05, 0], [0, 2.05, 0]];
  const runes = [];
  for (const [x, y, z] of RUNE_AT) {
    const g = new THREE.Group();
    g.position.set(x * S, y * S, z * S);
    g.add(new THREE.Mesh(runeG, runeM));
    body.add(g);
    runes.push(g);
  }
  const coreG = new THREE.IcosahedronGeometry(S * 0.46, 1);
  geos.push(coreG);
  const core = new THREE.Group();
  core.position.set(0, S * 0.35, -S * 0.78);
  core.add(new THREE.Mesh(coreG, coreM));
  body.add(core);
  return { root, mats, geos, coreMat: coreM, body, head, legLen, slots: { leg: legs, rune: runes, core }, arms, scale: S };
}

export const SURFACE_MODELS = { 'titan-penjaga': buildTitan, kolosus: buildKolosus };

export function disposeSurfaceModel(m) {
  m.root.removeFromParent();
  for (const g of m.geos) g.dispose();
  for (const mm of m.mats) mm.dispose();
}
