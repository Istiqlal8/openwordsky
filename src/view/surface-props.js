// Flora species and rocks scattered deterministically around the player.
import * as THREE from 'three';
import { rngOf } from '../core/rng.js';
import { floraParts } from './life/flora-builder.js';
import { earthFloraParts, EARTH_FLORA_BIOMES } from '../earth/earth-flora.js';
import { BIOMES } from '../earth/earth-biome.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const FLORA = { cell: 7, radius: 150, max: 900 };
const EARTH = { cell: 5, radius: 215, max: 2600 }; // denser, wider flora on Earth
const ROCKS = { cell: 12, radius: 150, max: 400, prob: 0.22 };
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _c = new THREE.Color();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _hue = new THREE.Color();
const REMOVED = new Map(); // planet.key -> Set of mined prop keys (session-wide)

function forEachCell(cx, cz, radius, cell, fn) {
  const r2 = radius * radius;
  const x0 = Math.floor((cx - radius) / cell), x1 = Math.floor((cx + radius) / cell);
  const z0 = Math.floor((cz - radius) / cell), z1 = Math.floor((cz + radius) / cell);
  for (let ix = x0; ix <= x1; ix++) {
    for (let iz = z0; iz <= z1; iz++) {
      const dx = (ix + 0.5) * cell - cx, dz = (iz + 0.5) * cell - cz;
      if (dx * dx + dz * dz <= r2) fn(ix, iz);
    }
  }
}

function makeInstanced(geometry, material, max, tint) {
  const mesh = new THREE.InstancedMesh(geometry, material, max);
  if (tint) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3);
  mesh.count = 0;
  mesh.frustumCulled = false; // instance bounds change on every rebuild
  return mesh;
}

// biome id -> { prob, choose(u) -> flora set } from EARTH_FLORA_BIOMES.
function earthPicks(sets) {
  const byShape = new Map(sets.map((s) => [s.species.genes.shape, s]));
  const out = {};
  for (const [biome, [prob, weights]] of Object.entries(EARTH_FLORA_BIOMES)) {
    const list = Object.entries(weights).filter(([shape]) => byShape.has(shape));
    const total = list.reduce((w, [, v]) => w + v, 0);
    out[biome] = { prob, choose(u) {
      let r = u * total;
      for (const [shape, w] of list) if ((r -= w) <= 0) return byShape.get(shape);
      return byShape.get(list[list.length - 1][0]);
    } };
  }
  return out;
}

export class SurfaceProps {
  // patch (optional): TerrainPatch, used on Earth for cheap height and biome lookups.
  constructor(scene, planet, heightFn, patch = null) {
    this.scene = scene;
    this.planet = planet;
    this.h = heightFn;
    this.earth = planet.style === 'earth' && patch ? patch : null;
    this.cfg = this.earth ? EARTH : FLORA;
    this.meshes = [];
    if (!REMOVED.has(planet.key)) REMOVED.set(planet.key, new Set());
    this.removed = REMOVED.get(planet.key);
    this.rockKeys = new Array(ROCKS.max);
    this.clearZone = null; // { x, z, r }: keep the landing spot free of props
    this.extraZones = [];  // more { x, z, r } areas kept clear (e.g. base buildings)
    this.buildFlora(planet);
    this.buildRocks(planet);
  }

  // One instanced set per flora species; all parts of a set share instance matrices.
  buildFlora(planet) {
    const species = planet.species.flora;
    this.floraTotal = species.reduce((w, sp) => w + sp.genes.weight, 0);
    const max = this.cfg.max;
    this.floraSets = species.map((sp) => {
      const parts = sp.earth ? earthFloraParts(sp) : floraParts(sp);
      return { species: sp, keys: new Array(max), n: 0, hue: parts.map((p) => Boolean(p.hue)),
        meshes: parts.map(({ geometry, material }) => makeInstanced(geometry, material, max, true)) };
    });
    if (this.earth) this.earthPicks = earthPicks(this.floraSets);
    this.floraMeshes = this.floraSets.flatMap((set) => set.meshes);
    for (const m of this.floraMeshes) this.add(m);
  }

  pickSpecies(rng) {
    let r = rng.next() * this.floraTotal;
    for (const set of this.floraSets) {
      r -= set.species.genes.weight;
      if (r <= 0) return set;
    }
    return this.floraSets[this.floraSets.length - 1];
  }

  buildRocks(planet) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1 });
    this.rockMesh = makeInstanced(new THREE.IcosahedronGeometry(1, 0), mat, ROCKS.max, true);
    this.add(this.rockMesh);
  }

  add(mesh) {
    this.meshes.push(mesh);
    this.scene.add(mesh);
  }

  // Ground height at (x, z), or null if underwater or too steep.
  groundAt(x, z, maxSlope) {
    const c = this.clearZone;
    if (c && (x - c.x) ** 2 + (z - c.z) ** 2 < c.r * c.r) return null;
    for (const e of this.extraZones) if ((x - e.x) ** 2 + (z - e.z) ** 2 < e.r * e.r) return null;
    const h = this.earth ? (px, pz) => this.earth.heightAt(px, pz) : this.h;
    const y = h(x, z), t = this.planet.terrain;
    if (t.hasWater && y < t.waterY + 0.3) return null;
    const slope = Math.hypot(h(x + 1, z) - y, h(x, z + 1) - y);
    return slope > maxSlope ? null : y;
  }

  rebuild(cx, cz) {
    this.placeFlora(cx, cz);
    this.placeRocks(cx, cz);
  }

  placeFlora(cx, cz) {
    if (this.earth) { this.placeEarthFlora(cx, cz); return; }
    const p = this.planet, prob = Math.min(0.9, p.flora.density * 0.6);
    for (const set of this.floraSets) set.n = 0;
    if (!this.floraSets.length) return;
    forEachCell(cx, cz, FLORA.radius, FLORA.cell, (ix, iz) => {
      const rng = rngOf(p.seed, ix, iz);
      if (rng.next() >= prob || this.removed.has(`f${ix},${iz}`)) return;
      const set = this.pickSpecies(rng);
      if (set.n >= FLORA.max) return;
      const x = (ix + rng.next()) * FLORA.cell, z = (iz + rng.next()) * FLORA.cell;
      const y = this.groundAt(x, z, 0.8);
      if (y === null) return;
      const s = set.species.genes.height * rng.range(0.6, 1.35);
      _m.compose(_p.set(x, y - 0.05, z), _q.setFromAxisAngle(UP, rng.range(0, TAU)),
        _s.set(s, s * rng.range(0.85, 1.25), s));
      _c.setScalar(rng.range(0.8, 1.15));
      for (const m of set.meshes) { m.setMatrixAt(set.n, _m); m.setColorAt(set.n, _c); }
      set.keys[set.n++] = `f${ix},${iz}`;
    });
    for (const set of this.floraSets) for (const m of set.meshes) this.commit(m, set.n);
  }

  // Earth: the local biome decides how dense the plants are and which species grow.
  placeEarthFlora(cx, cz) {
    const seed = this.planet.seed, { cell, radius, max } = EARTH;
    for (const set of this.floraSets) set.n = 0;
    forEachCell(cx, cz, radius, cell, (ix, iz) => {
      const rng = rngOf(seed, ix, iz);
      const x = (ix + rng.next()) * cell, z = (iz + rng.next()) * cell;
      const pick = this.earthPicks[BIOMES[this.earth.biomeAt(x, z)]];
      if (!pick || rng.next() >= pick.prob || this.removed.has(`f${ix},${iz}`)) return;
      const set = pick.choose(rng.next());
      const y = set.n < max ? this.groundAt(x, z, 0.9) : null;
      if (y === null) return;
      const s = set.species.genes.height * rng.range(0.65, 1.3);
      _m.compose(_p.set(x, y - 0.08, z), _q.setFromAxisAngle(UP, rng.range(0, TAU)), _s.set(s, s * rng.range(0.85, 1.2), s));
      const tint = rng.range(0.82, 1.12), hue = _hue.setHSL(rng.next(), 0.85, 0.6);
      set.meshes.forEach((m, k) => { m.setMatrixAt(set.n, _m); m.setColorAt(set.n, set.hue[k] ? hue : _c.setScalar(tint)); });
      set.keys[set.n++] = `f${ix},${iz}`;
    });
    for (const set of this.floraSets) for (const m of set.meshes) this.commit(m, set.n);
  }

  placeRocks(cx, cz) {
    const p = this.planet;
    let n = 0;
    forEachCell(cx, cz, ROCKS.radius, ROCKS.cell, (ix, iz) => {
      if (n >= ROCKS.max) return;
      const rng = rngOf(p.seed, ix, iz, 99);
      if (rng.next() >= ROCKS.prob || this.removed.has(`r${ix},${iz}`)) return;
      const x = (ix + rng.next()) * ROCKS.cell, z = (iz + rng.next()) * ROCKS.cell;
      const y = this.groundAt(x, z, 2);
      if (y === null) return;
      const k = rng.range(0.4, 2.2);
      _s.set(k * rng.range(0.7, 1.5), k * rng.range(0.5, 1.1), k * rng.range(0.7, 1.5));
      _q.setFromEuler(_e.set(rng.range(0, TAU), rng.range(0, TAU), rng.range(0, TAU)));
      _m.compose(_p.set(x, y - _s.y * 0.35, z), _q, _s);
      this.rockMesh.setMatrixAt(n, _m);
      this.rockMesh.setColorAt(n, _c.setHex(p.palette.rock).offsetHSL(0, 0, rng.range(-0.08, 0.08)));
      this.rockKeys[n++] = `r${ix},${iz}`;
    });
    this.commit(this.rockMesh, n);
  }

  commit(mesh, n) {
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.boundingSphere = null; // keep raycast bounds in sync with new instances
  }

  // Meshes the mining beam can hit (flora parts + rocks).
  get mineable() {
    return this._mineable ??= [...this.floraMeshes, this.rockMesh];
  }

  // Hide a mined instance and remember it for this planet. Returns its info or null.
  removeAt(mesh, instanceId) {
    const set = this.setOf(mesh);
    const key = (set ? set.keys : this.rockKeys)[instanceId];
    if (!key || this.removed.has(key) || instanceId >= mesh.count) return null;
    this.removed.add(key);
    for (const m of set ? set.meshes : [mesh]) {
      m.setMatrixAt(instanceId, ZERO);
      m.instanceMatrix.needsUpdate = true;
      m.boundingSphere = null;
    }
    return { kind: set ? 'flora' : 'rock', key, species: set?.species ?? null };
  }

  setOf(mesh) {
    return this.floraSets.find((set) => set.meshes.includes(mesh)) ?? null;
  }

  // Deterministic grid key of an instance ('f<ix>,<iz>' / 'r<ix>,<iz>').
  keyOf(mesh, instanceId) {
    return (this.setOf(mesh)?.keys ?? this.rockKeys)[instanceId] ?? null;
  }

  isRemoved(key) { return this.removed.has(key); }

  // Creatures live in view/life/wildlife.js now; kept for SurfaceView's API.
  update() {}

  nearestCreature() {
    return null;
  }

  dispose() {
    for (const m of this.meshes) {
      this.scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
      m.dispose();
    }
    this.meshes = [];
  }
}
