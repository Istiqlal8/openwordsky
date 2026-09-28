// Wings (1-2 pairs), wingtip pods and forward guns. Guns report muzzle points.
import * as THREE from 'three';
import { part } from './ship-materials.js';
import { wingDecals } from './ship-decals.js';

// Planform [span, forward] points for one wing; sign mirrors to the left side.
function planform(w, sign) {
  const c = w.chord, s = w.span * sign, sw = w.sweep;
  const shapes = {
    swept: [[0, c / 2], [s, c / 2 - sw], [s, c / 2 - sw - c * 0.3], [0, -c / 2]],
    delta: [[0, c / 2], [s, -c / 2 + 0.25], [s, -c / 2], [0, -c / 2]],
    straight: [[0, c / 2], [s, c / 2 - sw], [s, c / 2 - sw - c * 0.7], [0, -c / 2]],
    forward: [[0, c / 2], [s, c / 2 + Math.abs(sw) * 0.6], [s, c / 2 + Math.abs(sw) * 0.6 - c * 0.35], [0, -c / 2]],
  };
  return shapes[w.shape].map(([x, y]) => new THREE.Vector2(x, y));
}

function wingGeometry(w, sign, thick) {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(planform(w, sign)), { depth: thick, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); // shape y -> nose (-z), extrusion -> up
  geo.translate(0, -thick / 2, 0);
  return geo;
}

// One wing pair at height y with dihedral angle d.
function wingPair(p, mats, y, d, tipPods) {
  const w = p.wings, g = new THREE.Group();
  const zc = w.z * p.length;
  for (const sign of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(sign * p.width * 0.22, y, zc);
    wing.rotation.z = sign * d;
    wing.add(part(wingGeometry(w, sign, 0.12), mats.hull));
    const tipZ = zc - (w.chord / 2 - Math.max(0, w.sweep)) + w.chord * 0.2;
    wing.add(part(new THREE.BoxGeometry(0.1, 0.14, w.chord * 0.55), mats.trim, sign * w.span * 0.55, 0.07, tipZ - zc + w.chord * 0.05));
    if (p.decal && p.decal !== 'none') wing.add(...wingDecals(planform(w, sign), p.decal, mats));
    if (tipPods) wing.add(part(new THREE.CylinderGeometry(0.12, 0.12, w.chord * 0.8, 8).rotateX(Math.PI / 2), mats.dark, sign * w.span, 0, tipZ - zc));
    g.add(wing);
  }
  return g;
}

export function buildWings(p, mats) {
  const w = p.wings;
  if (!w || w.shape === 'none' || !w.pairs) return [];
  const tipPods = p.body === 'wedge';
  if (w.pairs === 1) return [wingPair(p, mats, -p.height * 0.08, w.dihedral, tipPods)];
  const d = Math.abs(w.dihedral) + 0.22;
  return [wingPair(p, mats, p.height * 0.12, d, tipPods), wingPair(p, mats, -p.height * 0.18, -d, tipPods)];
}

// Guns under the wing roots. Returns { meshes, muzzles } in ship-local space.
export function buildGuns(p, mats) {
  const meshes = [], muzzles = [];
  const len = p.length * 0.28;
  const front = -p.length * 0.32, y0 = -p.height * 0.22;
  for (let i = 0; i < p.guns; i++) {
    const row = Math.floor(i / 2); // guns 3-4 sit further out and lower
    const x = (i % 2 ? 1 : -1) * p.width * (0.42 + row * 0.22), y = y0 - row * p.height * 0.16;
    const barrel = new THREE.CylinderGeometry(0.07, 0.1, len, 8).rotateX(Math.PI / 2);
    meshes.push(part(barrel, mats.dark, x, y, front + len / 2));
    meshes.push(part(new THREE.BoxGeometry(0.28, 0.24, len * 0.45), mats.trim, x, y, front + len * 0.8));
    muzzles.push(new THREE.Vector3(x, y, front - 0.05));
  }
  return { meshes, muzzles };
}
