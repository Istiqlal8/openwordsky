// Earth's sky: a blue gradient dome (pale at the horizon, deep blue overhead, bright around the
// sun), a drifting cloud layer at ~520 m, and the Moon. Colors follow the day-night cycle.
import * as THREE from 'three';
import { hash32 } from '../core/rng.js';

const DAY_ZENITH = new THREE.Color(0x2f6fd0);
const NIGHT_ZENITH = new THREE.Color(0x01030a);
const SUN_TINT = new THREE.Color(0xfff0c8);
const DUSK_CLOUD = new THREE.Color(0xffa070);
const NIGHT_CLOUD = new THREE.Color(0x1a2030);
const CLOUD_Y = 520, CLOUD_SIZE = 16000, CLOUD_REPEAT = 5, DRIFT = 0.0035;
const _c = new THREE.Color();

const DOME_VS = `varying vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const DOME_FS = `uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uSun; uniform vec3 uSunDir;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float y = max(d.y, 0.0);
  vec3 c = mix(uHorizon, uZenith, pow(y, 0.5));
  float s = max(dot(d, uSunDir), 0.0);
  c += uSun * (pow(s, 6.0) * 0.22 + pow(s, 90.0) * 0.6);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Tileable value noise in 0..1 (period p cells).
function tile(seed, x, y, p) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const h = (i, j) => hash32(seed, ((x0 + i) % p + p) % p, ((y0 + j) % p + p) % p) / 4294967296;
  const a = h(0, 0) + (h(1, 0) - h(0, 0)) * sx, b = h(0, 1) + (h(1, 1) - h(0, 1)) * sx;
  return a + (b - a) * sy;
}

// White puffy clouds with alpha, seamless in both directions.
function cloudTexture() {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d'), img = g.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const x = (i % S) / S, y = ((i / S) | 0) / S;
    let sum = 0, amp = 1, norm = 0;
    for (let o = 0, p = 4; o < 5; o++, p *= 2) { sum += tile(77 + o, x * p, y * p, p) * amp; norm += amp; amp *= 0.5; }
    const v = Math.max(0, Math.min(1, (sum / norm - 0.5) * 4.2));
    img.data.set([255, 255, 255, Math.round(v * v * 235)], i * 4);
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(CLOUD_REPEAT, CLOUD_REPEAT);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class EarthSky {
  constructor(group, scene, planet) {
    this.group = group;
    this.t = 0;
    this.owned = [];
    this.addDome();
    this.addClouds();
    this.addMoon();
  }

  own(...items) { this.owned.push(...items); return items[0]; }

  addDome() {
    this.uniforms = { uHorizon: { value: new THREE.Color() }, uZenith: { value: new THREE.Color() },
      uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) } };
    const mat = this.own(new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: DOME_VS, fragmentShader: DOME_FS,
      side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false }));
    this.dome = new THREE.Mesh(this.own(new THREE.SphereGeometry(5000, 32, 16)), mat);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    this.group.add(this.dome);
  }

  addClouds() {
    this.cloudTex = this.own(cloudTexture());
    const mat = this.own(new THREE.MeshBasicMaterial({ map: this.cloudTex, transparent: true, depthWrite: false,
      side: THREE.DoubleSide, color: 0xffffff }));
    this.clouds = new THREE.Mesh(this.own(new THREE.PlaneGeometry(CLOUD_SIZE, CLOUD_SIZE).rotateX(-Math.PI / 2)), mat);
    this.clouds.frustumCulled = false;
    this.clouds.renderOrder = 2;
    this.group.add(this.clouds);
  }

  addMoon() {
    const mat = this.own(new THREE.MeshStandardMaterial({ color: 0xd8d6d0, roughness: 1, fog: false,
      emissive: 0x303038, emissiveIntensity: 1 }));
    this.moon = new THREE.Mesh(this.own(new THREE.SphereGeometry(1, 24, 12)), mat);
    this.moon.position.set(-0.55, 0.42, -0.72).setLength(2600);
    this.moon.scale.setScalar(70);
    this.group.add(this.moon);
  }

  // cycle: DayCycle; horizon: this frame's background/fog color.
  update(dt, cycle, horizon) {
    this.t += dt;
    const u = this.uniforms, night = cycle.nightFactor;
    u.uHorizon.value.copy(horizon);
    u.uZenith.value.copy(DAY_ZENITH).lerp(horizon, cycle.twilight * 0.5).lerp(NIGHT_ZENITH, night);
    u.uSun.value.copy(SUN_TINT).multiplyScalar(cycle.daylight);
    u.uSunDir.value.copy(cycle.sunDir);
    this.updateClouds(cycle);
  }

  // The layer sits at a fixed altitude; its texture is anchored to the world and drifts.
  updateClouds(cycle) {
    const p = this.group.position, tex = this.cloudTex;
    this.clouds.position.y = CLOUD_Y - p.y;
    tex.offset.set((p.x / CLOUD_SIZE) * CLOUD_REPEAT + this.t * DRIFT, (-p.z / CLOUD_SIZE) * CLOUD_REPEAT + this.t * DRIFT * 0.4);
    _c.setRGB(1, 1, 1).lerp(DUSK_CLOUD, cycle.twilight * 0.6).lerp(NIGHT_CLOUD, cycle.nightFactor);
    this.clouds.material.color.copy(_c);
  }

  dispose() {
    this.group.remove(this.dome, this.clouds, this.moon);
    for (const item of this.owned) item.dispose();
  }
}
