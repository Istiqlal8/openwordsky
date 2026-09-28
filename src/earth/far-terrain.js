// Coarse terrain ring (9 km wide) around the detailed patch, so distant mountains, coastlines
// and the sea horizon stay visible. It is rebuilt in the background a few rows per frame when
// the player has travelled far, then swapped in at once. Under the detailed patch the ring sinks
// out of sight in the vertex shader, so the two never fight.
import * as THREE from 'three';

const SIZE = 9000, SEG = 150, STEP = SIZE / SEG, N = SEG + 1;
const MOVE = 600;          // travel that triggers a rebuild
const ROWS_PER_FRAME = 14; // background work per frame (height or color rows)
const DROP_GLSL = `#include <begin_vertex>
vec4 fwp = modelMatrix * vec4(transformed, 1.0);
float fd = max(abs(fwp.x - uNear.x), abs(fwp.z - uNear.y));
transformed.y -= fd < uNearHalf - ${STEP.toFixed(1)} ? 60.0 : (1.0 - smoothstep(uNearHalf, uNearHalf + ${STEP.toFixed(1)}, fd)) * 1.5;`;

export class FarTerrain {
  constructor(scene, h, paint, nearHalf) {
    Object.assign(this, { scene, h, paint });
    this.near = { uNear: { value: new THREE.Vector2() }, uNearHalf: { value: nearHalf } };
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG).rotateX(-Math.PI / 2);
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * N * 3), 3));
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1,
      polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 });
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.near);
      shader.vertexShader = 'uniform vec2 uNear;\nuniform float uNearHalf;\n' +
        shader.vertexShader.replace('#include <begin_vertex>', DROP_GLSL);
    };
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.job = null;
    this.center = null;
    this.onBuilt = null; // (far) => void, after each swap
    scene.add(this.mesh);
  }

  // Heights/colors/biomes of the last finished build (for far forests).
  get grid() { return this.built; }

  start(cx, cz) {
    cx = Math.round(cx / STEP) * STEP;
    cz = Math.round(cz / STEP) * STEP;
    this.job = { cx, cz, row: 0, phase: 0, heights: new Float32Array(N * N), colors: new Float32Array(N * N * 3),
      biomes: new Uint8Array(N * N) };
  }

  // Synchronous first build.
  build(px, pz) {
    this.start(px, pz);
    while (this.job) this.work(N * 2);
  }

  work(rows) {
    const j = this.job;
    for (let k = 0; k < rows && this.job; k++) {
      if (j.phase === 0) this.heightRow(j, j.row); else this.colorRow(j, j.row);
      if (++j.row < N) continue;
      j.row = 0;
      if (++j.phase === 2) this.finish(j);
    }
  }

  heightRow(j, r) {
    const z = j.cz - SIZE / 2 + r * STEP;
    for (let i = 0; i < N; i++) j.heights[r * N + i] = this.h(j.cx - SIZE / 2 + i * STEP, z);
  }

  colorRow(j, r) {
    const hs = j.heights, z = j.cz - SIZE / 2 + r * STEP, out = {}, c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const v = r * N + i;
      const l = i > 0 ? v - 1 : v, rr = i < SEG ? v + 1 : v, u = r > 0 ? v - N : v, d = r < SEG ? v + N : v;
      const slope = Math.hypot(hs[rr] - hs[l], hs[d] - hs[u]) / (2 * STEP) * 1.6; // coarse grid hides steepness
      this.paint(j.cx - SIZE / 2 + i * STEP, z, hs[v], slope, out);
      c.setHex(out.color);
      j.colors.set([c.r, c.g, c.b], v * 3);
      j.biomes[v] = out.biome;
    }
  }

  finish(j) {
    const geo = this.mesh.geometry, pos = geo.attributes.position;
    for (let v = 0; v < N * N; v++) pos.setY(v, j.heights[v]);
    geo.attributes.color.array.set(j.colors);
    pos.needsUpdate = geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
    this.mesh.position.set(j.cx, 0, j.cz);
    this.center = { x: j.cx, z: j.cz };
    this.built = { cx: j.cx, cz: j.cz, size: SIZE, seg: SEG, step: STEP, heights: j.heights, biomes: j.biomes };
    this.job = null;
    this.onBuilt?.(this);
  }

  // near: center of the detailed patch.
  update(px, pz, near) {
    this.near.uNear.value.set(near.x, near.z);
    if (this.job) { this.work(ROWS_PER_FRAME); return; }
    if (!this.center) { this.build(px, pz); return; }
    if (Math.hypot(px - this.center.x, pz - this.center.z) > MOVE) this.start(px, pz);
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
