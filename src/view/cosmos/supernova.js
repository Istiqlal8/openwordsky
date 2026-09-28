// Distant supernova: sky flash, expanding shock shell and ring, lingering nebula glow.
// Lives on a sky shell that follows the camera, so it is visible from anywhere in the system.
import * as THREE from 'three';
import { glowTexture } from '../../assets/textures.js';
import { shockTexture } from '../../fx/fx-textures.js';
import { NOISE } from './glsl.js';
import { rand, randomDir, glowSprite, envelope, disposeTree } from './util.js';

export const SUPERNOVA_LIFE = 22;
const PALETTES = [[0x9fd8ff, 0xff5fd0], [0xffc070, 0xff4040], [0x80ffd0, 0x6080ff], [0xfff0a0, 0xb070ff], [0xff90c0, 0x60c0ff]];

const SHELL_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  vP = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const SHELL_FRAG = /* glsl */ `
uniform vec3 uC1;
uniform vec3 uC2;
uniform float uAlpha;
uniform float uTime;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
${NOISE}
void main() {
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  float n = fbm(vP * 3.5 + vec3(uTime * 0.08));
  float fil = smoothstep(0.35, 0.8, n);
  vec3 col = mix(uC1, uC2, smoothstep(0.3, 0.7, fbm(vP * 1.7 - uTime * 0.05)));
  gl_FragColor = vec4(col * (pow(fres, 1.4) * 2.2 + 0.03) * (0.15 + 1.7 * fil) * uAlpha, 1.0);
}`;

const DOME_FRAG = /* glsl */ `
uniform vec3 uDir;
uniform vec3 uColor;
uniform float uFlash;
varying vec3 vP;
void main() {
  float f = max(dot(normalize(vP), uDir), 0.0);
  gl_FragColor = vec4(uColor * uFlash * (0.05 + 0.5 * pow(f, 4.0) + 1.2 * pow(f, 40.0)), 1.0);
}`;

function additive(extra) {
  return { transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, ...extra };
}

function buildShell() {
  const mat = new THREE.ShaderMaterial(additive({
    vertexShader: SHELL_VERT, fragmentShader: SHELL_FRAG, side: THREE.DoubleSide,
    uniforms: { uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() }, uAlpha: { value: 0 }, uTime: { value: 0 } },
  }));
  return new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), mat);
}

function buildDome() {
  const mat = new THREE.ShaderMaterial(additive({
    vertexShader: SHELL_VERT, fragmentShader: DOME_FRAG, side: THREE.BackSide,
    uniforms: { uDir: { value: new THREE.Vector3() }, uColor: { value: new THREE.Color() }, uFlash: { value: 0 } },
  }));
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(95000, 32, 16), mat);
  mesh.renderOrder = -3;
  return mesh;
}

export class Supernova {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'supernova';
    this.center = new THREE.Group();
    this.dome = buildDome();
    this.shell = buildShell();
    this.core = glowSprite(glowTexture(0xffffff));
    this.ring = glowSprite(shockTexture());
    this.nebula = [0, 1, 2].map(() => glowSprite(glowTexture(0xffffff)));
    this.center.add(this.shell, this.core, this.ring, ...this.nebula);
    this.group.add(this.dome, this.center);
    this.group.visible = false;
    this.age = SUPERNOVA_LIFE;
    this.flash = 0; // 0..1 sky flash level, readable by the host (e.g. to boost lighting)
  }

  get active() { return this.age < SUPERNOVA_LIFE; }

  trigger(dist = rand(30000, 80000)) {
    const [c1, c2] = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    randomDir(this.dome.material.uniforms.uDir.value);
    const dir = this.dome.material.uniforms.uDir.value;
    this.center.position.copy(dir).multiplyScalar(dist);
    this.scale = dist / 60000;
    this.shell.material.uniforms.uC1.value.set(c1);
    this.shell.material.uniforms.uC2.value.set(c2);
    this.shell.rotation.set(rand(0, 6), rand(0, 6), 0);
    this.dome.material.uniforms.uColor.value.set(c1).lerp(this.shell.material.uniforms.uC2.value, 0.3);
    this.ring.material.color.set(c2);
    this.ring.material.rotation = rand(0, 6);
    this.nebula.forEach((s, i) => {
      s.material.color.set(i === 1 ? c2 : c1);
      s.position.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(4000 * this.scale);
    });
    this.core.visible = this.ring.visible = true;
    for (const s of this.nebula) s.visible = true;
    this.group.visible = true;
    this.age = 0;
  }

  update(dt, camera) {
    if (!this.active) return;
    this.age += dt;
    this.group.position.copy(camera.position);
    const a = this.age;
    const k = this.scale;
    this.flash = envelope(a, 0.12, 4);
    this.dome.material.uniforms.uFlash.value = this.flash;
    this.core.scale.setScalar(k * (5000 + 30000 * envelope(a, 0.15, 2.5) + 4000 * envelope(a, 1, SUPERNOVA_LIFE)));
    this.core.material.opacity = Math.min(1, envelope(a, 0.1, SUPERNOVA_LIFE) * 1.5);
    this.shell.scale.setScalar(k * 17000 * (1 - Math.exp(-a / 4)));
    this.shell.material.uniforms.uAlpha.value = envelope(a, 0.6, SUPERNOVA_LIFE - 2);
    this.shell.material.uniforms.uTime.value = a;
    this.ring.scale.setScalar(k * 50000 * (1 - Math.exp(-a / 3)));
    this.ring.material.opacity = envelope(a, 0.3, 11);
    for (let i = 0; i < this.nebula.length; i++) {
      const s = this.nebula[i];
      s.scale.setScalar(k * (8000 + 26000 * Math.sqrt(a / SUPERNOVA_LIFE) * (1 + i * 0.3)));
      s.material.opacity = envelope(a, 3 + i, SUPERNOVA_LIFE) * 0.8;
    }
    if (!this.active) this.group.visible = false;
  }

  dispose() {
    disposeTree(this.group);
  }
}
