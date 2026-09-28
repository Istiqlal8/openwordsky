// Shattered world: a core with a huge bite torn out of one side, and 6-12 large
// fragments slowly orbiting and tumbling around it. Fits inside 1.15 x radius.
import * as THREE from 'three';
import { fbm3 } from '../../core/noise.js';
import { Rng, hash32 } from '../../core/rng.js';
import { surfaceColorer } from '../space-surface.js';
import { paintGeometry, sphereSegments } from './paint.js';

const { smoothstep } = THREE.MathUtils;
const SCAR = new THREE.Color(0x3a2a24);
const MAGMA = new THREE.Color(0xff7a2a);
const CORE = 0.62;

// Colors the torn face dark rock with glowing veins; returns 0..1 bite depth.
function scarColorer(planet, bite) {
  const base = surfaceColorer(planet);
  return (v, out) => {
    const rel = base(v, out);
    const k = smoothstep(v.dot(bite), 0.55, 0.7);
    if (k <= 0) return rel;
    const vein = smoothstep(fbm3(planet.seed + 21, v.x * 9, v.y * 9, v.z * 9, 3), 0.58, 0.66);
    out.lerp(SCAR, k).lerp(MAGMA, k * vein * 0.85);
    return rel * (1 - k);
  };
}

function buildCore(planet, bite, mat) {
  const r = planet.radius * CORE;
  const geo = new THREE.SphereGeometry(r, ...sphereSegments(r));
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const k = smoothstep(v.dot(bite), 0.45, 0.85);
    const rough = fbm3(planet.seed + 9, v.x * 6, v.y * 6, v.z * 6, 3) - 0.5;
    v.multiplyScalar(r * (1 - k * (0.4 + rough * 0.15)));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  paintGeometry(geo, scarColorer(planet, bite), { bump: 0.06 });
  return new THREE.Mesh(geo, mat);
}

function buildFragment(planet, rng, size, mat) {
  const geo = new THREE.IcosahedronGeometry(size, 1);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const seed = planet.seed + rng.int(1000);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const k = 0.65 + fbm3(seed, v.x * 1.6 + 3, v.y * 1.6 + 3, v.z * 1.6 + 3, 3) * 0.7;
    pos.setXYZ(i, v.x * size * k, v.y * size * k * 0.8, v.z * size * k);
  }
  const color = scarColorer(planet, new THREE.Vector3(rng.range(-1, 1), 1, rng.range(-1, 1)).normalize());
  paintGeometry(geo, color, { bump: 0 });
  geo.computeVertexNormals(); // faceted: icosahedron triangles are unshared
  return new THREE.Mesh(geo, mat);
}

// Pivot at the core center; the fragment sits at `dist`, clustered around the bite.
function placeFragment(rng, bite, dist, mesh) {
  const pivot = new THREE.Group();
  const dir = bite.clone().add(new THREE.Vector3(rng.range(-1, 1), rng.range(-0.8, 0.8), rng.range(-1, 1))).normalize();
  mesh.position.copy(dir).multiplyScalar(dist);
  pivot.add(mesh);
  const axis = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(rng.range(-1, 1), 1, rng.range(-1, 1))).normalize();
  return { pivot, mesh, axis, orbit: rng.range(0.02, 0.06) * (rng.chance(0.5) ? 1 : -1),
    spin: new THREE.Vector3(rng.range(-0.3, 0.3), rng.range(-0.3, 0.3), rng.range(-0.3, 0.3)) };
}

export function buildShattered(planet, mat) {
  const R = planet.radius;
  const rng = new Rng(hash32(planet.seed, 0x5a77));
  const bite = new THREE.Vector3(rng.range(-1, 1), rng.range(-0.4, 0.4), rng.range(-1, 1)).normalize();
  const root = new THREE.Group();
  const core = buildCore(planet, bite, mat);
  root.add(core);
  const frags = [];
  for (let i = 6 + rng.int(7); i > 0; i--) {
    const size = R * rng.range(0.09, 0.2);
    const dist = Math.min(R * 1.12 - size * 1.35, Math.max(R * CORE + size * 1.4, R * rng.range(0.8, 0.95)));
    const f = placeFragment(rng, bite, dist, buildFragment(planet, rng, size, mat));
    root.add(f.pivot);
    frags.push(f);
  }
  const update = (time) => {
    for (const f of frags) {
      f.pivot.quaternion.setFromAxisAngle(f.axis, f.orbit * time);
      f.mesh.rotation.set(f.spin.x * time, f.spin.y * time, f.spin.z * time);
    }
  };
  return { root, parts: [{ mesh: core }], glow: 0.45, update };
}
