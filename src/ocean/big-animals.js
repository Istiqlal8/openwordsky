// The larger sea animals around the camera: turtles, rays, a dolphin pod near the surface,
// sharks (some hunt a swimming player), mantas, whales (rigged whale.glb once loaded), and in
// the abyss anglerfish and giant squid. A fixed pool; animals out of range respawn nearby.
import * as THREE from 'three';
import { readyModel, cloneModel, tintedMaterial } from '../view/life/models/model-cache.js';
import { BoneAnimator } from '../view/life/models/bone-animator.js';
import { ModelKit, buildShark, buildDolphin, buildTurtle, buildRay } from './animal-models.js';
import { buildAngler, buildSquid, buildWhaleStandIn } from './deep-models.js';
import { waterSpot, clampToWater } from './water-spot.js';

// n, body length (m), cruise speed (m/s), hp, band (water column), minDepth (m)
const SPECS = {
  turtle: { zones: ['reef'], n: 3, len: [1, 1.4], speed: 1.2, hp: 80, band: [0.2, 0.8] },
  ray: { zones: ['reef', 'mid'], n: 3, len: [1.2, 2], speed: 1.3, hp: 60, band: [0, 0.08] },
  dolphin: { zones: ['reef', 'mid'], n: 4, len: [2, 2.6], speed: 6, hp: 120, band: [0.8, 0.9], minDepth: 4 },
  shark: { zones: ['mid', 'reef'], n: 4, len: [2.4, 4], speed: 3.2, hp: 160, band: [0.2, 0.8], minDepth: 4 },
  manta: { zones: ['mid'], n: 2, len: [2.5, 4], speed: 2, hp: 150, band: [0.3, 0.8] },
  whale: { zones: ['mid', 'abyss'], n: 2, len: [11, 15], speed: 2.4, hp: 400, band: [0.4, 0.7], minDepth: 12 },
  angler: { zones: ['abyss'], n: 4, len: [1, 1.6], speed: 0.7, hp: 50, band: [0.02, 0.3] },
  squid: { zones: ['abyss'], n: 2, len: [5, 8], speed: 1.8, hp: 220, band: [0.2, 0.7] },
};
const RANGE = 150, CHASE = 26, BITE = 15;
const _v = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YZX');

export class BigAnimals {
  constructor(scene, ctx, owner) {
    Object.assign(this, { scene, ctx, owner, t: 0 });
    this.kit = new ModelKit();
    this.pool = [];
    this.pod = { center: new THREE.Vector3(), target: new THREE.Vector3(), placed: false };
    for (const [kind, spec] of Object.entries(SPECS)) for (let i = 0; i < spec.n; i++) this.pool.push(this.make(kind, spec, i));
  }

  make(kind, spec, i) {
    const pal = this.ctx.pal, len = spec.len[0] + Math.random() * (spec.len[1] - spec.len[0]);
    const model = { shark: () => buildShark(this.kit, pal), dolphin: () => buildDolphin(this.kit, pal), turtle: () => buildTurtle(this.kit, pal),
      ray: () => buildRay(this.kit, pal, false), manta: () => buildRay(this.kit, pal, true), angler: () => buildAngler(this.kit, pal),
      squid: () => buildSquid(this.kit, pal), whale: () => buildWhaleStandIn(this.kit, pal.earth ? 0x3a4a5a : pal.shark) }[kind]();
    const obj = new THREE.Group();
    obj.rotation.order = 'YZX';
    model.group.scale.setScalar(len);
    obj.add(model.group);
    obj.visible = false;
    this.scene.add(obj);
    return { kind, spec, name: this.ctx.names[kind], obj, model, len, i, pos: obj.position, dir: new THREE.Vector3(1, 0, 0),
      target: new THREE.Vector3(), placed: false, retry: Math.random(), t: Math.random() * 20, hp: spec.hp, maxHp: spec.hp,
      radius: len * (kind === 'whale' ? 0.2 : kind === 'squid' ? 0.15 : 0.35), hit: { position: new THREE.Vector3() },
      hostile: kind === 'shark' && i % 2 === 0, biteCd: 0, dead: 0, speed: 0 };
  }

  deepEnough(a, p) { return this.ctx.waterY - this.ctx.h(p.x, p.z) >= (a.spec.minDepth ?? 2.2); }

  place(a, cam) {
    if (a.kind === 'dolphin' && this.pod.placed && a.i > 0) {
      a.pos.copy(this.pod.center).add(_v.set(Math.random() * 6 - 3, 0, Math.random() * 6 - 3));
      return this.show(a, true);
    }
    for (let k = 0; k < 3; k++) {
      if (!waterSpot(this.ctx, cam, 40, 120, a.spec.zones, a.pos, a.spec.band) || !this.deepEnough(a, a.pos)) continue;
      a.target.copy(a.pos);
      if (a.kind === 'dolphin') { this.pod.center.copy(a.pos); this.pod.target.copy(a.pos); this.pod.placed = true; }
      return this.show(a, true);
    }
    return false;
  }

  show(a, on) {
    a.placed = on;
    a.obj.visible = on;
    return on;
  }

  // Next waypoint in the same zone; dolphins follow the pod's waypoint.
  wander(a) {
    if (a.kind === 'dolphin') {
      const pod = this.pod;
      if (pod.center.distanceTo(pod.target) < 4 && waterSpot(this.ctx, pod.center, 25, 60, a.spec.zones, _v, a.spec.band) && this.deepEnough(a, _v)) pod.target.copy(_v);
      return a.target.copy(pod.target).add(_v.set(Math.sin(a.i * 2.1) * 4, 0, Math.cos(a.i * 2.1) * 4));
    }
    if (a.pos.distanceTo(a.target) > 3) return a.target;
    if (!waterSpot(this.ctx, a.pos, 12, 45, a.spec.zones, _v, a.spec.band) || !this.deepEnough(a, _v)) return a.target.copy(a.pos).addScaledVector(a.dir, -8);
    return a.target.copy(_v);
  }

  // Hostile sharks go for a swimming player; returns the speed multiplier.
  hunt(a, dt, player) {
    a.biteCd -= dt;
    const o = this.owner;
    if (!a.hostile || !player || o.calm > 0 || !o.swimmer) return 1;
    const d = a.pos.distanceTo(player);
    if (d > CHASE || player.y > this.ctx.waterY - 0.2) return 1;
    a.target.copy(player);
    if (d < a.len * 0.6 + 1 && a.biteCd <= 0) { a.biteCd = 1.6; o.onBite?.({ name: a.name, kind: 'shark' }, BITE); }
    return 2.2;
  }

  move(a, dt, player) {
    const boost = this.hunt(a, dt, player);
    if (boost === 1) this.wander(a);
    _v.subVectors(a.target, a.pos);
    const len = _v.length(), sp = a.spec.speed * boost;
    if (len > 0.01) a.dir.lerp(_v.divideScalar(len), Math.min(1, dt * (a.kind === 'whale' ? 0.4 : 1.2))).normalize();
    a.speed = Math.min(sp, len / Math.max(dt, 1e-3));
    a.pos.addScaledVector(a.dir, a.speed * dt);
    if (!clampToWater(this.ctx, a.pos, a.kind === 'ray' || a.kind === 'angler' ? 0.3 : a.len * 0.12, a.kind === 'whale' ? 3 : 0.8)) a.target.copy(a.pos).addScaledVector(a.dir, -10);
    if (a.kind === 'dolphin') this.porpoise(a);
    if (a.kind === 'dolphin' && a.i === 0) this.pod.center.copy(a.pos);
  }

  // Dolphins arc up and down, breaking the surface now and then.
  porpoise(a) {
    const amp = 1.4 + (a.i % 3) * 0.45, wy = this.ctx.waterY;
    a.pos.y = wy - 1.6 + Math.sin(a.t * 1.3 + a.i * 1.7) * amp;
    a.pitch = Math.cos(a.t * 1.3 + a.i * 1.7) * 0.5;
    a.pos.y = Math.max(a.pos.y, this.ctx.h(a.pos.x, a.pos.z) + 0.8);
  }

  animate(a, dt) {
    a.t += dt * (0.6 + a.speed / a.spec.speed * 0.6);
    const h = Math.hypot(a.dir.x, a.dir.z);
    const pitch = a.kind === 'dolphin' ? a.pitch : Math.atan2(a.dir.y, h) * 0.8;
    a.obj.rotation.set(0, Math.atan2(-a.dir.z, a.dir.x), pitch);
    if (a.kind === 'whale') this.whale(a, dt);
    else a.model.anim(a.t, a.speed);
    a.hit.position.copy(a.pos).y -= a.radius * 0.8;
  }

  // Swaps the stand-in for the rigged whale once whale.glb is ready.
  whale(a, dt) {
    if (!a.inst) {
      const tpl = readyModel('whale');
      if (!tpl) return;
      this.whaleMat ??= tintedMaterial(tpl, this.ctx.pal.earth ? 0x3a4a5a : this.ctx.pal.shark, 0.45);
      a.inst = cloneModel(tpl, this.whaleMat);
      const s = a.len / tpl.length;
      a.inst.scene.scale.setScalar(s);
      a.inst.scene.position.y = -0.5 * s;
      a.obj.remove(a.model.group);
      a.obj.add(a.inst.scene);
      a.anim = new BoneAnimator(a.inst, a.i * 0.37);
    }
    a.anim.update(dt, { mode: 'swim' });
  }

  update(dt, cam, player) {
    this.t += dt;
    if (!this.pool.some((a) => a.kind === 'dolphin' && a.placed)) this.pod.placed = false;
    for (const a of this.pool) {
      if (a.dead > 0) { a.dead -= dt; continue; }
      if (a.placed && a.pos.distanceTo(cam) > RANGE) this.show(a, false);
      if (!a.placed && (a.retry -= dt) <= 0) { a.retry = 0.6; this.place(a, cam); }
      if (!a.placed) continue;
      this.move(a, dt, player);
      this.animate(a, dt);
    }
  }

  get visibleCount() { return this.pool.filter((a) => a.placed).length; }

  bodies() {
    return this.pool.filter((a) => a.placed).map((a) => ({ root: a.hit, radius: a.radius, ref: a, hp: a.maxHp }));
  }

  kill(a) {
    this.show(a, false);
    a.dead = 45;
    a.hp = a.maxHp;
  }

  provoke(a) {
    if (a.kind === 'shark') { a.hostile = true; this.owner.calm = 0; }
    else a.target.copy(a.pos).addScaledVector(a.dir, 30); // bolt away
  }

  dispose() {
    for (const a of this.pool) {
      this.scene.remove(a.obj);
      a.inst?.meshes.forEach((m) => m.skeleton.dispose());
    }
    this.whaleMat?.dispose();
    this.kit.dispose();
    this.pool = [];
  }
}
