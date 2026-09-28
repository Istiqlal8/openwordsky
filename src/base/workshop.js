// "Bengkel DIY": open-front workshop with a ship frame on a cradle, tool racks and a robot arm.
import * as THREE from 'three';
import { C } from './materials.js';
import { foundation, stairs } from './ground.js';
import { addSign } from './signs.js';

const W = 13, D = 10, H = 5.5;
export const WORKSHOP = { w: W, d: D, door: { x: 0, z: D / 2 + 2.5 } };

function walls(kit) {
  kit.box('hull', C.panel, W, H, 0.3, 0, H / 2, -D / 2);
  for (const s of [-1, 1]) {
    kit.box('hull', C.panel, 0.3, H, D, s * W / 2, H / 2, 0);
    kit.box('glow', C.warm, 0.08, 0.9, D * 0.6, s * (W / 2 + 0.16), H * 0.62, 0);
    kit.box('hull', C.accent, 0.34, 0.35, D, s * W / 2, 0.9, 0);
  }
  kit.box('hull', C.hull, W + 1.2, 0.35, D + 1.6, 0, H + 0.17, 0.3);
  kit.box('hull', C.steel, W - 0.4, 1.1, 0.3, 0, H - 0.55, D / 2 + 0.1); // rolled-up door
  for (let i = 0; i < 3; i++) kit.box('lamp', C.warm, 2.2, 0.08, 0.35, -4 + i * 4, H - 0.05, -0.5);
  addSign(kit, 'bengkel', 5.6, 0, H + 1.1, D / 2 + 1.1);
  kit.box('hull', C.dark, 6, 1.6, 0.15, 0, H + 1.1, D / 2 + 1.0);
}

// Skeleton of a ship under construction, nose toward +X, resting on two cradles.
function shipFrame(kit) {
  for (const x of [-2.2, 1.8]) {
    kit.box('hull', C.accent, 0.5, 1.2, 2.6, x, 0.6, 0);
    kit.box('hull', C.dark, 0.6, 0.2, 3, x, 1.25, 0);
  }
  kit.beam('hull', C.steel, [-4, 2.4, 0], [4.2, 2.3, 0], 0.12);
  for (let i = 0; i < 6; i++) {
    const x = -3.4 + i * 1.4, r = 1.25 - Math.abs(i - 2) * 0.18;
    kit.add('hull', new THREE.TorusGeometry(r, 0.07, 4, 14), C.steel, x, 2.4, 0, [0, Math.PI / 2, 0]);
  }
  kit.add('hull', new THREE.ConeGeometry(0.9, 1.6, 8, 1, true), C.hull, 4.8, 2.35, 0, [0, 0, -Math.PI / 2]);
  kit.beam('hull', C.hull, [-1, 2.2, 1.1], [0.6, 2.1, 3.6], 0.12);
  kit.beam('hull', C.hull, [-1, 2.2, -1.1], [0.6, 2.1, -3.6], 0.12);
}

function toolRacks(kit) {
  kit.box('hull', C.wood, 5, 2.4, 0.15, 3, 2.2, -D / 2 + 0.25);
  const tools = [C.red, C.stripe, C.teal, C.accent, C.hull, C.steel];
  for (let i = 0; i < 12; i++) {
    kit.box('hull', tools[i % tools.length], 0.18, 0.5 + (i % 3) * 0.2, 0.1, 1 + (i % 6) * 0.8, 1.7 + Math.floor(i / 6) * 1, -D / 2 + 0.38);
  }
  kit.box('hull', C.wood, 4, 0.15, 1.2, -3.5, 1.05, -D / 2 + 0.9);
  for (const x of [-5.2, -1.8]) kit.box('hull', C.dark, 0.15, 1, 1, x, 0.5, -D / 2 + 0.9);
  kit.box('glow', C.cool, 1, 0.7, 0.06, -3.5, 1.6, -D / 2 + 0.2);
}

export function buildWorkshop(kit, depth, drop) {
  kit.box('hull', C.panel, W + 0.4, 0.4, D + 0.6, 0, -0.2, 0);
  foundation(kit, { w: W + 0.4, d: D + 0.6 }, depth);
  kit.box('hull', C.dark, W - 0.4, 0.06, D - 0.4, 0, 0.03, 0);
  walls(kit);
  shipFrame(kit);
  toolRacks(kit);
  stairs(kit, drop, 6, D / 2 + 0.3);
}

// Animated welding robot (own meshes). Returns { group, update(t), dispose() }.
export function makeRobotArm() {
  const mat = new THREE.MeshStandardMaterial({ color: C.accent, roughness: 0.5, metalness: 0.3, flatShading: true });
  const tip = new THREE.MeshBasicMaterial({ color: 0x9fe8ff });
  const group = new THREE.Group();
  const part = (geo, parent, px, py, pz, m = mat) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(px, py, pz);
    parent.add(mesh);
    return mesh;
  };
  part(new THREE.CylinderGeometry(0.6, 0.7, 0.5, 10), group, 0, 0.25, 0);
  const turret = part(new THREE.CylinderGeometry(0.35, 0.4, 0.6, 8), group, 0, 0.8, 0);
  const upper = part(new THREE.BoxGeometry(0.3, 2.2, 0.3).translate(0, 1.1, 0), turret, 0, 0.2, 0);
  const fore = part(new THREE.BoxGeometry(0.22, 1.8, 0.22).translate(0, 0.9, 0), upper, 0, 2.2, 0);
  const spark = part(new THREE.SphereGeometry(0.14, 8, 6), fore, 0, 1.9, 0, tip);
  const update = (t) => {
    turret.rotation.y = 0.9 + Math.sin(t * 0.5) * 0.6;
    upper.rotation.x = 0.5 + Math.sin(t * 0.7) * 0.2;
    fore.rotation.x = 1.3 + Math.sin(t * 0.9 + 1) * 0.3;
    spark.scale.setScalar(Math.sin(t * 23) > 0.2 ? 1.4 : 0.4);
  };
  const dispose = () => {
    group.removeFromParent();
    group.traverse((o) => o.geometry?.dispose());
    mat.dispose();
    tip.dispose();
  };
  return { group, update, dispose };
}
