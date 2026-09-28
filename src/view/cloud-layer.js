// Drifting cloud deck over a planet surface (Earth has its own in src/earth/earth-sky.js).
import * as THREE from 'three';
import { Rng, hash32 } from '../core/rng.js';
import { noise2 } from '../core/noise.js';
import { mixHex } from '../core/color.js';

const RADIUS = 9000; // dome radius; UVs tile every 1400 units

// Which planets get clouds: most worlds with some air; storms are cloudier.
export function hasClouds(planet) {
  if (planet.style === 'earth' || planet.gas || planet.atmosphereDensity < 0.3) return false;
  return new Rng(planet.seed ^ 0xc10d).chance(0.75);
}

// Seamless puffy alpha clouds; `cover` shifts how much of the sky is filled.
function cloudTexture(seed, cover) {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d'), img = g.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const x = (i % S) / S, y = ((i / S) | 0) / S;
    let sum = 0, amp = 1, norm = 0;
    for (let o = 0, p = 3; o < 7; o++, p *= 2) { // more, finer octaves: no blocky texels
      // Tiled value noise: sample on a p×p lattice that wraps at the edges.
      const s = hash32(seed, o);
      const fx = x * p, fy = y * p;
      sum += noise2(s, fx % p, fy % p) * amp;
      norm += amp;
      amp *= 0.5;
    }
    const v = Math.max(0, Math.min(1, (sum / norm - cover) * 3.6));
    img.data.set([255, 255, 255, Math.round(v * v * 215)], i * 4);
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1); // tiling comes from the dome UVs
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

// Shallow cloud dome: planar UVs so the texture tiles, alpha fading out near the horizon.
function domeGeometry() {
  const geo = new THREE.SphereGeometry(RADIUS, 48, 14, 0, Math.PI * 2, 0, Math.PI * 0.46);
  geo.scale(1, 0.18, 1); // flatten: a wide, low deck rather than a ball
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z) / RADIUS;
    uv.setXY(i, x / 2600, z / 2600); // wider tiles so texels never read as squares
    const a = 1 - THREE.MathUtils.smoothstep(r, 0.55, 0.98); // fade to nothing at the rim
    col.set([a, a, a], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

export class CloudLayer {
  constructor(scene, planet) {
    const rng = new Rng(planet.seed ^ 0xc10e);
    const stormy = /Badai|Hujan|Kabut|Berkabut|Gerimis|Lembap/.test(planet.weather ?? '');
    this.tex = cloudTexture(planet.seed ^ 0xc10f, stormy ? 0.36 : rng.range(0.42, 0.52));
    this.tint = mixHex(0xffffff, planet.palette.sky, rng.range(0.15, 0.4));
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, color: this.tint, transparent: true, vertexColors: true,
      opacity: stormy ? 0.85 : 0.7, depthWrite: false, side: THREE.BackSide, fog: false });
    this.mesh = new THREE.Mesh(domeGeometry(), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.height = rng.range(380, 900) * (stormy ? 0.7 : 1);
    this.drift = rng.range(0.002, 0.006);
    this.t = 0;
    scene.add(this.mesh);
  }

  // Follows the player; the texture scrolls so the clouds drift overhead.
  update(dt, pos, groundY) {
    this.t += dt;
    this.mesh.position.set(pos.x, groundY + this.height, pos.z);
    this.tex.offset.set(pos.x / 2600 + this.t * this.drift, -pos.z / 2600 + this.t * this.drift * 0.4);
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.tex.dispose();
  }
}
