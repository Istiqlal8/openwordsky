// Earth flora models (unit height, scaled per instance) and which biomes grow them.
// Each species -> parts [{ geometry, material, hue }]; `hue` parts get a random color per plant.
import * as THREE from 'three';
import { merge, at, tilt, V, tube, ring } from '../view/life/flora-geo.js';
import { floraTime } from '../view/life/flora-builder.js';
import { shiftHex } from '../core/color.js';

const blob = (r, x, y, z, sy = 1) => at(new THREE.IcosahedronGeometry(r, 0).scale(1, sy, 1), x, y, z);
const trunk = (r0, r1, h) => at(new THREE.CylinderGeometry(r1, r0, h, 6), 0, h / 2, 0);
const blade = (w, h, lean, a) => tilt(at(new THREE.ConeGeometry(w, h, 3), 0, h / 2, 0), 0, lean).rotateY(a);

// shape -> [[role, geometry]]; roles: wood, leaf, accent (secondary color), hue (random color).
const SHAPES = {
  oak: () => [['wood', merge([trunk(0.07, 0.045, 0.5), tilt(trunk(0.03, 0.02, 0.25), 0, 0.8).translate(0, 0.35, 0)])],
    ['leaf', merge([blob(0.26, 0, 0.66, 0), blob(0.2, 0.2, 0.58, 0.05), blob(0.2, -0.18, 0.6, -0.08),
      blob(0.18, 0.02, 0.84, 0.12, 0.9), blob(0.17, -0.06, 0.62, 0.2)])]],
  birch: () => [['accent', trunk(0.035, 0.025, 0.75)],
    ['leaf', merge([blob(0.15, 0, 0.62, 0, 1.4), blob(0.13, 0.08, 0.82, 0.03, 1.3), blob(0.12, -0.07, 0.72, -0.05, 1.3)])]],
  pine: () => [['wood', trunk(0.04, 0.02, 0.35)],
    ['leaf', merge([0, 1, 2, 3].map((i) => at(new THREE.ConeGeometry(0.3 - i * 0.055, 0.34, 7), 0, 0.3 + i * 0.19, 0)))]],
  spruce: () => [['wood', trunk(0.035, 0.02, 0.2)],
    ['leaf', merge([at(new THREE.ConeGeometry(0.22, 0.75, 7), 0, 0.5, 0), at(new THREE.ConeGeometry(0.16, 0.4, 7), 0, 0.85, 0)])]],
  palm: () => [['wood', tube([V(0, 0, 0), V(0.08, 0.35, 0), V(0.22, 0.7, 0), V(0.32, 0.95, 0)], 0.035, 10, 5)],
    ['leaf', ring(8, (i, a) => new THREE.BoxGeometry(0.42, 0.012, 0.09).translate(0.2, 0, 0)
      .rotateZ(-0.35 - (i % 2) * 0.25).rotateY(a).translate(0.32, 0.95, 0))],
    ['accent', merge([0, 1, 2].map((i) => blob(0.035, 0.3 + Math.cos(i * 2) * 0.04, 0.91, Math.sin(i * 2) * 0.04)))]],
  bush: () => [['leaf', merge([blob(0.42, 0, 0.42, 0, 0.8), blob(0.32, 0.3, 0.3, 0.12), blob(0.3, -0.26, 0.32, -0.1)])]],
  flowers: () => [['leaf', ring(7, (i, a) => blade(0.02, 0.8, 0.2, a).translate(Math.cos(a * 3) * 0.35, 0, Math.sin(a * 3) * 0.35))],
    ['hue', ring(7, (i, a) => blob(0.08, Math.cos(a * 3) * 0.35 + Math.sin(a) * 0.15, 0.8, Math.sin(a * 3) * 0.35 - Math.cos(a) * 0.15, 0.6))]],
  tallgrass: () => [['leaf', ring(11, (i, a) => blade(0.035, 0.7 + (i % 3) * 0.15, 0.25 + (i % 2) * 0.2, a))]],
  cactus: () => [['leaf', merge([at(new THREE.CapsuleGeometry(0.09, 0.8, 3, 8), 0, 0.48, 0),
    at(new THREE.CapsuleGeometry(0.05, 0.2, 3, 6), 0.16, 0.5, 0), at(new THREE.CapsuleGeometry(0.05, 0.22, 3, 6), 0.21, 0.66, 0),
    at(new THREE.CapsuleGeometry(0.05, 0.18, 3, 6), -0.15, 0.4, 0), at(new THREE.CapsuleGeometry(0.045, 0.2, 3, 6), -0.19, 0.55, 0)])],
    ['accent', blob(0.04, 0, 0.98, 0)]],
  reeds: () => [['leaf', ring(9, (i, a) => blade(0.02, 0.85 + (i % 3) * 0.08, 0.12, a).translate(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12))],
    ['accent', ring(4, (i, a) => at(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 5), Math.cos(a) * 0.13, 0.92, Math.sin(a) * 0.13))]],
  fern: () => [['leaf', ring(7, (i, a) => new THREE.SphereGeometry(0.5, 6, 3).scale(0.9, 0.06, 0.2)
    .translate(0.45, 0, 0).rotateZ(0.55).rotateY(a).translate(0, 0.25, 0))]],
  mushroom: () => [['accent', merge([0, 1, 2].map((i) => at(new THREE.CylinderGeometry(0.06, 0.08, 0.6 - i * 0.15, 6), i * 0.25 - 0.2, 0.3 - i * 0.075, i * 0.12)))],
    ['leaf', merge([0, 1, 2].map((i) => at(new THREE.SphereGeometry(0.26 - i * 0.05, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1),
      i * 0.25 - 0.2, 0.58 - i * 0.15, i * 0.12)))]],
};
const SWAY = { tallgrass: 0.1, flowers: 0.07, reeds: 0.09, fern: 0.03, palm: 0.02, bush: 0.015, cactus: 0 };
const DOUBLE = new Set(['palm', 'fern']);

// Per biome: [probability a 5 m cell holds a plant, { shape: weight }].
export const EARTH_FLORA_BIOMES = {
  beach: [0.14, { palm: 2, reeds: 1.2, tallgrass: 0.6 }],
  grass: [0.32, { oak: 0.6, birch: 0.25, bush: 1.2, flowers: 2.2, tallgrass: 2.5 }],
  forest: [0.85, { oak: 3, birch: 1.4, pine: 0.5, bush: 1.2, fern: 1.8, mushroom: 0.6, flowers: 0.2 }],
  pine: [0.6, { pine: 3, spruce: 2, bush: 0.4, fern: 0.4 }],
  desert: [0.07, { cactus: 2, bush: 0.6, tallgrass: 0.5 }],
  rock: [0.04, { spruce: 1, bush: 1 }],
  snow: [0.03, { spruce: 1 }],
};

const SWAY_GLSL = `#include <begin_vertex>
float swH = max(position.y, 0.0);
vec3 swO = vec3(0.0);
#ifdef USE_INSTANCING
swO = instanceMatrix[3].xyz;
#endif
float swP = uFloraTime * 1.7 + swO.x * 0.13 + swO.z * 0.09;
transformed.x += sin(swP) * swH * swH * uSway;
transformed.z += sin(swP * 0.71 + 1.3) * swH * swH * uSway * 0.7;`;

// Wind sway on the shared flora clock (floraTime is advanced by the surface mode).
export function withSway(mat, amount) {
  if (!amount) return mat;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFloraTime = floraTime;
    shader.uniforms.uSway = { value: amount };
    shader.vertexShader = 'uniform float uFloraTime;\nuniform float uSway;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', SWAY_GLSL);
  };
  mat.customProgramCacheKey = () => `sway${amount}`;
  return mat;
}

function colorOf(role, g) {
  if (role === 'wood') return shiftHex(g.secondary, 0, -0.1, -0.05);
  if (role === 'accent') return g.secondary;
  if (role === 'hue') return 0xffffff;
  return g.primary;
}

// -> [{ geometry, material, hue }] for one Earth flora species.
export function earthFloraParts(species) {
  const g = species.genes, shape = g.shape;
  return (SHAPES[shape] ?? SHAPES.bush)().map(([role, geometry]) => ({
    geometry, hue: role === 'hue',
    material: withSway(new THREE.MeshStandardMaterial({ color: colorOf(role, g), flatShading: true, roughness: 0.9,
      side: DOUBLE.has(shape) ? THREE.DoubleSide : THREE.FrontSide }), role === 'wood' ? (SWAY[shape] ?? 0.012) * 0.3 : SWAY[shape] ?? 0.012),
  }));
}
