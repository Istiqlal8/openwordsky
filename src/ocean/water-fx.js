// Underwater atmosphere around the camera: drifting particles (pale marine snow near the
// surface, twinkling bioluminescent plankton in the deep) that wrap around the camera in a
// shader, and slanted sunbeams hanging from the surface in shallow water.
import * as THREE from 'three';
import { fadeTexture, oceanTime } from './ocean-kit.js';

const COUNT = 2200, BOX = 44, SHAFTS = 14;

function planktonMaterial(uniforms) {
  const mat = new THREE.PointsMaterial({ size: 0.07, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: false });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, { uTime: oceanTime });
    shader.vertexShader = 'uniform vec3 uCam; uniform float uWater; uniform float uTime; varying float vTw;\n' + shader.vertexShader.replace('#include <begin_vertex>',
      `vec3 transformed = position + vec3(sin(uTime * 0.3 + position.z) * 0.4, -uTime * 0.12, cos(uTime * 0.25 + position.x) * 0.4);
  transformed = uCam + mod(transformed - uCam, ${BOX.toFixed(1)}) - ${(BOX / 2).toFixed(1)};
  if (transformed.y > uWater - 0.2) transformed.y = -100000.0;
  vTw = 0.5 + 0.5 * sin(uTime * (1.5 + fract(position.x * 7.13) * 3.0) + position.y * 11.0);`);
    shader.fragmentShader = 'uniform vec3 uSnow; uniform vec3 uGlow; uniform float uDeep; varying float vTw;\n' + shader.fragmentShader.replace('#include <color_fragment>',
      `#include <color_fragment>
  float disc = 1.0 - smoothstep(0.2, 0.5, length(gl_PointCoord - 0.5));
  diffuseColor.rgb = mix(uSnow * 0.55, uGlow * (0.3 + 1.2 * vTw), uDeep);
  diffuseColor.a *= disc * mix(0.6, 0.35 + 0.65 * vTw, uDeep);`);
  };
  mat.customProgramCacheKey = () => 'ocean-plankton';
  return mat;
}

export class WaterFx {
  constructor(scene, ctx) {
    Object.assign(this, { scene, ctx });
    const pos = new Float32Array(COUNT * 3).map(() => Math.random() * BOX);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.uniforms = { uCam: { value: new THREE.Vector3() }, uWater: { value: ctx.waterY }, uDeep: { value: 0 },
      uSnow: { value: new THREE.Color(0xdde8ee) }, uGlow: { value: new THREE.Color(ctx.pal.glow[0]) } };
    this.mat = planktonMaterial(this.uniforms);
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.buildShafts();
  }

  buildShafts() {
    this.fade = fadeTexture(true);
    this.shaftGeo = new THREE.PlaneGeometry(2.6, 26).translate(0, -13, 0);
    this.shaftMat = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, alphaMap: this.fade, transparent: true, opacity: 0.1,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.shafts = Array.from({ length: SHAFTS }, () => {
      const m = new THREE.Mesh(this.shaftGeo, this.shaftMat);
      m.rotation.order = 'YXZ';
      m.visible = false;
      this.scene.add(m);
      return m;
    });
  }

  // Keeps sunbeams scattered 6..30 m around the camera, hanging from the surface.
  updateShafts(cam, strength) {
    this.shaftMat.opacity = 0.11 * strength;
    for (const s of this.shafts) {
      s.visible = strength > 0.02;
      if (!s.visible) continue;
      const d = Math.hypot(s.position.x - cam.x, s.position.z - cam.z);
      if (!s.userData.placed || d > 32) {
        const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 24;
        s.position.set(cam.x + Math.cos(a) * r, this.ctx.waterY, cam.z + Math.sin(a) * r);
        s.scale.set(0.6 + Math.random() * 1.4, 0.7 + Math.random() * 0.6, 1);
        s.userData.placed = true;
      }
      s.rotation.set(0.22, Math.atan2(cam.x - s.position.x, cam.z - s.position.z), 0);
    }
  }

  // vdepth: virtual camera depth; under: camera below the water surface; light: 0..1 daylight.
  update(cam, under, vdepth, light = 1) {
    this.points.visible = under;
    this.uniforms.uCam.value.copy(cam);
    this.uniforms.uDeep.value = THREE.MathUtils.smoothstep(vdepth, 20, 60);
    const shallow = 1 - THREE.MathUtils.smoothstep(vdepth, 4, 28);
    this.updateShafts(cam, under ? shallow * light : 0);
  }

  dispose() {
    this.scene.remove(this.points, ...this.shafts);
    [this.geo, this.mat, this.shaftGeo, this.shaftMat, this.fade].forEach((d) => d.dispose());
  }
}
