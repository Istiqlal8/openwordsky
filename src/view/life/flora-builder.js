// Flora species -> instancing parts. Each part is a unit-height geometry + color;
// all parts of one species share instance matrices (scale = species height).
import * as THREE from 'three';
import { shiftHex, mixHex } from '../../core/color.js';
import { merge, at, tilt } from './flora-geo.js';
import { WEIRD } from './flora-weird.js';

// Shared wind clock for every flora material; the surface sets .value = elapsed seconds.
export const floraTime = { value: 0 };
const SWAY_MUL = { balloon: 2.2, tentacle: 1.6, lantern: 1.4, spiral: 1.2, eyestalk: 1.3, fan: 1.2,
  crystal: 0, bone: 0, pod: 0.3, jelly: 0.5, cactus: 0.2, spike: 0.3, orb: 1.5 };

const SHAPES = {
  tree: () => [['stem', at(new THREE.CylinderGeometry(0.05, 0.09, 0.6, 6), 0, 0.3, 0)],
    ['primary', at(new THREE.IcosahedronGeometry(0.35, 0), 0, 0.75, 0)]],
  mushroom: () => [['stem', at(new THREE.CylinderGeometry(0.05, 0.08, 0.7, 6), 0, 0.35, 0)],
    ['primary', at(new THREE.SphereGeometry(0.42, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1), 0, 0.68, 0)]],
  crystal: () => [['glow', merge([0, 1, 2].map((i) => tilt(at(new THREE.OctahedronGeometry(0.18, 0).scale(1, 3, 1), 0, 0.5, 0), (i - 1) * 0.35, (i % 2) * 0.3)))]],
  spike: () => [['primary', merge([at(new THREE.ConeGeometry(0.15, 1, 5), 0, 0.5, 0),
    tilt(at(new THREE.ConeGeometry(0.08, 0.6, 5), 0.12, 0.3, 0), 0, -0.4)])]],
  coral: () => [['primary', merge([0, 1, 2, 3].map((i) => tilt(at(new THREE.CylinderGeometry(0.03, 0.05, 0.8, 5), 0, 0.4, 0), Math.sin(i * 2) * 0.5, Math.cos(i * 2) * 0.5)))],
    ['secondary', merge([0, 1, 2, 3].map((i) => at(new THREE.SphereGeometry(0.07, 6, 4), Math.cos(i * 2) * -0.38, 0.72, Math.sin(i * 2) * 0.38)))]],
  bulb: () => [['stem', at(new THREE.CylinderGeometry(0.02, 0.04, 0.7, 5), 0, 0.35, 0)],
    ['glow', at(new THREE.SphereGeometry(0.28, 12, 8).scale(1, 1.2, 1), 0, 0.85, 0)]],
  tentacle: () => [['primary', merge([0, 1, 2].map((i) => {
    const a = (i / 3) * Math.PI * 2;
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * 0.15, 0.4, Math.sin(a) * 0.15),
      new THREE.Vector3(-Math.cos(a) * 0.1, 0.75, -Math.sin(a) * 0.1), new THREE.Vector3(Math.cos(a) * 0.2, 1, Math.sin(a) * 0.2)]);
    return new THREE.TubeGeometry(curve, 10, 0.05, 5, false);
  }))]],
  flower: () => [['stem', at(new THREE.CylinderGeometry(0.03, 0.05, 0.8, 5), 0, 0.4, 0)],
    ['primary', merge([0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i / 6) * Math.PI * 2;
      return at(new THREE.SphereGeometry(0.16, 6, 4).scale(1.6, 0.25, 0.8).rotateY(-a), Math.cos(a) * 0.2, 0.82, Math.sin(a) * 0.2);
    }))],
    ['glow', at(new THREE.SphereGeometry(0.1, 8, 6), 0, 0.85, 0)]],
  cactus: () => [['primary', merge([at(new THREE.CapsuleGeometry(0.14, 0.6, 3, 8), 0, 0.45, 0),
    at(new THREE.CapsuleGeometry(0.08, 0.25, 3, 6), 0.22, 0.5, 0), at(new THREE.CapsuleGeometry(0.08, 0.2, 3, 6), -0.2, 0.35, 0)])],
    ['secondary', merge([0, 1, 2].map((i) => at(new THREE.SphereGeometry(0.05, 6, 4), (i - 1) * 0.1, 0.92, 0)))]],
  orb: () => [['glow', at(new THREE.SphereGeometry(0.12, 12, 8), 0, 0.7, 0)],
    ['secondary', at(new THREE.TorusGeometry(0.2, 0.012, 4, 24).rotateX(Math.PI / 2 - 0.3), 0, 0.7, 0)],
    ['stem', at(new THREE.CylinderGeometry(0.008, 0.02, 0.6, 4), 0, 0.3, 0)]],
};

const SWAY_GLSL = `#include <begin_vertex>
float swH = max(position.y, 0.0);
vec3 swO = vec3(0.0);
#ifdef USE_INSTANCING
swO = instanceMatrix[3].xyz;
#endif
float swP = uFloraTime * 1.6 + swO.x * 0.15 + swO.z * 0.11;
transformed.x += sin(swP) * swH * swH * uSway;
transformed.z += sin(swP * 0.73 + 1.7) * swH * swH * uSway * 0.7;`;

// Vertex wind sway: displacement grows with height inside the unit-height model.
function addSway(mat, amount) {
  if (amount <= 0) return mat;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFloraTime = floraTime;
    shader.uniforms.uSway = { value: amount };
    shader.vertexShader = 'uniform float uFloraTime;\nuniform float uSway;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', SWAY_GLSL);
  };
  return mat;
}

const SPECIAL = {
  eye: () => ({ color: 0xf6f3ea, roughness: 0.3, emissive: 0x303030, emissiveIntensity: 1 }),
  pupil: () => ({ color: 0x07070a, roughness: 0.2 }),
  jelly: (g) => ({ color: g.primary, roughness: 0.15, transparent: true, opacity: 0.55, depthWrite: false,
    emissive: g.primary, emissiveIntensity: 0.35, flatShading: false }),
  bone: (g) => ({ color: mixHex(g.primary, 0xefe6d2, 0.75), roughness: 0.7 }),
};

function params(role, g) {
  if (SPECIAL[role]) return { flatShading: true, ...SPECIAL[role](g) };
  const color = role === 'stem' ? shiftHex(g.primary, 0.05, -0.3, -0.2) : role === 'secondary' ? g.secondary : g.primary;
  const glow = role === 'glow' || (g.glow && role === 'secondary');
  return { color: role === 'glow' ? g.secondary : color, flatShading: true, roughness: 0.85,
    emissive: glow ? (role === 'glow' ? g.secondary : color) : 0x000000, emissiveIntensity: glow ? (g.glow ? 1.2 : 0.35) : 0 };
}

function material(role, g) {
  const sway = (0.015 + (g.sway ?? 0.5) * 0.07) * (SWAY_MUL[g.shape] ?? 1);
  return addSway(new THREE.MeshStandardMaterial(params(role, g)), sway);
}

// -> [{ geometry, material }] for one flora species.
export function floraParts(species) {
  const g = species.genes;
  const make = SHAPES[g.shape] ?? WEIRD[g.shape] ?? SHAPES.tree;
  return make().map(([role, geometry]) => ({ geometry, material: material(role, g) }));
}
