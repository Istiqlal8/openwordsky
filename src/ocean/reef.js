// Sea floor life around the camera: coral reefs (branching, brain, fan), anemones, kelp forests,
// sea grass, starfish and walking crabs. The floor is split into cells whose content is a pure
// function of the planet seed and the cell; cells are cached and a few new ones are built per
// frame as the camera moves, then copied into one InstancedMesh per kind.
import * as THREE from 'three';
import { Rng, hash32 } from '../core/rng.js';
import { fbm2 } from '../core/noise.js';
import { swayMaterial } from './ocean-kit.js';
import * as G from './reef-geo.js';

const CELL = 12, REACH = 7, KEEP = REACH + 3, NEW_PER_FRAME = 30, CRABS = 36;
const KINDS = {
  branch: { geo: G.branchCoral, cap: 500 }, brain: { geo: G.brainCoral, cap: 300 },
  fan: { geo: G.fanCoral, cap: 260, sway: 0.05, side: THREE.DoubleSide },
  anemone: { geo: G.anemone, cap: 260, sway: 0.12 }, kelp: { geo: G.kelpStrand, cap: 800, sway: 0.6, side: THREE.DoubleSide },
  grass: { geo: G.seaGrass, cap: 1000, sway: 0.15, side: THREE.DoubleSide }, star: { geo: G.starfish, cap: 200 },
};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _c = new THREE.Color();

export class Reef {
  constructor(scene, ctx) {
    Object.assign(this, { scene, ctx, cells: new Map(), center: null, dirty: false, t: 0 });
    this.seed = ctx.seed;
    this.meshes = {};
    for (const [k, spec] of Object.entries(KINDS)) this.meshes[k] = this.instanced(k, spec);
    this.crabMesh = this.instanced('crab', { geo: G.crab, cap: CRABS });
    this.crabs = Array.from({ length: CRABS }, (_, i) => ({ pos: new THREE.Vector3(), yaw: 0, t: i, placed: false, dead: false }));
    this.crabs.forEach((c, i) => this.crabMesh.setColorAt(i, _c.set(ctx.pal.crab).offsetHSL(0, 0, (i % 5) * 0.03 - 0.06)));
  }

  instanced(key, spec) {
    const mat = spec.sway ? swayMaterial(`reef-${key}`, { side: spec.side ?? THREE.FrontSide }, spec.sway)
      : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: spec.side ?? THREE.FrontSide });
    const mesh = new THREE.InstancedMesh(spec.geo(), mat, spec.cap);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.setColorAt(0, _c.set(0xffffff));
    this.scene.add(mesh);
    return mesh;
  }

  // Deterministic content of one floor cell: { kind: [[matrix, color], ...] }.
  buildCell(cx, cz) {
    const { h, waterY, scale, pal } = this.ctx, x0 = cx * CELL, z0 = cz * CELL;
    const r = new Rng(hash32(this.seed, cx, cz)), cell = {};
    const d = waterY - h(x0 + CELL / 2, z0 + CELL / 2);
    if (d < 1) return cell;
    const zone = scale.zone(d), vd = scale.virtual(d);
    const kelpy = fbm2(this.seed + 77, x0 / 110, z0 / 110, 2) > 0.52 && vd > 4 && vd < 40;
    const reefy = fbm2(this.seed + 78, x0 / 70, z0 / 70, 2);
    if (kelpy) this.scatter(cell, r, x0, z0, 'kelp', r.int(9) + 8);
    if (zone === 'reef') this.reefCell(cell, r, x0, z0, reefy, vd);
    else if (zone === 'mid' && r.chance(0.35)) this.scatter(cell, r, x0, z0, r.chance(0.5) ? 'fan' : 'brain', 1 + r.int(2));
    return cell;
  }

  reefCell(cell, r, x0, z0, reefy, vd) {
    if (reefy > 0.4) {
      const n = Math.round((reefy - 0.3) * 18);
      for (let i = 0; i < n; i++) this.scatter(cell, r, x0, z0, r.pick(['branch', 'branch', 'brain', 'fan']), 1);
      this.scatter(cell, r, x0, z0, 'anemone', r.int(3));
      this.scatter(cell, r, x0, z0, 'star', r.int(3));
    }
    if (vd < 11) this.scatter(cell, r, x0, z0, 'grass', r.int(reefy > 0.4 ? 4 : 12));
    else if (r.chance(0.3)) this.scatter(cell, r, x0, z0, 'star', 1);
  }

  scatter(cell, r, x0, z0, kind, n) {
    const { h, waterY, pal } = this.ctx;
    for (let i = 0; i < n; i++) {
      const x = x0 + r.range(0, CELL), z = z0 + r.range(0, CELL), y = h(x, z), d = waterY - y;
      if (d < 1.2) continue;
      const s = this.sizeOf(kind, r, d);
      _e.set(r.range(-0.12, 0.12), r.range(0, 6.28), r.range(-0.12, 0.12));
      _m.compose(_p.set(x, y - 0.08, z), _q.setFromEuler(_e), _s.set(s[0], s[1], s[0]));
      (cell[kind] ??= []).push([_m.clone(), this.colorOf(kind, r, pal)]);
    }
  }

  sizeOf(kind, r, d) {
    if (kind === 'kelp') { const H = Math.min(16, d * r.range(0.55, 0.95)); return [r.range(1.8, 2.6), H]; }
    if (kind === 'grass') return [r.range(1, 1.6), r.range(0.4, 0.9)];
    if (kind === 'star') { const s = r.range(0.7, 1.3); return [s, s]; }
    const s = { branch: [1, 2.6], brain: [0.8, 2.4], fan: [1, 2.6], anemone: [0.8, 1.7] }[kind];
    const v = Math.min(r.range(...s), d * 0.6);
    return [v, v];
  }

  colorOf(kind, r, pal) {
    if (kind === 'kelp') return _c.set(pal.kelp).offsetHSL(r.range(-0.03, 0.03), 0, r.range(-0.06, 0.06)).clone();
    if (kind === 'grass') return _c.set(pal.grass).offsetHSL(r.range(-0.03, 0.03), 0, r.range(-0.05, 0.05)).clone();
    if (kind === 'anemone') return _c.set(pal.anemone).offsetHSL(r.range(-0.08, 0.08), 0, 0).clone();
    if (kind === 'star') return _c.set(r.chance(0.5) ? pal.star : r.pick(pal.coral)).clone();
    return _c.set(r.pick(pal.coral)).offsetHSL(r.range(-0.03, 0.03), 0, r.range(-0.08, 0.05)).clone();
  }

  // Builds missing cells (a few per frame) and refreshes the instance buffers when done.
  refresh(cam) {
    const cx = Math.floor(cam.x / CELL), cz = Math.floor(cam.z / CELL);
    if (!this.center || this.center.x !== cx || this.center.z !== cz) { this.center = { x: cx, z: cz }; this.dirty = true; }
    if (!this.dirty) return;
    let built = 0;
    for (let i = -REACH; i <= REACH && built < NEW_PER_FRAME; i++) {
      for (let j = -REACH; j <= REACH && built < NEW_PER_FRAME; j++) {
        const key = `${cx + i},${cz + j}`;
        if (!this.cells.has(key)) { this.cells.set(key, this.buildCell(cx + i, cz + j)); built++; }
      }
    }
    if (built >= NEW_PER_FRAME) return; // continue next frame
    this.dirty = false;
    this.evict(cx, cz);
    this.fill(cx, cz);
  }

  evict(cx, cz) {
    for (const key of this.cells.keys()) {
      const [x, z] = key.split(',').map(Number);
      if (Math.abs(x - cx) > KEEP || Math.abs(z - cz) > KEEP) this.cells.delete(key);
    }
  }

  fill(cx, cz) {
    const counts = {};
    for (const k of Object.keys(KINDS)) counts[k] = 0;
    for (let i = -REACH; i <= REACH; i++) {
      for (let j = -REACH; j <= REACH; j++) {
        const cell = this.cells.get(`${cx + i},${cz + j}`);
        for (const k in cell) {
          const mesh = this.meshes[k];
          for (const [m, c] of cell[k]) {
            if (counts[k] >= KINDS[k].cap) break;
            mesh.setMatrixAt(counts[k], m);
            mesh.setColorAt(counts[k]++, c);
          }
        }
      }
    }
    for (const [k, mesh] of Object.entries(this.meshes)) {
      mesh.count = counts[k];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  get instanceCount() { return Object.values(this.meshes).reduce((s, m) => s + m.count, 0); }

  update(dt, cam) {
    this.t += dt;
    this.refresh(cam);
    this.updateCrabs(dt, cam);
  }

  // Crabs scuttle sideways over shallow floor near the camera; far ones respawn.
  updateCrabs(dt, cam) {
    const { h, waterY, scale } = this.ctx;
    let n = 0;
    for (const c of this.crabs) {
      if (c.dead) continue;
      if (!c.placed || c.pos.distanceToSquared(cam) > 60 * 60) this.placeCrab(c, cam);
      if (!c.placed) continue;
      c.t += dt;
      if (Math.sin(c.t * 0.7 + c.yaw * 3) > 0.2) {
        const side = Math.sin(c.t * 0.23) > 0 ? 1 : -1, sp = 0.5 * side * dt;
        const nx = c.pos.x - Math.sin(c.yaw) * sp, nz = c.pos.z - Math.cos(c.yaw) * sp;
        if (scale.zone(waterY - h(nx, nz)) !== 'abyss') { c.pos.x = nx; c.pos.z = nz; } else c.yaw += 1;
      }
      c.pos.y = h(c.pos.x, c.pos.z) + Math.abs(Math.sin(c.t * 12)) * 0.02;
      _m.compose(c.pos, _q.setFromEuler(_e.set(0, c.yaw, 0)), _s.setScalar(c.size));
      this.crabMesh.setMatrixAt(n++, _m);
    }
    this.crabMesh.count = n;
    this.crabMesh.instanceMatrix.needsUpdate = true;
  }

  placeCrab(c, cam) {
    const { h, waterY, scale } = this.ctx;
    c.placed = false;
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * 6.28, r = 8 + Math.random() * 40, x = cam.x + Math.cos(a) * r, z = cam.z + Math.sin(a) * r;
      const d = waterY - h(x, z);
      if (d < 0.8 || scale.zone(d) === 'abyss') continue;
      c.pos.set(x, h(x, z), z);
      c.yaw = Math.random() * 6.28;
      c.size = 0.8 + Math.random() * 1.2;
      c.placed = true;
      return;
    }
  }

  // Nearest crab within maxDist, for the creature label: { name, distance }.
  nearestCrab(pos, maxDist) {
    let best = maxDist, found = null;
    for (const c of this.crabs) {
      if (!c.placed || c.dead) continue;
      const d = c.pos.distanceTo(pos);
      if (d < best) { best = d; found = c; }
    }
    return found ? { crab: found, distance: best } : null;
  }

  crabCount(pos, r) { return this.crabs.filter((c) => c.placed && !c.dead && c.pos.distanceTo(pos) < r).length; }

  dispose() {
    for (const mesh of [...Object.values(this.meshes), this.crabMesh]) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      mesh.dispose();
    }
    this.cells.clear();
  }
}
