// Detailed terrain patch that follows the player. On recenter it reuses the heights and colors
// of the overlapping area (the patch moves in whole grid steps) and only samples the new strip,
// so walking and flying stay smooth even with an expensive height function.
import * as THREE from 'three';
import { groundColor } from '../gen/terrain.js';
import { detailTexture } from '../assets/textures.js';
import { earthGround } from './earth-biome.js';

const _c = new THREE.Color();
const _g = {};

// (x, z, y, slope, out) -> out.color (hex), out.biome (earth biome code, 0 elsewhere).
export function painter(planet) {
  if (planet.style === 'earth') return earthGround;
  return (x, z, y, slope, out) => { out.color = groundColor(planet, x, z, y, slope); out.biome = 0; return out; };
}

export class TerrainPatch {
  constructor(scene, planet, h, { size, seg, snap }) {
    Object.assign(this, { scene, h, size, seg, snap, n: seg + 1, step: size / seg });
    this.paint = painter(planet);
    this.center = null;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg).rotateX(-Math.PI / 2);
    const count = geo.attributes.position.count;
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this.heights = new Float32Array(count);
    this.biomes = new Uint8Array(count);
    this.spare = { heights: new Float32Array(count), biomes: new Uint8Array(count), colors: new Float32Array(count * 3),
      dirty: new Uint8Array(count) };
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1,
      map: this.detailMap(planet.seed) });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false; // always around the player
    scene.add(this.mesh);
  }

  detailMap(seed) {
    const src = detailTexture(seed);
    if (!src) return null;
    const tex = src.clone(); // own copy so repeat settings don't leak to other users
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(this.size / this.snap, this.size / this.snap);
    tex.needsUpdate = true;
    this.tex = tex;
    return tex;
  }

  // World x/z of vertex i for a patch centered at cx/cz.
  vx(i, cx) { return cx - this.size / 2 + (i % this.n) * this.step; }
  vz(i, cz) { return cz - this.size / 2 + ((i / this.n) | 0) * this.step; }

  // Moves the patch to the snapped point nearest px/pz. Returns the new center.
  recenter(px, pz) {
    const cx = Math.round(px / this.snap) * this.snap, cz = Math.round(pz / this.snap) * this.snap;
    const old = this.center;
    this.shift(old ? Math.round((cx - old.x) / this.step) : Infinity, old ? Math.round((cz - old.z) / this.step) : 0, cx, cz);
    this.center = { x: cx, z: cz };
    this.write(cx, cz);
    this.mesh.position.set(cx, 0, cz);
    return this.center;
  }

  // Copies still-covered samples into the spare buffers; marks what needs (re)painting.
  shift(di, dj, cx, cz) {
    const { n, seg, spare } = this, col = this.mesh.geometry.attributes.color.array;
    for (let i = 0; i < this.heights.length; i++) {
      const sx = (i % n) + di, sz = ((i / n) | 0) + dj, s = sz * n + sx;
      const inside = sx >= 0 && sx <= seg && sz >= 0 && sz <= seg;
      spare.heights[i] = inside ? this.heights[s] : this.h(this.vx(i, cx), this.vz(i, cz));
      spare.dirty[i] = inside && sx > 0 && sx < seg && sz > 0 && sz < seg ? 0 : 1;
      if (!inside) continue;
      spare.biomes[i] = this.biomes[s];
      spare.colors[i * 3] = col[s * 3]; spare.colors[i * 3 + 1] = col[s * 3 + 1]; spare.colors[i * 3 + 2] = col[s * 3 + 2];
    }
    [this.heights, spare.heights] = [spare.heights, this.heights];
    [this.biomes, spare.biomes] = [spare.biomes, this.biomes];
  }

  write(cx, cz) {
    const { n, seg, step, heights: hs, spare } = this, geo = this.mesh.geometry;
    const pos = geo.attributes.position, col = geo.attributes.color;
    col.array.set(spare.colors);
    for (let i = 0; i < hs.length; i++) {
      pos.setY(i, hs[i]);
      if (!spare.dirty[i]) continue;
      const ix = i % n, iz = (i / n) | 0;
      const l = ix > 0 ? i - 1 : i, r = ix < seg ? i + 1 : i, u = iz > 0 ? i - n : i, d = iz < seg ? i + n : i;
      const slope = Math.hypot(hs[r] - hs[l], hs[d] - hs[u]) / (2 * step);
      this.paint(this.vx(i, cx), this.vz(i, cz), hs[i], slope, _g);
      this.biomes[i] = _g.biome;
      _c.setHex(_g.color);
      col.setXYZ(i, _c.r, _c.g, _c.b);
    }
    pos.needsUpdate = col.needsUpdate = true;
    geo.computeVertexNormals();
  }

  // Grid cell of world x/z -> { i, fx, fz } or null outside the patch.
  cell(x, z) {
    const c = this.center;
    if (!c) return null;
    const u = (x - c.x + this.size / 2) / this.step, v = (z - c.z + this.size / 2) / this.step;
    if (u < 0 || v < 0 || u >= this.seg || v >= this.seg) return null;
    const iu = u | 0, iv = v | 0;
    return { i: iv * this.n + iu, fx: u - iu, fz: v - iv };
  }

  // Bilinear height of the drawn surface (falls back to the height function outside).
  heightAt(x, z) {
    const c = this.cell(x, z);
    if (!c) return this.h(x, z);
    const hs = this.heights, n = this.n, { i, fx, fz } = c;
    const a = hs[i] + (hs[i + 1] - hs[i]) * fx, b = hs[i + n] + (hs[i + n + 1] - hs[i + n]) * fx;
    return a + (b - a) * fz;
  }

  // Biome code of the nearest vertex, or -1 outside the patch.
  biomeAt(x, z) {
    const c = this.cell(x, z);
    if (!c) return -1;
    return this.biomes[c.i + (c.fx > 0.5 ? 1 : 0) + (c.fz > 0.5 ? this.n : 0)];
  }

  // Vertex color near x/z written into `out` (THREE.Color); false outside the patch.
  colorAt(x, z, out) {
    const c = this.cell(x, z);
    if (!c) return false;
    const j = (c.i + (c.fx > 0.5 ? 1 : 0) + (c.fz > 0.5 ? this.n : 0)) * 3, a = this.mesh.geometry.attributes.color.array;
    out.setRGB(a[j], a[j + 1], a[j + 2]);
    return true;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.tex?.dispose();
  }
}
