// Shaders for the black hole: accretion disk, gravitational lens billboard and infalling streaks.
import { NOISE } from './glsl.js';

export const DISK_VERT = /* glsl */ `
varying vec2 vLocal;
varying vec3 vWorld;
void main() {
  vLocal = position.xy;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

// Hot inner edge -> red outer rim, differential rotation (flow-map crossfade keeps shear bounded),
// relativistic doppler beaming: the side moving toward the camera is brighter and whiter.
export const DISK_FRAG = /* glsl */ `
uniform float uInner;
uniform float uOuter;
uniform float uTime;
uniform float uIntensity;
uniform float uSeed;
uniform vec3 uHot;
uniform vec3 uMid;
uniform vec3 uCool;
uniform vec3 uCenter;
uniform vec3 uNormal;
varying vec2 vLocal;
varying vec3 vWorld;
${NOISE}
float swirl(float r, float a, float ph, float cycle) {
  float omega = 1.4 * pow(uInner / r, 1.5);
  float ang = a - omega * ph * 14.0 - uTime * 0.05;
  float lr = log(r / uInner);
  vec3 p = vec3(cos(ang) * 2.2, sin(ang) * 2.2, lr * 16.0 + cycle * 7.3 + uSeed);
  vec3 q = vec3(cos(ang) * 6.0, sin(ang) * 6.0, lr * 5.0 - cycle * 3.1);
  return fbm(p) * 0.65 + fbm(q) * 0.55;
}
void main() {
  float r = length(vLocal);
  float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
  float a = atan(vLocal.y, vLocal.x);
  float c = uTime / 14.0;
  float ph = fract(c);
  float w = 1.0 - abs(2.0 * ph - 1.0);
  float n = swirl(r, a, ph, floor(c)) * w + swirl(r, a, fract(c + 0.5), floor(c + 0.5) + 0.5) * (1.0 - w);
  float heat = pow(1.0 - t, 1.8);
  vec3 col = mix(uCool, uMid, smoothstep(0.0, 0.45, heat));
  col = mix(col, uHot, smoothstep(0.45, 1.0, heat));
  float dens = smoothstep(0.0, 0.035, t) * (1.0 - smoothstep(0.55, 1.0, t));
  dens *= 0.12 + 1.7 * smoothstep(0.38, 0.9, n);
  vec3 radial = normalize(vWorld - uCenter);
  vec3 vel = normalize(cross(uNormal, radial));
  float dop = dot(vel, normalize(cameraPosition - vWorld));
  float beam = pow(1.0 + 0.5 * dop, 2.6);
  col = mix(col, vec3(0.85, 0.9, 1.0) * 1.3, clamp(dop, 0.0, 1.0) * 0.35 * heat);
  float glow = 0.3 + 1.2 * heat + 0.8 * pow(heat, 8.0);
  gl_FragColor = vec4(col * dens * glow * beam * uIntensity, 1.0);
}`;

export const LENS_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

// Fake gravitational lens: each pixel's view ray is bent toward the hole (point-lens deflection
// thetaE^2 / theta) and re-samples the nebula background plus a procedural star field, giving a
// warped Einstein ring. Also draws the photon ring and the lensed image of the disk's far side.
export const LENS_FRAG = /* glsl */ `
uniform vec3 uCenter;
uniform float uR;
uniform float uLensR;
uniform float uEin;
uniform float uTime;
uniform sampler2D uBg;
uniform float uHasBg;
uniform float uBgIntensity;
uniform vec3 uNormal;
uniform vec3 uHot;
uniform vec3 uMid;
varying vec3 vWorld;
${NOISE}
vec2 eqUv(vec3 d) {
  return vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
}
float stars(vec3 s) {
  vec3 g = s * 260.0;
  vec3 id = floor(g);
  float h = hash13(id);
  vec3 jit = vec3(hash13(id + 1.3), hash13(id + 2.1), hash13(id + 3.7)) - 0.5;
  float d = length(fract(g) - 0.5 - jit * 0.5);
  return step(0.975, h) * smoothstep(0.16, 0.0, d) * (0.5 + 2.0 * hash13(id + 7.7));
}
vec3 diskArc(float b, vec3 d, vec3 o) {
  vec3 up = normalize(uNormal - dot(uNormal, d) * d + 1e-5);
  float edgeOn = 1.0 - abs(dot(uNormal, d));
  float cosPhi = dot(o, up);
  float x = b / uR;
  float prof = smoothstep(1.1, 1.2, x) * (1.0 - smoothstep(1.3, 2.0, x));
  float ang = atan(dot(o, cross(up, d)), cosPhi) - uTime * 0.35;
  float n = fbm(vec3(cos(ang) * 4.0, sin(ang) * 4.0, x * 14.0));
  float shape = mix(1.0, pow(abs(cosPhi), 0.8), edgeOn * 0.9);
  float dop = dot(cross(uNormal, o), -d);
  vec3 col = mix(uMid, uHot, 1.0 - smoothstep(1.15, 1.7, x));
  return col * prof * shape * (0.15 + 1.7 * smoothstep(0.35, 0.85, n)) * (1.0 + 0.6 * dop);
}
void main() {
  vec3 d = normalize(vWorld - cameraPosition);
  vec3 toC = uCenter - cameraPosition;
  float D = length(toC);
  vec3 perp = toC - dot(toC, d) * d;
  float b = length(perp);
  float fade = 1.0 - smoothstep(0.5, 1.0, b / uLensR);
  if (fade <= 0.0) discard;
  vec3 n = perp / max(b, 1e-4);
  float theta = b / D;
  float thetaE = uEin / D;
  float bend = min(thetaE * thetaE / max(theta, 1e-6), 3.0);
  vec3 s = normalize(d * cos(bend) + n * sin(bend));
  vec3 bg = uHasBg * texture2D(uBg, eqUv(s)).rgb * uBgIntensity;
  bg += vec3(0.9, 0.95, 1.0) * stars(s);
  float mag = clamp(thetaE / max(abs(theta - thetaE), 1e-4) * 0.08, 0.0, 1.2);
  bg *= 1.0 + mag;
  float photon = exp(-pow((b / uR - 1.06) / 0.035, 2.0)) * 2.4 + exp(-pow((b / uR - 1.06) / 0.14, 2.0)) * 0.5;
  vec3 halo = uMid * exp(-(b / uR - 1.0) * 0.9) * 0.10;
  vec3 emit = uHot * photon + diskArc(b, d, -n) + halo;
  float shadow = step(b, uR * 1.0);
  vec4 col = vec4((bg * fade + emit * fade) * (1.0 - shadow), max(fade, shadow));
  gl_FragColor = col;
  #include <colorspace_fragment>
}`;

// Streaks spiralling inward; each segment is two vertices (head aTail = 0, tail aTail = 1).
export const FALL_VERT = /* glsl */ `
attribute vec4 aSeed;
attribute float aTail;
uniform float uTime;
uniform float uInner;
uniform float uOuter;
uniform float uR;
varying float vPh;
void main() {
  float ph = clamp(fract(uTime * aSeed.y + aSeed.z) - aTail * 0.014, 0.0, 1.0);
  vPh = ph * (1.0 - aTail * 0.8);
  float rad = mix(uOuter, uInner, pow(ph, 0.75));
  float ang = aSeed.x + ph * 5.0 + ph * ph * ph * 7.0;
  float h = aSeed.w * uR * (1.0 - ph) * (1.0 - ph);
  vec3 p = vec3(cos(ang) * rad, h, -sin(ang) * rad);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

export const FALL_FRAG = /* glsl */ `
uniform vec3 uHot;
uniform vec3 uCool;
varying float vPh;
void main() {
  float k = smoothstep(0.0, 0.15, vPh) * (1.0 - smoothstep(0.93, 1.0, vPh));
  gl_FragColor = vec4(mix(uCool, uHot, vPh) * k * (0.25 + 0.9 * vPh), 1.0);
}`;
