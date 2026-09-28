// Planet body geometry per planet.shape (and gas giants). Every shape fits inside
// ~1.15 x planet.radius, the bounding sphere space.js uses for collision.
// buildShape -> { root, parts: [{ mesh, shellGeo?, cloudGeo?, spinClouds? }], glow, update(time) }
import * as THREE from 'three';
import { fbm3 } from '../../core/noise.js';
import { surfaceColorer } from '../space-surface.js';
import { gasTexture, isGasLike } from '../space-gas.js';
import { paintGeometry, smoothSeams, sphericalUV, sphereSegments } from './paint.js';
import { buildShattered } from './shattered.js';

const noop = () => {};
const CRATERED = new Set(['mercury', 'moon']);

function rockMaterial() {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
}

function bumpOf(planet) {
  if (CRATERED.has(planet.style)) return 0.05;
  return /mountains|ridges|canyons|spires/.test(planet.terrain.style) ? 0.12 : 0.06;
}

function single(mesh, extra = {}) {
  return { root: mesh, parts: [{ mesh, ...extra }], glow: 1, update: noop };
}

function sphereShape(planet) {
  const r = planet.radius;
  const geo = new THREE.SphereGeometry(r, ...sphereSegments(CRATERED.has(planet.style) ? Math.max(r, 110) : r));
  paintGeometry(geo, surfaceColorer(planet), { bump: bumpOf(planet) });
  return single(new THREE.Mesh(geo, rockMaterial()), {
    shellGeo: new THREE.SphereGeometry(r, 48, 32),
    cloudGeo: new THREE.SphereGeometry(r, 64, 40), spinClouds: true,
  });
}

function gasShape(planet) {
  const r = planet.radius;
  const mat = new THREE.MeshStandardMaterial({ map: gasTexture(planet), roughness: 1, metalness: 0 });
  return single(new THREE.Mesh(new THREE.SphereGeometry(r, 128, 96), mat), {
    shellGeo: new THREE.SphereGeometry(r, 64, 40),
  });
}

// Lumpy elongated rock: low-frequency radial noise, then stretched 1.3 / 0.8 / 1.
function potatoShape(planet) {
  const r = planet.radius * 0.8;
  const geo = new THREE.SphereGeometry(r, ...sphereSegments(planet.radius));
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const k = 0.9 + fbm3(planet.seed + 3, v.x * 1.3 + 7, v.y * 1.3 + 7, v.z * 1.3 + 7, 3) * 0.2;
    pos.setXYZ(i, v.x * r * k * 1.3, v.y * r * k * 0.8, v.z * r * k);
  }
  paintGeometry(geo, surfaceColorer(planet), { bump: bumpOf(planet) * 0.5 });
  return single(new THREE.Mesh(geo, rockMaterial()), { cloudGeo: geo });
}

// Contact binary: two fused spheres of different size along x.
function twinShape(planet) {
  const R = planet.radius;
  const root = new THREE.Group();
  const mat = rockMaterial();
  const color = surfaceColorer(planet);
  const parts = [[0.72, -0.38], [0.5, 0.6]].map(([k, x]) => {
    const r = R * k;
    const geo = new THREE.SphereGeometry(r, ...sphereSegments(r));
    paintGeometry(geo, color, { bump: bumpOf(planet) * 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.x = R * x;
    root.add(mesh);
    return { mesh, shellGeo: new THREE.SphereGeometry(r, 48, 32), cloudGeo: new THREE.SphereGeometry(r, 48, 32) };
  });
  root.rotation.z = 0.25;
  return { root, parts, glow: 1, update: noop };
}

// Torus world, tipped ~65 degrees so the hole shows from the orbit plane.
// Ring + tube = 1.12 x radius.
function donutShape(planet) {
  const R = planet.radius;
  const geo = new THREE.TorusGeometry(R * 0.82, R * 0.3, 64, 160);
  geo.rotateX(Math.PI / 2 - 1.15);
  paintGeometry(geo, surfaceColorer(planet), { bump: bumpOf(planet) * 0.25, alongNormal: true, noiseScale: 1.2 / R, radius: R });
  return { ...single(new THREE.Mesh(geo, rockMaterial())), glow: 0.45 };
}

// Subdivided box pulled `round` of the way toward a sphere; corners reach `corner`.
function roundedBox(segments, round, corner) {
  const geo = new THREE.BoxGeometry(2, 2, 2, segments, segments, segments);
  const pos = geo.attributes.position;
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const scale = corner / (Math.sqrt(3) * (1 - round) + round);
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    s.copy(p).normalize();
    p.lerp(s, round).multiplyScalar(scale);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  return geo;
}

// Rounded cube world. The glow shell is rounder so its rim stays soft.
function cubeShape(planet) {
  const R = planet.radius;
  const geo = roundedBox(48, 0.35, R * 1.1);
  paintGeometry(geo, surfaceColorer(planet), { bump: bumpOf(planet) * 0.3 });
  const shellGeo = roundedBox(16, 0.6, R * 1.02);
  shellGeo.computeVertexNormals();
  smoothSeams(shellGeo);
  return single(new THREE.Mesh(geo, rockMaterial()), { shellGeo, cloudGeo: sphericalUV(geo) });
}

const SHAPES = { potato: potatoShape, twin: twinShape, donut: donutShape, cube: cubeShape };

export function buildShape(planet) {
  if (isGasLike(planet)) return gasShape(planet);
  if (planet.shape === 'shattered') return buildShattered(planet, rockMaterial());
  return (SHAPES[planet.shape] ?? sphereShape)(planet);
}
