// Small animated parts: windmill sails, turbine rotors, radar dishes, drill bits and bobbing boats.
import * as THREE from 'three';
import { GeoKit } from '../base/geo-kit.js';
import { boatParts } from './coast.js';

// Build one merged mesh from kit parts drawn by fn(kit).
function partMesh(mat, fn) {
  const kit = new GeoKit().at(0, 0, 0, 0);
  fn(kit);
  return kit.build({ hull: mat }).hull;
}

function sails(kit) {
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a);
    kit.beam('hull', 0x6b4630, [0, 0, 0], [c * 5.5, s * 5.5, 0], 0.09, 4);
    kit.add('hull', new THREE.BoxGeometry(1.3, 4.2, 0.05), 0xf4efe0, c * 3.3 + -s * 0.7, s * 3.3 + c * 0.7, 0.05, [0, 0, a - Math.PI / 2]);
  }
  kit.add('hull', new THREE.SphereGeometry(0.4, 8, 6), 0x3b424c, 0, 0, 0);
}

function rotor(kit) {
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    kit.add('hull', new THREE.BoxGeometry(0.5, 8.5, 0.12), 0xf4f6f7, Math.cos(a + Math.PI / 2) * 4.3, Math.sin(a + Math.PI / 2) * 4.3, 0, [0, 0, a]);
  }
  kit.add('hull', new THREE.ConeGeometry(0.5, 1, 8).rotateX(Math.PI / 2), 0xf4f6f7, 0, 0, 0.4);
}

function dish(kit) {
  kit.add('hull', new THREE.SphereGeometry(2.2, 14, 6, 0, Math.PI * 2, 0, Math.PI / 3.2).rotateX(-Math.PI / 2), 0xf4f4f0, 0, 0, 0.8);
  kit.beam('hull', 0x6d7782, [0, 0, 0.8], [0, 0, 2.6], 0.06);
  kit.box('hull', 0x3b424c, 0.8, 0.8, 0.8, 0, 0, 0);
}

function drill(kit) {
  kit.cyl('hull', 0x9aa4ae, 0.2, 0.2, 8, 6, 0, -8, 0);
  kit.add('hull', new THREE.ConeGeometry(0.45, 1.2, 6).rotateX(Math.PI), 0xf2c14e, 0, -8.4, 0);
  for (let i = 0; i < 3; i++) kit.box('hull', 0xf08a3c, 0.9, 0.12, 0.12, 0, -2 - i * 2.2, 0, (i * Math.PI) / 3);
}

const BUILD = { sails, rotor, dish, drill };

// kind: 'sails' | 'rotor' | 'dish' | 'drill' | 'boat'; at: { x, y, z, yaw }; opt.hex for boats.
export function makeMover(mat, kind, at, opt = {}) {
  const mesh = partMesh(mat, kind === 'boat' ? (k) => boatParts(k, opt.hex ?? 0x2f7fd0) : BUILD[kind]);
  const pivot = new THREE.Group();
  pivot.position.set(at.x, at.y, at.z);
  pivot.rotation.y = at.yaw ?? 0;
  pivot.add(mesh);
  const phase = (at.x * 0.37 + at.z * 0.11) % 6.28, speed = opt.speed ?? 1;
  const update = {
    sails: (t) => { mesh.rotation.z = -t * 0.8 * speed; },
    rotor: (t) => { mesh.rotation.z = -t * 1.6 * speed + phase; },
    dish: (t) => { pivot.rotation.y = (at.yaw ?? 0) + Math.sin(t * 0.15 + phase) * 1.4; mesh.rotation.x = -0.5 + Math.sin(t * 0.1) * 0.2; },
    drill: (t) => { mesh.rotation.y = t * 4; mesh.position.y = Math.sin(t * 0.7) * 0.6; },
    boat: (t) => { mesh.position.y = Math.sin(t * 1.3 + phase) * 0.12; mesh.rotation.z = Math.sin(t * 0.9 + phase) * 0.06; },
  }[kind];
  return { object: pivot, update, dispose: () => mesh.geometry.dispose() };
}
