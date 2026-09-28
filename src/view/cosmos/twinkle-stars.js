// Twinkling star layer that follows the camera; adds to the space view's static starfield.
import * as THREE from 'three';
import { Rng } from '../../core/rng.js';

const RADIUS = 120000;
const HUES = [0x9fc4ff, 0xffffff, 0xfff1c8, 0xffc890, 0xff9f80, 0xc8b0ff];

const VERT = /* glsl */ `
attribute float aPhase;
attribute float aSize;
attribute vec3 aColor;
uniform float uTime;
uniform float uScale;
varying vec3 vColor;
varying float vBright;
void main() {
  float tw = 0.5 + 0.5 * sin(uTime * (1.3 + aPhase * 2.4) + aPhase * 40.0);
  tw *= 0.6 + 0.4 * sin(uTime * (0.37 + aPhase) + aPhase * 17.0);
  vBright = 0.35 + 0.95 * tw;
  vColor = aColor;
  gl_PointSize = aSize * uScale * (0.75 + 0.5 * tw);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Soft core plus a faint 4-point cross flare on the bigger stars.
const FRAG = /* glsl */ `
varying vec3 vColor;
varying float vBright;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  float core = exp(-r * r * 9.0);
  float cross = exp(-abs(p.x) * 14.0) * exp(-abs(p.y) * 2.5) + exp(-abs(p.y) * 14.0) * exp(-abs(p.x) * 2.5);
  float a = core + cross * 0.35;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * a * vBright, 1.0);
}`;

function fillStars(rng, count) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const size = new Float32Array(count);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = rng.next() * 2 - 1;
    const th = rng.next() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u) * RADIUS;
    pos.set([Math.cos(th) * s, u * RADIUS, Math.sin(th) * s], i * 3);
    c.set(rng.pick(HUES)).multiplyScalar(rng.range(0.55, 1.1));
    col.set([c.r, c.g, c.b], i * 3);
    phase[i] = rng.next();
    size[i] = rng.chance(0.06) ? rng.range(6, 10) : rng.range(2.2, 4.5);
  }
  return { pos, col, phase, size };
}

export class TwinkleStars {
  constructor(seed, count = 3200) {
    const d = fillStars(new Rng(seed ^ 0x7a11), count);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(d.col, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(d.phase, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(d.size, 1));
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uTime: { value: 0 }, uScale: { value: 1 } },
      transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = -2;
    this.time = 0;
  }

  update(dt, camera) {
    this.time += dt;
    this.material.uniforms.uTime.value = this.time;
    this.material.uniforms.uScale.value = Math.min(2, (window.devicePixelRatio || 1));
    this.points.position.copy(camera.position);
  }

  dispose() {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
