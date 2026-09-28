// Distant woods on Earth: low-poly tree clumps scattered over the forest and pine areas of the far
// terrain ring (out to ~1.8 km), so hills far away look wooded. Clumps inside the detailed
// flora radius are collapsed in the vertex shader; the real, minable trees stand there.
import * as THREE from 'three';
import { hash32 } from '../core/rng.js';
import { B } from './earth-biome.js';

const RADIUS = 1900, MAX = 9000;
const HIDE_GLSL = `#include <begin_vertex>
#ifdef USE_INSTANCING
if (length(instanceMatrix[3].xz - uNear) < uNearR) transformed *= 0.0;
#endif`;
// biome -> [clumps per far vertex, conifer share]
const PLAN = new Map([[B.forest, [6, 0.15]], [B.pine, [5, 0.95]], [B.grass, [0.25, 0.1]], [B.snow, [0.3, 1]]]);

function painted(geo, hex) {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo.index ? geo.toNonIndexed() : geo;
}

function joined(parts) {
  const geo = new THREE.BufferGeometry();
  for (const name of ['position', 'color']) {
    const arrays = parts.map((p) => p.attributes[name].array);
    const out = new Float32Array(arrays.reduce((s, a) => s + a.length, 0));
    arrays.reduce((o, a) => { out.set(a, o); return o + a.length; }, 0);
    geo.setAttribute(name, new THREE.BufferAttribute(out, 3));
  }
  geo.computeVertexNormals();
  return geo;
}

const broadleaf = () => joined([painted(new THREE.CylinderGeometry(0.04, 0.06, 0.4, 5, 1, true).translate(0, 0.2, 0), 0x5a4030),
  painted(new THREE.IcosahedronGeometry(0.42, 0).scale(1, 0.8, 1).translate(0, 0.62, 0), 0x3f7a2e)]);
const conifer = () => joined([painted(new THREE.ConeGeometry(0.26, 0.95, 6, 1, true).translate(0, 0.55, 0), 0x2a5230)]);

export class FarForest {
  constructor(scene) {
    this.scene = scene;
    this.near = { uNear: { value: new THREE.Vector2() }, uNearR: { value: 215 } };
    this.meshes = [broadleaf(), conifer()].map((geo) => this.instanced(geo));
    scene.add(...this.meshes);
  }

  instanced(geo) {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.near);
      shader.vertexShader = 'uniform vec2 uNear;\nuniform float uNearR;\n' + shader.vertexShader.replace('#include <begin_vertex>', HIDE_GLSL);
    };
    const mesh = new THREE.InstancedMesh(geo, mat, MAX);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    mesh.frustumCulled = false;
    mesh.count = 0;
    return mesh;
  }

  // grid: FarTerrain.grid; h: exact height function.
  rebuild(grid, h) {
    const { cx, cz, size, seg, step, biomes } = grid, n = seg + 1, counts = [0, 0];
    for (let v = 0; v < n * n; v++) {
      const plan = PLAN.get(biomes[v]);
      if (!plan) continue;
      const x = cx - size / 2 + (v % n) * step, z = cz - size / 2 + ((v / n) | 0) * step;
      if ((x - cx) ** 2 + (z - cz) ** 2 > RADIUS * RADIUS) continue;
      this.clumps(v, x, z, plan, h, counts);
    }
    this.meshes.forEach((m, i) => { m.count = counts[i]; m.instanceMatrix.needsUpdate = m.instanceColor.needsUpdate = true; });
  }

  clumps(v, x, z, [per, conifers], h, counts) {
    for (let k = 0; k < Math.ceil(per); k++) {
      const hs = hash32(0xf0e57, v, k, x | 0);
      if (per < 1 && (hs & 1023) / 1024 > per) continue;
      const type = ((hs >>> 10) & 255) / 256 < conifers ? 1 : 0, mesh = this.meshes[type];
      if (counts[type] >= MAX) continue;
      const px = x + (((hs >>> 3) & 127) / 127 - 0.5) * 60, pz = z + (((hs >>> 18) & 127) / 127 - 0.5) * 60;
      const y = h(px, pz);
      if (y < 0.5) continue;
      const s = 9 + ((hs >>> 25) & 127) / 127 * 9, a = (hs & 255) / 40.6, c = Math.cos(a) * s, sn = Math.sin(a) * s;
      mesh.instanceMatrix.array.set([c, 0, -sn, 0, 0, s * 1.1, 0, 0, sn, 0, c, 0, px, y - 0.5, pz, 1], counts[type] * 16);
      const t = 0.8 + ((hs >>> 12) & 63) / 160;
      mesh.instanceColor.array.set([t, t, t], counts[type]++ * 3);
    }
  }

  update(near) { this.near.uNear.value.set(near.x, near.z); }

  dispose() {
    for (const m of this.meshes) {
      this.scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
      m.dispose();
    }
  }
}
