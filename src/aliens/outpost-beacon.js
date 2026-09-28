// Village landmark: a light beam visible from afar with pulses climbing it, a pylon with a
// glowing orb, and the vendor's trading stall.
import * as THREE from 'three';
import { glowTexture } from '../assets/textures.js';
import { mesh, pivot } from './body-kit.js';

const BEAM_H = 900;
const VERT = `varying float vY; void main() { vY = uv.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = `uniform vec3 uColor; uniform float uTime; varying float vY;
  void main() {
    float base = pow(1.0 - vY, 1.6) * smoothstep(0.0, 0.02, vY);
    float pulse = pow(0.5 + 0.5 * sin(vY * 60.0 - uTime * 3.0), 8.0) * (1.0 - vY);
    float a = clamp(base * 0.65 + pulse * 0.5, 0.0, 1.0);
    gl_FragColor = vec4(uColor * (1.2 + pulse), a); }`;

export class OutpostBeacon {
  constructor(kit, mats, color) {
    this.group = pivot();
    this.group.add(mesh(kit.cyl(0.9, 1.6, 1.2, 8), mats.trim, 0, 0.6, 0));
    this.group.add(mesh(kit.cyl(0.25, 0.5, 7, 8), mats.wall, 0, 4.2, 0));
    this.orb = mesh(kit.ico(1, 1), mats.glow, 0, 8.4, 0, 0.9);
    this.group.add(this.orb);
    for (let i = 0; i < 3; i++) {
      const fin = mesh(kit.box(0.15, 5, 1.1), mats.trim, 0, 3.4, 0);
      fin.rotation.y = (i / 3) * Math.PI * 2;
      fin.translateZ(0.7);
      this.group.add(fin);
    }
    this.beam = this.makeBeam(color);
    this.halo = this.makeHalo(color, true);
    this.spark = this.makeHalo(color, false); // screen-sized star that stays visible from afar
    this.group.add(this.beam, this.halo, this.spark);
  }

  makeBeam(color) {
    this.beamMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, blending: THREE.AdditiveBlending });
    this.beamGeo = new THREE.CylinderGeometry(1.2, 2.6, BEAM_H, 12, 1, true);
    const beam = new THREE.Mesh(this.beamGeo, this.beamMat);
    beam.position.y = 8.4 + BEAM_H / 2;
    beam.frustumCulled = false;
    return beam;
  }

  // Glow around the orb: world-sized halo, or a fixed screen-size spark.
  makeHalo(color, world) {
    const mat = new THREE.SpriteMaterial({ map: glowTexture(color), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false, sizeAttenuation: world });
    const s = new THREE.Sprite(mat);
    s.position.y = 8.4;
    s.scale.setScalar(world ? 9 : 0.05);
    return s;
  }

  update(dt, time) {
    this.beamMat.uniforms.uTime.value = time;
    this.orb.rotation.y += dt * 0.8;
    this.orb.position.y = 8.4 + Math.sin(time * 1.3) * 0.25;
    this.halo.material.opacity = 0.75 + Math.sin(time * 2.1) * 0.2;
    this.spark.material.opacity = 0.6 + Math.sin(time * 3.3) * 0.3;
  }

  dispose() {
    this.group.removeFromParent();
    this.beamGeo.dispose();
    this.beamMat.dispose();
    this.halo.material.dispose(); // glow texture is cached by textures.js
    this.spark.material.dispose();
  }
}

// Vendor stall: canopy on four poles, a counter and glowing goods on it.
export function buildStall(kit, mats) {
  const g = pivot();
  for (const [x, z] of [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]]) {
    g.add(mesh(kit.cyl(0.06, 0.08, 2.6, 6), mats.trim, x, 1.3, z));
  }
  g.add(mesh(kit.cone(2.3, 0.9, 6), mats.wall, 0, 3.0, 0, 1, 1, 0.75));
  g.add(mesh(kit.box(2.6, 0.9, 0.8), mats.trim, 0, 0.45, -0.9));
  for (let i = 0; i < 4; i++) g.add(mesh(kit.ico(1, 0), mats.glow, -0.9 + i * 0.6, 1.05, -0.9, 0.12, 0.2, 0.12));
  return g;
}
