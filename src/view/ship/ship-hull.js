// Fuselage, canopy, fins and class extras (antenna, cargo, exotic ring/spikes).
import * as THREE from 'three';
import { part } from './ship-materials.js';

// Side profile as [t, radius]: t = 0 rear .. 1 nose, radius relative to half width/height.
const PROFILES = {
  wedge: { segs: 4, phi: 0, pts: [[0, 0.55], [0.05, 0.8], [0.45, 1], [0.75, 0.72], [0.92, 0.32], [1, 0]] },
  long: { segs: 8, phi: Math.PI / 8, pts: [[0, 0.7], [0.08, 0.95], [0.3, 1], [0.7, 0.92], [0.88, 0.62], [0.97, 0.25], [1, 0]] },
  box: { segs: 4, phi: Math.PI / 4, pts: [[0, 0.92], [0.04, 1], [0.78, 1], [0.9, 0.86], [0.97, 0.55], [1, 0]] },
  pod: { segs: 18, phi: 0, pts: [[0, 0.45], [0.1, 0.85], [0.3, 1], [0.5, 0.74], [0.66, 0.9], [0.86, 0.55], [1, 0]] },
  // Custom-only: a flattened disc (use width close to length and a low height).
  saucer: { segs: 28, phi: 0, pts: [[0, 0.05], [0.04, 0.4], [0.12, 0.66], [0.25, 0.87], [0.4, 0.98], [0.55, 1], [0.7, 0.93], [0.84, 0.74], [0.94, 0.45], [1, 0]] },
};

const UP = new THREE.Vector3(0, 1, 0);

export function profileAt(kind, t) {
  const pts = PROFILES[kind].pts;
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      const [t0, r0] = pts[i - 1], [t1, r1] = pts[i];
      return r0 + ((r1 - r0) * (t - t0)) / (t1 - t0);
    }
  }
  return 0;
}

// Local z for profile t (nose at -L/2) and top of the hull at t.
export const zAt = (p, t) => (0.5 - t) * p.length;
export const topAt = (p, t) => profileAt(p.body, t) * (p.height / 2) * (p.body === 'box' ? 0.707 : 1);

export function buildBody(p, mats) {
  const prof = PROFILES[p.body];
  const L = p.length;
  const pts = [new THREE.Vector2(0, -L / 2), ...prof.pts.map(([t, r]) => new THREE.Vector2(r, (t - 0.5) * L))];
  const geo = new THREE.LatheGeometry(pts, prof.segs, prof.phi);
  geo.rotateX(-Math.PI / 2);
  geo.scale(p.width / 2, p.height / 2, 1);
  return part(geo, mats.hull);
}

export function buildCanopy(p, mats) {
  const { t, size, stretch = 1 } = p.canopy;
  const geo = new THREE.SphereGeometry(1, 16, 10);
  geo.scale(p.width * 0.24 * size, p.height * 0.32 * size, p.length * 0.13 * size * stretch);
  return part(geo, mats.canopy, 0, topAt(p, t) * 0.78, zAt(p, t));
}

function finGeometry(len, h) {
  const s = new THREE.Shape([[0, 0], [len, 0], [len * 1.15, h], [len * 0.75, h]].map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2);
  geo.translate(0.04, 0, 0);
  return geo;
}

export function buildFins(p, mats) {
  const out = [];
  const len = p.length * 0.2, h = p.height * 0.75;
  const y = topAt(p, 0.14) * 0.85, z = p.length / 2 - len * 1.2;
  for (let i = 0; i < p.fins; i++) {
    const side = p.fins === 1 || i === 2 ? 0 : i ? 1 : -1; // third fin sits on the centerline
    const fin = part(finGeometry(len, h), mats.trim, side * p.width * 0.28, y * (side ? 0.8 : 1), z);
    fin.rotation.z = -side * 0.4;
    out.push(fin);
  }
  return out;
}

export function buildAntenna(p, mats) {
  const g = new THREE.Group();
  const y = topAt(p, 0.35), z = zAt(p, 0.35);
  g.add(part(new THREE.CylinderGeometry(0.04, 0.05, 1.4, 6), mats.dark, 0, y + 0.7, z));
  g.add(part(new THREE.SphereGeometry(0.1, 8, 6), mats.glow, 0, y + 1.42, z));
  if (p.dish) {
    const dish = part(new THREE.CylinderGeometry(0.55, 0.1, 0.16, 14, 1, true), mats.trim, 0.5, y + 0.1, zAt(p, 0.5));
    dish.rotation.set(0.5, 0, -0.6);
    g.add(dish);
  }
  return g;
}

export function buildCargo(p, mats) {
  const g = new THREE.Group();
  const w = p.width * 0.26, h = p.height * 0.5, l = p.length * 0.15;
  const x = p.width * 0.354 + w / 2;
  for (let i = 0; i < p.cargo; i++) {
    const z = -p.length * 0.12 + i * l * 1.08;
    for (const s of [-1, 1]) g.add(part(new THREE.BoxGeometry(w, h, l), i % 2 ? mats.hull : mats.trim, s * x, -h * 0.1, z));
  }
  g.add(part(new THREE.BoxGeometry(p.width * 0.4, 0.2, p.length * 0.5), mats.dark, 0, p.height * 0.36, p.length * 0.12));
  return g;
}

export function buildExotic(p, mats) {
  const g = new THREE.Group();
  if (p.ring && p.body === 'saucer') {
    const rim = part(new THREE.TorusGeometry(p.width * 0.5, 0.09, 8, 64), mats.glow, 0, 0, 0); // flat glowing rim
    rim.rotation.x = Math.PI / 2;
    rim.scale.y = p.length / p.width;
    g.add(rim);
  } else if (p.ring) {
    const ring = part(new THREE.TorusGeometry(p.width * 0.85, 0.09, 8, 40), mats.glow, 0, 0, zAt(p, 0.42));
    ring.scale.y = p.height / p.width;
    g.add(ring);
  }
  const r = profileAt('pod', 0.08);
  for (let i = 0; i < p.spikes; i++) {
    const a = (i / p.spikes) * Math.PI * 2 + Math.PI / 2;
    const spike = part(new THREE.ConeGeometry(0.12, 1.8, 6), mats.trim);
    spike.position.set(Math.cos(a) * r * p.width * 0.45, Math.sin(a) * r * p.height * 0.45, p.length * 0.42);
    spike.quaternion.setFromUnitVectors(UP, new THREE.Vector3(Math.cos(a) * 0.7, Math.sin(a) * 0.7, 1).normalize());
    g.add(spike);
  }
  return g;
}
