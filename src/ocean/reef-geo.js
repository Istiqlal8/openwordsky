// Procedural reef geometry, all vertex-colored so instance colors tint them per planet.
// Plants stand on y = 0 and are ~1 unit tall (the sway shader bends by height).
import * as THREE from 'three';
import { mergeParts } from './ocean-kit.js';

const TAU = Math.PI * 2;

// Branching (staghorn) coral: a trunk with forked, tipped arms.
export function branchCoral() {
  const parts = [{ geo: new THREE.CylinderGeometry(0.06, 0.09, 0.4, 6).translate(0, 0.2, 0), color: 0xd8d8d8 }];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + i * 0.4, tilt = 0.35 + (i % 3) * 0.2, len = 0.45 + (i % 2) * 0.2;
    const arm = new THREE.CylinderGeometry(0.03, 0.05, len, 5).translate(0, len / 2, 0).rotateZ(tilt).rotateY(a).translate(0, 0.32, 0);
    const tip = new THREE.SphereGeometry(0.05, 6, 4).translate(0, len, 0).rotateZ(tilt).rotateY(a).translate(0, 0.32, 0);
    parts.push({ geo: arm, color: 0xffffff }, { geo: tip, color: 0xfff4e8 });
  }
  return mergeParts(parts);
}

// Brain coral: a squashed dome with winding grooves.
export function brainCoral() {
  const geo = new THREE.SphereGeometry(0.5, 20, 12, 0, TAU, 0, Math.PI / 2);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const groove = Math.sin(v.x * 22 + Math.sin(v.z * 14) * 2.5) * 0.025;
    v.multiplyScalar(1 + groove);
    p.setXYZ(i, v.x, v.y * 0.75, v.z);
  }
  geo.computeVertexNormals();
  return mergeParts([{ geo, color: 0xffffff }]);
}

// Sea fan: a flat lacy half-disc on a short stem (double sided).
export function fanCoral() {
  const fan = new THREE.CircleGeometry(0.5, 18, 0, Math.PI).translate(0, 0.45, 0);
  const p = fan.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 9) * 0.03);
  fan.computeVertexNormals();
  return mergeParts([{ geo: fan, color: 0xffffff }, { geo: new THREE.CylinderGeometry(0.02, 0.03, 0.5, 4).translate(0, 0.25, 0), color: 0xb0a090 }]);
}

// Anemone: a fat foot crowned with swaying tentacles.
export function anemone() {
  const parts = [{ geo: new THREE.CylinderGeometry(0.22, 0.28, 0.3, 10).translate(0, 0.15, 0), color: 0xc8b0a0 }];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU, r = i % 2 ? 0.16 : 0.08, tilt = i % 2 ? 0.6 : 0.3;
    const g = new THREE.ConeGeometry(0.03, 0.55, 4).translate(0, 0.27, 0).rotateZ(tilt).rotateY(a).translate(Math.cos(a) * r, 0.3, Math.sin(a) * r);
    parts.push({ geo: g, color: 0xffffff });
  }
  return mergeParts(parts);
}

// Kelp strand: crossed ribbons with leaf blades, 1 unit tall (darker at the root).
export function kelpStrand() {
  const parts = [];
  for (const rot of [0, Math.PI / 2]) {
    parts.push({ geo: new THREE.PlaneGeometry(0.05, 1, 1, 12).translate(0, 0.5, 0).rotateY(rot), color: 0x8a8a5a });
  }
  for (let i = 0; i < 9; i++) {
    const y = 0.12 + i * 0.1, a = i * 2.4;
    const leaf = new THREE.PlaneGeometry(0.09, 0.16, 1, 2).translate(0.05, 0, 0).rotateZ(-0.5).rotateY(a).translate(0, y, 0);
    parts.push({ geo: leaf, color: i < 3 ? 0xb0b090 : 0xffffff });
  }
  return mergeParts(parts);
}

// Sea grass tuft: thin blades leaning out.
export function seaGrass() {
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU, h = 0.7 + (i % 3) * 0.15;
    const g = new THREE.PlaneGeometry(0.05, h, 1, 4).translate(0, h / 2, 0).rotateZ(0.15 + (i % 2) * 0.15).rotateY(a).translate(Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05);
    parts.push({ geo: g, color: i % 2 ? 0xffffff : 0xd0e0b0 });
  }
  return mergeParts(parts);
}

// Starfish lying flat: five tapered arms.
export function starfish() {
  const parts = [{ geo: new THREE.SphereGeometry(0.1, 8, 4).scale(1, 0.35, 1), color: 0xffffff }];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.ConeGeometry(0.07, 0.34, 5).rotateZ(-Math.PI / 2).scale(1, 0.4, 1).translate(0.19, 0, 0).rotateY((i / 5) * TAU);
    parts.push({ geo: g, color: 0xffffff });
  }
  return mergeParts(parts);
}

// Crab (forward +X): shell, two claws, six legs.
export function crab() {
  const parts = [{ geo: new THREE.SphereGeometry(0.16, 10, 6).scale(0.8, 0.45, 1.2).translate(0, 0.12, 0), color: 0xffffff }];
  for (const s of [-1, 1]) {
    parts.push({ geo: new THREE.SphereGeometry(0.07, 6, 4).scale(1.4, 0.8, 1).translate(0.2, 0.12, s * 0.16), color: 0xffffff });
    parts.push({ geo: new THREE.SphereGeometry(0.025, 5, 4).translate(0.12, 0.2, s * 0.05), color: 0x111111 });
    for (let i = 0; i < 3; i++) {
      const leg = new THREE.BoxGeometry(0.03, 0.03, 0.2).rotateX(s * 0.7).translate(-0.06 + i * 0.07, 0.07, s * 0.2);
      parts.push({ geo: leg, color: 0xe0e0e0 });
    }
  }
  return mergeParts(parts);
}
