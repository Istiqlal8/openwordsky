// Sky around the dive: gradient dome, sun, stars, moons and (for ringed giants) the ring arch.
// Everything here follows the camera and ignores fog.
import * as THREE from 'three';
import { Rng, hash32 } from '../../core/rng.js';
import { glowTexture, ringTexture } from '../../assets/textures.js';
import { buildRingArch } from './gas-rings.js';

const DOME_R = 40000;
const DOME_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const DOME_FRAG = /* glsl */ `
uniform vec3 uZenith, uHorizon, uNadir, uSunDir, uSunCol;
uniform float uHaze; // height of the horizon haze band (0..1 of the dome)
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  vec3 col = d.y > 0.0 ? mix(uHorizon, uZenith, pow(clamp(d.y / uHaze, 0.0, 1.0), 0.6)) : mix(uHorizon, uNadir, pow(-d.y, 0.5));
  float s = max(dot(d, uSunDir), 0.0);
  col += uSunCol * (pow(s, 12.0) * 0.35 + pow(s, 200.0));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function buildDome() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
      uNadir: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uHaze: { value: 0.5 } },
    vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, side: THREE.BackSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(DOME_R, 32, 16), mat);
  mesh.renderOrder = -1e6;
  mesh.frustumCulled = false;
  return mesh;
}

function buildStars(rng) {
  const n = 600, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = rng.range(0.02, 1), th = rng.next() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    pos.set([Math.cos(th) * r * 36000, u * 36000, Math.sin(th) * r * 36000], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false,
    transparent: true, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  pts.renderOrder = -9e5;
  pts.frustumCulled = false;
  return pts;
}

function buildMoons(count, rng) {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(1, 24, 16);
  for (let i = 0; i < count; i++) {
    const shade = rng.range(0.45, 0.9);
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(shade, shade * 0.97, shade * 0.92),
      roughness: 1, fog: false, transparent: true, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    const az = rng.next() * Math.PI * 2, el = rng.range(0.12, 0.75), d = 30000;
    m.position.set(Math.cos(az) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(az) * Math.cos(el) * d);
    m.scale.setScalar(rng.range(250, 1100));
    m.renderOrder = -8e5;
    group.add(m);
  }
  return { group, geo };
}

export class GasSky {
  constructor(scene, pal, starColor, sunDir) {
    const rng = new Rng(hash32(pal.seed, 0x5c1));
    this.group = new THREE.Group();
    scene.add(this.group);
    this.sunDir = sunDir;
    this.dome = buildDome();
    this.stars = buildStars(rng);
    this.moons = buildMoons(pal.moons, rng);
    this.sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(starColor), color: starColor,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    this.sun.position.copy(sunDir).multiplyScalar(34000);
    this.sun.scale.setScalar(9000);
    this.sun.renderOrder = -9e5;
    this.sunColor = new THREE.Color(starColor);
    this.group.add(this.dome, this.stars, this.moons.group, this.sun);
    this.ring = pal.rings ? buildRingArch(ringTexture(pal.seed, pal.ringColor), rng) : null;
    if (this.ring) this.group.add(this.ring.mesh);
  }

  // atm: pooled GasAtmosphere state.
  update(cam, atm) {
    this.group.position.copy(cam);
    const u = this.dome.material.uniforms;
    u.uZenith.value.copy(atm.zenith);
    u.uHorizon.value.copy(atm.fog);
    u.uNadir.value.copy(atm.nadir);
    u.uSunDir.value.copy(this.sunDir);
    u.uHaze.value = atm.haze;
    u.uSunCol.value.copy(this.sunColor).multiplyScalar(atm.sun * 0.8);
    this.stars.material.opacity = atm.space * 0.9;
    this.stars.visible = atm.space > 0.02;
    this.sun.material.opacity = Math.max(0, atm.sun * 1.4 - 0.4);
    const vis = Math.max(0, Math.min(1, 1 + cam.y / 450)); // big sky bodies fade out below the tops
    for (const m of this.moons.group.children) m.material.opacity = vis;
    this.moons.group.visible = vis > 0.02;
    if (this.ring) this.ring.update(cam, vis);
  }

  dispose() {
    this.dome.geometry.dispose();
    this.dome.material.dispose();
    this.stars.geometry.dispose();
    this.stars.material.dispose();
    this.moons.geo.dispose();
    for (const m of this.moons.group.children) m.material.dispose();
    this.sun.material.dispose(); // glow / ring textures are cached in textures.js
    this.ring?.dispose();
    this.group.removeFromParent();
  }
}
