// Strange flora shapes. Unit height (base at y=0), parts tagged by material role.
import * as THREE from 'three';
import { merge, at, tube, ring, V } from './flora-geo.js';

const sphere = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);

// Stalks topped with staring eyeballs (eyes face +x).
function eyestalk() {
  const tips = [[0, 1, 0], [0.22, 0.72, 0.12], [-0.18, 0.58, -0.16]];
  const stalks = tips.map(([x, y, z]) => tube([V(0, 0, 0), V(x * 0.2, y * 0.5, z * 0.4), V(x * 1.1, y * 0.8, z), V(x, y - 0.1, z)], 0.035 * (y + 0.3), 8, 4));
  const r = (y) => 0.1 + y * 0.05;
  return [['stem', merge(stalks)],
    ['eye', merge(tips.map(([x, y, z]) => at(sphere(r(y)), x, y, z)))],
    ['glow', merge(tips.map(([x, y, z]) => at(sphere(r(y) * 0.55, 8, 6).scale(0.5, 1, 1), x + r(y) * 0.72, y, z)))],
    ['pupil', merge(tips.map(([x, y, z]) => at(sphere(r(y) * 0.28, 6, 4).scale(0.5, 1, 1), x + r(y) * 0.92, y, z)))]];
}

// Arching stalks with glowing pods dangling on threads.
function lantern() {
  const arm = (a) => [Math.cos(a), Math.sin(a)];
  return [['stem', ring(3, (i, a) => {
    const [c, s] = arm(a);
    return tube([V(0, 0, 0), V(c * 0.05, 0.55, s * 0.05), V(c * 0.2, 0.95, s * 0.2), V(c * 0.42, 0.9, s * 0.42), V(c * 0.5, 0.78, s * 0.5)], 0.03, 10, 4);
  })],
  ['secondary', ring(3, (i, a) => at(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 3), Math.cos(a) * 0.5, 0.68, Math.sin(a) * 0.5))],
  ['glow', ring(3, (i, a) => at(sphere(0.085, 8, 6).scale(1, 1.35, 1), Math.cos(a) * 0.5, 0.52, Math.sin(a) * 0.5))]];
}

function helix(phase, r0, turns) {
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, a = phase + t * turns * Math.PI * 2, r = r0 * (1 - t * 0.7);
    pts.push(V(Math.cos(a) * r, t * 0.95, Math.sin(a) * r));
  }
  return tube(pts, 0.035, 40, 5);
}

// Two intertwined corkscrews with a glowing bud on top.
function spiral() {
  return [['primary', helix(0, 0.22, 2.5)], ['secondary', helix(Math.PI, 0.22, 2.5)],
    ['glow', at(sphere(0.08, 8, 6), 0, 0.97, 0)]];
}

// Translucent blobs with a bright core.
function jelly() {
  const blobs = [[0, 0.32, 0, 0.34], [0.3, 0.16, 0.12, 0.17], [-0.22, 0.13, -0.2, 0.14]];
  return [['jelly', merge(blobs.map(([x, y, z, r]) => at(new THREE.IcosahedronGeometry(r, 1).scale(1, 1.15, 1), x, y, z)))],
    ['glow', merge(blobs.map(([x, y, z, r]) => at(new THREE.IcosahedronGeometry(r * 0.35, 1), x, y + r * 0.2, z)))],
    ['stem', at(new THREE.CylinderGeometry(0.02, 0.03, 0.4, 4), 0, 0.72, 0)],
    ['secondary', at(sphere(0.05, 6, 4), 0, 0.94, 0)]];
}

// Thin stalk carrying flat round leaves at different heights.
function fan() {
  const leaves = [[0.45, 0.3, 0.2], [0.65, -0.2, 0.26], [0.85, 0.15, 0.32], [1, 0, 0.22]];
  return [['stem', tube([V(0, 0, 0), V(0.03, 0.5, 0), V(-0.02, 1, 0)], 0.025, 8, 4)],
    ['primary', merge(leaves.map(([y, t, r], i) => at(new THREE.CylinderGeometry(r, r, 0.015, 12)
      .rotateX(Math.PI / 2 - 0.35).rotateY(i * 2.1).rotateZ(t), Math.sin(i * 2.1) * r * 0.6, y, Math.cos(i * 2.1) * r * 0.6)))],
    ['secondary', merge(leaves.map(([y], i) => at(sphere(0.03, 5, 3), 0, y, 0)))]];
}

// Cluster of upright egg pods with glowing tips.
function pod() {
  const eggs = [[0, 0, 0.26, 1], [0.3, 0.1, 0.17, 0.7], [-0.22, 0.24, 0.15, 0.62], [-0.08, -0.3, 0.19, 0.78], [0.25, -0.24, 0.12, 0.5]];
  return [['primary', merge(eggs.map(([x, z, r, h]) => at(sphere(r, 8, 6).scale(1, h / r / 2.1, 1), x, h * 0.46, z)))],
    ['glow', merge(eggs.map(([x, z, r, h]) => at(sphere(r * 0.35, 6, 4).scale(1, 0.5, 1), x, h * 0.93, z)))]];
}

// Vine arch dotted with little bulbs.
function arch() {
  const vine = new THREE.TorusGeometry(0.45, 0.045, 5, 18, Math.PI).scale(1, 2.05, 1);
  const beads = [];
  for (let i = 1; i < 8; i++) {
    const a = (i / 8) * Math.PI;
    beads.push(at(sphere(0.06, 6, 4), Math.cos(a) * 0.45, Math.sin(a) * 0.92, 0.04));
  }
  return [['primary', vine], ['secondary', merge(beads)],
    ['stem', merge([at(sphere(0.1, 6, 4).scale(1, 0.4, 1), 0.45, 0, 0), at(sphere(0.1, 6, 4).scale(1, 0.4, 1), -0.45, 0, 0)])]];
}

// Ribcage of pale arcs rising from a buried spine.
function rib(x, side, h) {
  return new THREE.TorusGeometry(0.3, 0.028, 3, 8, Math.PI * 0.8).rotateZ(-Math.PI / 2)
    .translate(0, 0.3, 0).scale(1, h / 0.6, 1).rotateY(-side * Math.PI / 2).translate(x, 0, 0);
}

function bone() {
  const parts = [at(new THREE.CylinderGeometry(0.05, 0.04, 1.1, 5).rotateZ(Math.PI / 2), 0, 0.03, 0)];
  for (let i = 0; i < 5; i++) {
    for (const s of [-1, 1]) parts.push(rib((i - 2) * 0.2, s, 1 - Math.abs(i - 2) * 0.2));
  }
  return [['bone', merge(parts)], ['glow', at(sphere(0.06, 6, 4), 0.62, 0.05, 0)]];
}

// Floating balloons tethered by thin strings.
function balloon() {
  const b = [[0, 1, 0, 0.16], [0.2, 0.8, 0.1, 0.12], [-0.16, 0.7, -0.14, 0.13]];
  return [['secondary', merge(b.map(([x, y, z]) => tube([V(0, 0, 0), V(x * 0.4, y * 0.5, z * 0.4), V(x, y - 0.12, z)], 0.008, 6, 3)))],
    ['primary', merge(b.map(([x, y, z, r]) => at(sphere(r, 8, 6).scale(1, 1.15, 1), x, y, z)))],
    ['stem', at(sphere(0.07, 6, 4).scale(1, 0.5, 1), 0, 0, 0)]];
}

export const WEIRD = { eyestalk, lantern, spiral, jelly, fan, pod, arch, bone, balloon };
