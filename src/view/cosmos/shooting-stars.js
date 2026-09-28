// Shooting stars: pooled camera-facing streaks on a sphere around the camera (space and surface).
import * as THREE from 'three';
import { rand, randomDir } from './util.js';

const COLORS = [0xe8f0ff, 0xbfe0ff, 0xc8ffd8, 0xffd9a8, 0xffffff];

const VERT = /* glsl */ `
attribute float aT;
attribute float aSide;
attribute float aAlpha;
attribute vec3 aColor;
varying float vT;
varying float vSide;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vT = aT; vSide = aSide; vAlpha = aAlpha; vColor = aColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform float uGain;
varying float vT;
varying float vSide;
varying float vAlpha;
varying vec3 vColor;
void main() {
  float across = 1.0 - abs(vSide);
  float k = pow(vT, 2.2) * across * across;
  vec3 col = mix(vColor, vec3(1.3), pow(vT, 8.0));
  float head = smoothstep(0.9, 1.0, vT) * across * 2.0;
  gl_FragColor = vec4((col * k + vec3(head)) * vAlpha * uGain * 1.8, 1.0);
}`;

const tmpH = new THREE.Vector3();
const tmpT = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpR = new THREE.Vector3();
const tmpC = new THREE.Color();

function buildGeometry(count) {
  const geo = new THREE.BufferGeometry();
  const t = new Float32Array(count * 4);
  const side = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    t.set([0, 0, 1, 1], i * 4);
    side.set([-1, 1, -1, 1], i * 4);
  }
  const idx = [];
  for (let i = 0; i < count; i++) idx.push(i * 4, i * 4 + 2, i * 4 + 1, i * 4 + 1, i * 4 + 2, i * 4 + 3);
  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 12), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(count * 4), 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(count * 12), 3));
  geo.setAttribute('aT', new THREE.BufferAttribute(t, 1));
  geo.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  return geo;
}

export class ShootingStars {
  // opts: radius (world units), width, count, gap [min,max] seconds, upper (sky hemisphere only)
  constructor({ radius = 9000, width = 30, count = 6, gap = [3, 10], upper = false } = {}) {
    this.opts = { radius, width, gap, upper };
    this.items = Array.from({ length: count }, () => ({
      age: 1, life: 0, dir: new THREE.Vector3(), axis: new THREE.Vector3(), speed: 0, len: 0, width: 0,
    }));
    this.geo = buildGeometry(count);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms: { uGain: { value: 1 } }, transparent: true, depthWrite: false, fog: false,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.frustumCulled = false;
    this.timer = rand(0.5, gap[0]);
    this.fwd = new THREE.Vector3(0, 0, -1);
  }

  // rate scales how often meteors appear (0 = none, e.g. daytime); gain scales brightness.
  update(dt, camera, rate = 1, gain = 1) {
    this.material.uniforms.uGain.value = gain;
    this.mesh.position.copy(camera.position);
    camera.getWorldDirection(this.fwd);
    this.timer -= dt * rate;
    if (this.timer <= 0 && rate > 0) {
      this.timer = rand(this.opts.gap[0], this.opts.gap[1]);
      this.spawn(rate > 1.5 ? 2 : 1);
    }
    for (let i = 0; i < this.items.length; i++) this.draw(this.items[i], i, dt);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  }

  spawn(n) {
    for (let k = 0; k < n; k++) {
      const m = this.items.find((it) => it.age >= it.life);
      if (!m) return;
      this.launch(m, this.items.indexOf(m));
    }
  }

  launch(m, i) {
    const up = this.opts.upper;
    randomDir(m.dir);
    if (Math.random() < 0.6) m.dir.multiplyScalar(0.55).add(this.fwd); // most start in view
    if (up) m.dir.y = Math.max(m.dir.y, 0) * 0.6 + rand(0.15, 0.5);
    m.dir.normalize();
    randomDir(tmpT);
    if (up) tmpT.y = -Math.abs(tmpT.y) - 0.4;
    tmpT.addScaledVector(m.dir, -tmpT.dot(m.dir)).normalize();
    m.axis.crossVectors(m.dir, tmpT).normalize();
    m.speed = rand(0.25, 0.6);
    m.len = rand(0.08, 0.2);
    m.width = this.opts.width * rand(0.7, 1.4);
    m.age = 0;
    m.life = rand(0.6, 1.5);
    tmpC.set(COLORS[Math.floor(Math.random() * COLORS.length)]);
    const col = this.geo.attributes.aColor;
    for (let v = 0; v < 4; v++) col.setXYZ(i * 4 + v, tmpC.r, tmpC.g, tmpC.b);
    col.needsUpdate = true;
  }

  draw(m, i, dt) {
    const alpha = this.geo.attributes.aAlpha;
    const live = m.age < m.life;
    m.age += dt;
    const k = live ? Math.sin(Math.PI * Math.min(1, m.age / m.life)) : 0;
    for (let v = 0; v < 4; v++) alpha.setX(i * 4 + v, k);
    if (!live) return;
    const R = this.opts.radius;
    const travel = m.speed * m.age;
    tmpH.copy(m.dir).applyAxisAngle(m.axis, travel).multiplyScalar(R);
    tmpT.copy(m.dir).applyAxisAngle(m.axis, Math.max(0, travel - Math.min(m.len, travel * 1.5))).multiplyScalar(R);
    tmpS.subVectors(tmpH, tmpT).cross(tmpH).normalize();
    const pos = this.geo.attributes.position;
    const w = m.width;
    pos.setXYZ(i * 4, tmpT.x - tmpS.x * w * 0.3, tmpT.y - tmpS.y * w * 0.3, tmpT.z - tmpS.z * w * 0.3);
    pos.setXYZ(i * 4 + 1, tmpT.x + tmpS.x * w * 0.3, tmpT.y + tmpS.y * w * 0.3, tmpT.z + tmpS.z * w * 0.3);
    tmpR.copy(tmpS).multiplyScalar(w);
    pos.setXYZ(i * 4 + 2, tmpH.x - tmpR.x, tmpH.y - tmpR.y, tmpH.z - tmpR.z);
    pos.setXYZ(i * 4 + 3, tmpH.x + tmpR.x, tmpH.y + tmpR.y, tmpH.z + tmpR.z);
  }

  dispose() {
    this.mesh.removeFromParent();
    this.geo.dispose();
    this.material.dispose();
  }
}
