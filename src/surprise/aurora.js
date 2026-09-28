// Night-time aurora: additive wavy curtains high in the sky of cold or exotic planets.
import * as THREE from 'three';
import { rngOf, unitOf } from '../core/rng.js';

const VERT = /* glsl */`
uniform float uTime; uniform float uPhase;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  p.z += sin(p.x * 0.005 + uTime * 0.25 + uPhase) * 70.0 + sin(p.x * 0.017 - uTime * 0.6) * 22.0;
  p.y += sin(p.x * 0.009 + uTime * 0.4) * 18.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */`
uniform float uTime; uniform float uStrength; uniform vec3 uLow; uniform vec3 uHigh;
varying vec2 vUv;
void main() {
  float v = vUv.y, u = vUv.x;
  float rays = 0.55 + 0.45 * sin(u * 140.0 + sin(u * 23.0 + uTime * 0.7) * 4.0 + uTime * 1.3);
  float band = smoothstep(0.0, 0.12, v) * pow(1.0 - v, 1.6);
  float ends = smoothstep(0.0, 0.12, u) * smoothstep(1.0, 0.88, u);
  float shimmer = 0.75 + 0.25 * sin(uTime * 0.9 + u * 9.0);
  vec3 col = mix(uLow, uHigh, smoothstep(0.15, 0.85, v));
  gl_FragColor = vec4(col * band * ends * rays * shimmer * uStrength, 1.0);
}`;

// Cold planets always, a few exotic ones too.
export function hasAurora(planet) {
  if (planet.gas || !planet.biome) return false;
  if (planet.temperature < 0) return true;
  return planet.biome.id === 'exotic' && unitOf(planet.seed, 0xa0a0) < 0.6;
}

export class Aurora {
  constructor(parent, planet) {
    this.parent = parent;
    this.group = new THREE.Group();
    this.group.visible = false;
    const rng = rngOf(planet.seed, 0xa0a1);
    const exotic = planet.biome.id === 'exotic';
    this.uniforms = { uTime: { value: 0 }, uStrength: { value: 0 },
      uLow: { value: new THREE.Color(exotic ? 0xff5ad8 : 0x3dff8c) },
      uHigh: { value: new THREE.Color(exotic ? 0x4ad8ff : 0x9a4dff) } };
    this.geo = new THREE.PlaneGeometry(1600, 220, 128, 1);
    this.mats = [];
    for (let i = 0, n = 3 + rng.int(2); i < n; i++) this.addCurtain(rng, i);
    this.group.rotation.y = rng.range(0, Math.PI * 2);
    parent.add(this.group);
  }

  addCurtain(rng, i) {
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { ...this.uniforms, uPhase: { value: rng.range(0, 6.3) } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.position.set(rng.range(-300, 300), 330 + i * 45 + rng.range(0, 60), -550 - i * 160);
    mesh.rotation.set(rng.range(-0.15, 0.15), rng.range(-0.5, 0.5), 0);
    mesh.frustumCulled = false;
    this.mats.push(mat);
    this.group.add(mesh);
  }

  // night: 0..1 from the day cycle.
  update(dt, night) {
    const s = night * night;
    this.group.visible = s > 0.01;
    if (!this.group.visible) return;
    this.uniforms.uTime.value += dt;
    this.uniforms.uStrength.value = s * 1.1;
  }

  dispose() {
    this.parent.remove(this.group);
    this.geo.dispose();
    for (const m of this.mats) m.dispose();
  }
}
