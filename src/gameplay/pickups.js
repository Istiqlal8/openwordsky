// Glowing natural items scattered on the ground (herbs, eggs, fossils...). Walk into one to pick it up.
import * as THREE from 'three';
import { rngOf } from '../core/rng.js';
import { pickupsOf } from '../quest/materials.js';
import { endemicOf } from '../quest/endemic.js';

const CELL = 20;
const RADIUS = 90;
const PROB = 0.28;
const MAX = 64;
const REACH = 2.4;
const REBUILD_DIST = 12;
const COLORS = [0x9dff6a, 0xffd36a, 0xd98cff, 0x5ff4ff]; // common, uncommon, rare, endemic relic
const REMOVED = new Map(); // planet.key -> Set of picked cell keys (session-wide)
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
const _c = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);

function rarity(u) {
  return u < 0.55 ? 0 : u < 0.8 ? 1 : u < 0.93 ? 2 : 3;
}

export class Pickups {
  constructor(ctx) {
    this.ctx = ctx; // { surface, player, sfx, fx, planet }
    const relic = endemicOf(ctx.planet).find((e) => e.source === 'pickup');
    this.names = [...pickupsOf(ctx.planet), relic?.name];
    if (!REMOVED.has(ctx.planet.key)) REMOVED.set(ctx.planet.key, new Set());
    this.removed = REMOVED.get(ctx.planet.key);
    this.items = [];
    this.center = null;
    this.t = 0;
    this.gem = this.instanced(new THREE.OctahedronGeometry(0.35, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false });
    this.beam = this.instanced(new THREE.CylinderGeometry(0.05, 0.12, 6, 6, 1, true).translate(0, 3, 0), beamMat);
  }

  instanced(geo, mat) {
    const mesh = new THREE.InstancedMesh(geo, mat, MAX);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3).fill(1), 3);
    mesh.count = 0;
    mesh.frustumCulled = false;
    this.ctx.surface.scene.add(mesh);
    return mesh;
  }

  // Deterministic items in the cells around (cx, cz).
  rebuild(cx, cz) {
    const { planet, surface } = this.ctx, t = planet.terrain;
    this.center = { x: cx, z: cz };
    this.items = [];
    const r = Math.ceil(RADIUS / CELL), ox = Math.floor(cx / CELL), oz = Math.floor(cz / CELL);
    for (let ix = ox - r; ix <= ox + r; ix++) {
      for (let iz = oz - r; iz <= oz + r; iz++) {
        const key = `${ix},${iz}`, rng = rngOf(planet.seed, ix, iz, 4242);
        if (rng.next() >= PROB || this.removed.has(key) || this.items.length >= MAX) continue;
        const x = (ix + rng.next()) * CELL, z = (iz + rng.next()) * CELL;
        const y = surface.floorAt(x, z);
        if (t.hasWater && y < t.waterY + 0.2 && planet.biome.id !== 'ocean') continue;
        const tier = rarity(rng.next());
        this.items.push({ key, x, y, z, tier, name: this.names[tier] ?? this.names[0], phase: rng.next() * 6 });
      }
    }
    this.draw();
  }

  draw() {
    this.items.forEach((it, i) => {
      _c.setHex(COLORS[it.tier]);
      _m.compose(_p.set(it.x, it.y, it.z), _q.identity(), _s.set(1, 1, 1));
      this.beam.setMatrixAt(i, _m);
      this.beam.setColorAt(i, _c);
      this.gem.setColorAt(i, _c);
    });
    for (const m of [this.gem, this.beam]) {
      m.count = this.items.length;
      m.instanceMatrix.needsUpdate = true;
      m.instanceColor.needsUpdate = true;
    }
  }

  // Bob + spin the gems; collect the ones the player walks into.
  update(dt) {
    const f = this.ctx.surface.feet;
    if (!this.center || Math.hypot(f.x - this.center.x, f.z - this.center.z) > REBUILD_DIST) this.rebuild(f.x, f.z);
    this.t += dt;
    this.items.forEach((it, i) => {
      _q.setFromAxisAngle(UP, this.t * 1.5 + it.phase);
      _m.compose(_p.set(it.x, it.y + 0.7 + Math.sin(this.t * 2 + it.phase) * 0.15, it.z), _q, _s.set(1, 1.4, 1));
      this.gem.setMatrixAt(i, _m);
    });
    this.gem.instanceMatrix.needsUpdate = true;
    const hit = this.items.find((it) => Math.hypot(it.x - f.x, it.z - f.z) < REACH && Math.abs(it.y - f.y) < 3);
    if (hit) this.collect(hit);
  }

  collect(it) {
    const { player, sfx, fx } = this.ctx;
    this.removed.add(it.key);
    this.items = this.items.filter((x) => x !== it);
    this.draw();
    const n = it.tier >= 2 ? 1 : 1 + Math.floor(Math.random() * 2);
    player.addItem(it.name, n);
    player.emit('act', { type: 'pickup', item: it.name, n: 1 });
    sfx?.pickup?.();
    fx?.sparks(_p.set(it.x, it.y + 0.7, it.z), COLORS[it.tier], 10);
  }

  dispose() {
    for (const m of [this.gem, this.beam]) {
      m.parent?.remove(m);
      m.geometry.dispose();
      m.material.dispose();
      m.dispose();
    }
    this.items = [];
  }
}
