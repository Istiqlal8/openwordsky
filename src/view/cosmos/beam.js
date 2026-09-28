// Camera-facing curved beam along local +Y: relativistic jets and comet tails.
// Width is billboarded in the vertex shader, so the beam looks solid from any angle.
import * as THREE from 'three';
import { NOISE } from './glsl.js';

const VERT = /* glsl */ `
uniform float uLen;
uniform float uW0;
uniform float uW1;
uniform float uBend;
varying float vT;
varying float vS;
void main() {
  float t = uv.y;
  vT = t;
  vS = uv.x * 2.0 - 1.0;
  vec3 local = vec3(uBend * t * t * uLen, t * uLen, 0.0);
  vec3 tangent = vec3(2.0 * uBend * t, 1.0, 0.0);
  vec3 wp = (modelMatrix * vec4(local, 1.0)).xyz;
  vec3 axis = normalize(mat3(modelMatrix) * tangent);
  vec3 side = normalize(cross(axis, cameraPosition - wp));
  float w = mix(uW0, uW1, pow(t, 0.7));
  wp += side * w * vS;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uCore;
uniform float uIntensity;
uniform float uTime;
uniform float uSpeed;
uniform float uStreaks;
uniform float uFade;
varying float vT;
varying float vS;
${NOISE}
void main() {
  float across = 1.0 - vS * vS;
  float core = pow(across, 6.0);
  float body = pow(across, 1.5);
  float along = smoothstep(0.0, 0.04, vT) * pow(1.0 - vT, uFade);
  float n = fbm(vec3(vS * 3.0, vT * uStreaks - uTime * uSpeed, uTime * 0.3));
  float knots = 0.55 + 0.9 * n;
  vec3 col = uColor * body * knots + uCore * core * (0.6 + 0.6 * n);
  gl_FragColor = vec4(col * along * uIntensity, 1.0);
}`;

// Returns a mesh whose material uniforms can be tuned (uLen, uW0, uW1, uBend, uIntensity...).
export function buildBeam({ color, core = 0xffffff, len, w0, w1, bend = 0, speed = 1, streaks = 6, fade = 1.5 }) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {
      uLen: { value: len }, uW0: { value: w0 }, uW1: { value: w1 }, uBend: { value: bend },
      uColor: { value: new THREE.Color(color) }, uCore: { value: new THREE.Color(core) },
      uIntensity: { value: 1 }, uTime: { value: 0 }, uSpeed: { value: speed },
      uStreaks: { value: streaks }, uFade: { value: fade },
    },
    transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 48), mat);
  mesh.frustumCulled = false;
  return mesh;
}
