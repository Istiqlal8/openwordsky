// GLSL for the gas-dive clouds: wrapped instanced billboards and wide layer planes.
// Both sample the planet band texture by world Z, darken with depth and glow near lightning.
import * as THREE from 'three';

const LIGHTING = /* glsl */ `
uniform sampler2D uBand;
uniform float uBandPeriod, uTime, uFlashRange;
uniform vec3 uCam, uLightTop, uLightDeep, uFlashPos, uFlashCol;
vec3 bandAt(float z) { return texture2D(uBand, vec2(0.5, fract(z / uBandPeriod))).rgb; }
vec3 lightAt(float y) { return mix(uLightDeep, uLightTop, smoothstep(-3000.0, 300.0, y)); }
vec3 flashAt(vec3 p) { return uFlashCol * exp(-distance(p, uFlashPos) / uFlashRange); }
`;

const TAIL = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
`;

export const SPRITE_VERT = /* glsl */ `
attribute vec3 iBase;
attribute vec4 iData; // size, uv angle, shade, x stretch
uniform float uSpan, uOpacity;
uniform vec2 uWind;
varying vec2 vUv;
varying vec3 vCol;
varying float vAlpha;
${LIGHTING}
#include <fog_pars_vertex>
void main() {
  vec3 p = iBase;
  p.xz += uWind * uTime;
  vec2 rel = mod(p.xz - uCam.xz + 0.5 * uSpan, uSpan) - 0.5 * uSpan;
  p.xz = uCam.xz + rel;
  float edge = 1.0 - smoothstep(0.3 * uSpan, 0.5 * uSpan, length(rel));
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  mvPosition.xy += position.xy * vec2(iData.w, 1.0) * iData.x;
  float nearFade = smoothstep(iData.x * 0.1, iData.x * 0.5, length(mvPosition.xyz));
  float ca = cos(iData.y), sa = sin(iData.y);
  vUv = vec2(ca * position.x - sa * position.y, sa * position.x + ca * position.y) + 0.5;
  float shade = iData.z * mix(0.7, 1.12, position.y + 0.5);
  vCol = bandAt(p.z) * lightAt(p.y) * shade + flashAt(p);
  vAlpha = edge * nearFade * uOpacity;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

export const SPRITE_FRAG = /* glsl */ `
uniform sampler2D uMap;
varying vec2 vUv;
varying vec3 vCol;
varying float vAlpha;
#include <common>
#include <fog_pars_fragment>
void main() {
  float a = texture2D(uMap, vUv).a * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vCol, a);
  ${TAIL}
}`;

export const DECK_VERT = /* glsl */ `
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

export const DECK_FRAG = /* glsl */ `
uniform sampler2D uDeck;
uniform float uTile, uCover, uOpacity, uRadius;
uniform vec2 uWind;
varying vec3 vWorld;
${LIGHTING}
#include <common>
#include <fog_pars_fragment>
void main() {
  vec2 xz = vWorld.xz;
  float n1 = texture2D(uDeck, (xz + uWind * uTime) / uTile).r;
  float n2 = texture2D(uDeck, (xz - uWind * uTime * 0.6) / (uTile * 0.31)).r;
  float n = n1 * 0.72 + n2 * 0.28;
  float cover = smoothstep(uCover, uCover + 0.16, n);
  float edge = 1.0 - smoothstep(0.55 * uRadius, uRadius, length(xz - uCam.xz));
  float a = cover * edge * uOpacity;
  if (a < 0.01) discard;
  vec3 col = bandAt(vWorld.z) * lightAt(vWorld.y) * (0.72 + 0.5 * n2) + flashAt(vWorld);
  gl_FragColor = vec4(col, a);
  ${TAIL}
}`;

// Uniforms every cloud material shares (updated once per frame by CloudSea).
export function sharedCloudUniforms(bandTex, bandPeriod) {
  return {
    uBand: { value: bandTex }, uBandPeriod: { value: bandPeriod }, uTime: { value: 0 },
    uCam: { value: new THREE.Vector3() }, uLightTop: { value: new THREE.Color(1, 1, 1) },
    uLightDeep: { value: new THREE.Color(0.1, 0.1, 0.1) }, uFlashPos: { value: new THREE.Vector3(0, -1e6, 0) },
    uFlashCol: { value: new THREE.Color(0, 0, 0) }, uFlashRange: { value: 500 },
  };
}

export function cloudMaterial(vertexShader, fragmentShader, shared, own) {
  return new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...shared, ...own },
    vertexShader, fragmentShader, fog: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}
