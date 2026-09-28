// Market crowd: 30–60 aliens of every race strolling the avenues, pausing at stalls and
// crossing the plaza. One instanced mesh pair (body + glow) per race; limbs swing in the
// vertex shader, so the whole crowd costs ~2 draw calls per race.
import * as THREE from 'three';
import { Rng, hash32 } from '../core/rng.js';
import { groundY } from '../base/site.js';
import { RACES, alienName } from '../aliens/races.js';
import { bakeRace, patchCrowd } from './crowd-bake.js';
import { HUB, avenuePoint } from './hub-plan.js';

const SHOW_RANGE = HUB.R + 450; // crowd hidden when the player is this far from the hub centre
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0), _col = new THREE.Color();

export class HubCrowd {
  // ctx: { scene, frame (base/site Frame), h, planet, plan, center }
  constructor(ctx, seed, count) {
    Object.assign(this, ctx);
    const rng = new Rng(hash32(seed, 0xc40d));
    this.bodyMat = patchCrowd(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }));
    this.glowMat = patchCrowd(new THREE.MeshBasicMaterial({ vertexColors: true }));
    this.walkers = [];
    const races = rng.take(RACES, RACES.length);
    for (let i = 0; i < count; i++) this.walkers.push(this.makeWalker(rng, races[i % races.length], i, seed));
    this.makeMeshes(seed);
    this.group = new THREE.Group();
    for (const r of this.races) this.group.add(...r.meshes);
    this.scene.add(this.group);
  }

  // Every third walker strolls around the plaza; the rest walk the avenues.
  makeWalker(rng, race, i, seed) {
    const plaza = i % 3 === 0, t = plaza ? rng.range(0, Math.PI * 2) : rng.pick(this.plan.avenues);
    const start = plaza ? avenuePoint(t, rng.range(15, HUB.plaza - 2)) : avenuePoint(t, 30 + (HUB.R - 38) * rng.next() ** 2, rng.range(-4.5, 4.5));
    return { race, seed: hash32(seed, i, 0x3a1c), plaza, t, lx: start.x, lz: start.z,
      goal: null, yaw: rng.range(0, 6.28), speed: race.speed * rng.range(0.8, 1.2), pause: rng.range(0, 4),
      height: rng.range(race.height[0], race.height[1]), walkT: rng.range(0, 6), amp: 0, phase: rng.range(0, 20),
      tint: rng.next(), light: rng.range(0.85, 1.15), feet: new THREE.Vector3() };
  }

  // One instanced body + glow mesh per race present in the crowd.
  makeMeshes(seed) {
    const byRace = new Map();
    for (const w of this.walkers) (byRace.get(w.race) ?? byRace.set(w.race, []).get(w.race)).push(w);
    this.races = [...byRace].map(([race, list]) => {
      const tpl = bakeRace(race, hash32(seed, race.id.length, 0x7e3));
      const anim = new THREE.InstancedBufferAttribute(new Float32Array(list.length * 3), 3);
      const meshes = [];
      for (const [geo, mat] of [[tpl.body, this.bodyMat], [tpl.glow, this.glowMat]]) {
        if (!geo) continue;
        geo.setAttribute('iAnim', anim);
        const m = new THREE.InstancedMesh(geo, mat, list.length);
        m.frustumCulled = false;
        meshes.push(m);
      }
      list.forEach((w, i) => { w.slot = i; w.scale = w.height / tpl.unit; });
      list.forEach((w) => meshes[0].setColorAt(w.slot, _col.setHSL(w.tint, 0.12, 0.5).multiplyScalar(w.light * 2)));
      return { race, list, tpl, anim, meshes };
    });
  }

  update(dt, player, time) {
    const far = Math.hypot(player.x - this.center.x, player.z - this.center.z) > SHOW_RANGE;
    this.group.visible = !far;
    if (far) return;
    for (const r of this.races) {
      for (const w of r.list) { this.step(w, dt); this.pose(r, w, time); }
      for (const m of r.meshes) m.instanceMatrix.needsUpdate = true;
      r.anim.needsUpdate = true;
    }
  }

  // Walk toward the goal along the avenue; pause at stalls; sometimes cross the plaza.
  step(w, dt) {
    if (w.pause > 0) { w.pause -= dt; w.amp = Math.max(0, w.amp - dt * 2); return; }
    w.goal ??= this.pickGoal(w);
    const dx = w.goal.x - w.lx, dz = w.goal.z - w.lz, d = Math.hypot(dx, dz);
    if (d < 0.5) { w.goal = null; w.pause = w.hub ? 0 : 1 + Math.random() * 5; return; }
    const want = Math.atan2(-dx, -dz), diff = Math.atan2(Math.sin(want - w.yaw), Math.cos(want - w.yaw));
    w.yaw += diff * Math.min(1, dt * 5);
    const s = Math.min(d, w.speed * dt);
    w.lx += (dx / d) * s;
    w.lz += (dz / d) * s;
    w.walkT += dt * (w.speed * 3.2 / Math.max(1, w.height));
    w.amp = Math.min(1, w.speed / 2) * 0.6;
  }

  pickGoal(w) {
    if (w.plaza) { // next point on the plaza ring, never across the tower
      w.t += (Math.random() * 2 - 1) * 1.0;
      return avenuePoint(w.t, 15 + Math.random() * (HUB.plaza - 17));
    }
    if (w.hub) { // at the plaza: continue onto a neighbouring avenue
      const i = this.plan.avenues.indexOf(w.t), n = this.plan.avenues.length;
      w.t = this.plan.avenues[(i + (Math.random() < 0.5 ? 1 : n - 1)) % n];
      w.hub = false;
    } else if (Math.random() < 0.25) {
      w.hub = true;
      return avenuePoint(w.t, 22, 0);
    }
    return avenuePoint(w.t, 30 + (HUB.R - 38) * Math.random() ** 2, (Math.random() * 2 - 1) * 4.5); // busier near the plaza
  }

  pose(r, w, time) {
    const f = this.frame, x = f.x(w.lx, w.lz), z = f.z(w.lx, w.lz);
    w.feet.set(x, groundY(this.h, this.planet, x, z), z);
    _q.setFromAxisAngle(_up, w.yaw + f.yaw);
    _m.compose(w.feet, _q, _s.setScalar(w.scale));
    for (const m of r.meshes) m.setMatrixAt(w.slot, _m);
    r.anim.setXYZ(w.slot, w.walkT, w.amp, time + w.phase);
  }

  // Closest walker -> { w, d } (d = Infinity when none).
  closest(pos) {
    let best = null, bd = Infinity;
    for (const w of this.walkers) {
      const d = Math.hypot(pos.x - w.feet.x, pos.z - w.feet.z);
      if (d < bd) { best = w; bd = d; }
    }
    return { w: best, d: bd };
  }

  nameOf(w) { return (w.name ??= alienName(w.race, new Rng(w.seed))); }

  dispose() {
    this.group.removeFromParent();
    for (const r of this.races) {
      for (const m of r.meshes) m.dispose();
      r.tpl.body?.dispose();
      r.tpl.glow?.dispose();
    }
    this.bodyMat.dispose();
    this.glowMat.dispose();
    this.races = this.walkers = [];
  }
}
