// A big blue-white Earth hanging in the Moon's black sky, painted from the real Earth terrain.
import * as THREE from 'three';
import { glowTexture } from '../assets/textures.js';
import { earthHeight, EARTH_SEA } from './earth-terrain.js';
import { noise2 } from '../core/noise.js';

const W = 256, H = 128;

function landColor(y, lat) {
  if (y < EARTH_SEA) return y < EARTH_SEA - 20 ? [18, 52, 120] : [30, 84, 150];
  if (y > 170 || lat > 0.8) return [240, 244, 250];
  if (y > 70) return [120, 110, 90];
  return y < 2 ? [214, 200, 150] : [70, 128, 60];
}

function globeTexture() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d'), img = g.createImageData(W, H);
  for (let j = 0; j < H; j++) {
    const lat = Math.abs(j / H - 0.5) * 2;
    for (let i = 0; i < W; i++) {
      const col = landColor(earthHeight((i / W - 0.5) * 40000, (j / H - 0.5) * 20000), lat);
      const cloud = Math.max(0, noise2(91, i / 14, j / 9) * 0.7 + noise2(92, i / 5, j / 4) * 0.3 - 0.5) * 2.4;
      const k = Math.min(1, cloud);
      img.data.set([col[0] + (255 - col[0]) * k, col[1] + (255 - col[1]) * k, col[2] + (255 - col[2]) * k, 255], (j * W + i) * 4);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class EarthGlobe {
  constructor(group) {
    this.group = group;
    this.tex = globeTexture();
    this.mat = new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.8, fog: false,
      emissive: 0x0a1830, emissiveIntensity: 1 });
    this.geo = new THREE.SphereGeometry(1, 48, 24);
    this.globe = new THREE.Mesh(this.geo, this.mat);
    this.globe.scale.setScalar(260);
    this.globe.rotation.z = 0.4;
    const dir = new THREE.Vector3(0.5, 0.55, -0.67).setLength(2700);
    this.globe.position.copy(dir);
    this.haloMat = new THREE.SpriteMaterial({ map: glowTexture(0x7fb4ff), color: 0x7fb4ff, fog: false,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 });
    this.halo = new THREE.Sprite(this.haloMat);
    this.halo.position.copy(dir).multiplyScalar(1.02);
    this.halo.scale.setScalar(760);
    group.add(this.halo, this.globe);
  }

  update(dt) { this.globe.rotation.y += dt * 0.01; }

  dispose() {
    this.group.remove(this.halo, this.globe);
    this.tex.dispose();
    this.mat.dispose();
    this.geo.dispose();
    this.haloMat.dispose();
  }
}
