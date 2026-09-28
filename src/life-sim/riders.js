// Villagers with animals: a Rider fetches a tamed mount, climbs on its back and rides a loop
// around the settlement or a trip to the next one (galloping); a Herder walks a pasture loop
// behind a small flock. Both "own" their animals: the wildlife group calls drive(a, dt) each frame.
import { actors, aliveRef } from './actors.js';

const HIP = 0.88;
const STALE = 0.5;       // animals wait when their owner has not been updated this long (far away)
const _out = { x: 0, z: 0, speed: 0, graze: false };

// Height of a mount's back above its root, in metres.
function seatHeight(a) {
  const p = a.parts?.plan;
  if (p) return (p.bodyY + p.rh * 0.75) * a.scale;
  return (a.height ?? 2) * 0.6;
}

export class Rider {
  // route: [{ x, z }] waypoints; gallop: ride fast (trips between settlements).
  constructor(v, route, gallop, stable) {
    Object.assign(this, { v, route, gallop, stable, seed: v.seed, mount: null, i: 0, wait: 0, retry: 0, seen: 0, stuck: 0, best: Infinity });
  }

  update(dt, ctx) {
    this.seen = actors.clock;
    const v = this.v;
    if (!aliveRef(this.mount)) return this.fetch(dt, ctx);
    if (!v.riding) return this.board(dt);
    const r = this.mount.root;
    v.feet.x = r.position.x;
    v.feet.z = r.position.z;
    v.feet.y = r.position.y;
    v.lift = seatHeight(this.mount) - HIP + 0.08;
    v.yaw = r.rotation.y - Math.PI / 2;
    v.group.visible = r.visible;
    return 'ride';
  }

  // No mount yet (or it was lost): ask the wildlife for one now and then.
  fetch(dt, ctx) {
    this.dismount();
    this.mount = null;
    if ((this.retry -= dt) <= 0 && actors.wildlife) {
      this.retry = 20;
      this.mount = actors.wildlife.adopt('mount', this.stable, this);
    }
    return this.v.roam(dt, ctx);
  }

  // Walk up to the mount and climb on.
  board(dt) {
    const p = this.mount.pos, v = this.v;
    if (!v.moveTo(p.x, p.z, 1.6, dt, 1.2 + (this.mount.radius ?? 0.5) * 0.3)) return 'walk';
    v.riding = true;
    return 'ride';
  }

  dismount() {
    const v = this.v;
    if (!v.riding) return;
    v.riding = false;
    v.lift = 0;
    v.feet.x += Math.cos(v.yaw) * 1.4;
    v.feet.z -= Math.sin(v.yaw) * 1.4;
  }

  // Mount steering: next waypoint while ridden; stand and graze otherwise.
  drive(a, dt) {
    const o = _out, v = this.v, fresh = this.seen > 0 && actors.clock - this.seen < STALE;
    o.x = a.pos.x; o.z = a.pos.z; o.speed = 0; o.graze = true;
    if (!fresh) return o;
    if (!v.riding) return this.come(a, o);
    if (this.wait > 0) { this.wait -= dt; return o; }
    const w = this.route[this.i], d = Math.hypot(w.x - a.pos.x, w.z - a.pos.z);
    this.progress(d, dt);
    if (d < 3 || this.stuck > 4) return this.next(o);
    o.x = w.x; o.z = w.z; o.graze = false;
    o.speed = this.gallop ? (a.runSpeed ?? 6.5) : (a.walkSpeed ?? 1.8) * 1.25;
    return o;
  }

  // Not ridden: trot over to the rider waiting for it (unless busy with an attack).
  come(a, o) {
    const v = this.v, d = Math.hypot(v.feet.x - a.pos.x, v.feet.z - a.pos.z);
    if (v.vitals.mode || d < 2.5) return o;
    o.x = v.feet.x; o.z = v.feet.z; o.graze = false;
    o.speed = (a.walkSpeed ?? 1.8) * 1.6;
    return o;
  }

  progress(d, dt) {
    if (d < this.best - 0.5) { this.best = d; this.stuck = 0; } else this.stuck += dt;
  }

  next(o) {
    this.i = (this.i + 1) % this.route.length;
    this.best = Infinity;
    this.stuck = 0;
    if (Math.random() < 0.3 || this.i === 0) this.wait = 3 + Math.random() * 5;
    return o;
  }

  release() { this.dismount(); this.mount = null; }
}

export class Herder {
  // pasture: { x, z } centre of the grazing loop; count: flock size.
  constructor(v, pasture, count) {
    Object.assign(this, { v, pasture, count, seed: v.seed, flock: [], i: 0, retry: 0, seen: 0, pause: 0 });
  }

  update(dt, ctx) {
    this.seen = actors.clock;
    this.flock = this.flock.filter(aliveRef);
    if (!this.flock.length) this.adopt(dt);
    const v = this.v;
    if (this.pause > 0) { this.pause -= dt; return 'idle'; }
    const a = (this.i / 8) * Math.PI * 2, r = 12;
    if (!v.moveTo(this.pasture.x + Math.cos(a) * r, this.pasture.z + Math.sin(a) * r, 1.1, dt, 0.8)) return 'walk';
    this.i = (this.i + 1) % 8;
    if (Math.random() < 0.4) this.pause = 3 + Math.random() * 4;
    return 'idle';
  }

  adopt(dt) {
    if ((this.retry -= dt) > 0 || !actors.wildlife) return;
    this.retry = 30;
    for (let k = 0; k < this.count; k++) {
      const a = actors.wildlife.adopt('flock', { x: this.pasture.x + (k % 3) * 2 - 2, z: this.pasture.z + Math.floor(k / 3) * 2 }, this);
      if (!a) return;
      a.slot = k;
      this.flock.push(a);
    }
  }

  // Livestock keep a few metres ahead of the herder, grazing whenever he stops.
  drive(a, dt) {
    const o = _out, v = this.v, fresh = this.seen > 0 && actors.clock - this.seen < STALE;
    const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw), k = a.slot ?? 0;
    const side = ((k % 3) - 1) * 2.2, ahead = 4 + Math.floor(k / 3) * 2.2;
    o.x = v.feet.x + fx * ahead - fz * side;
    o.z = v.feet.z + fz * ahead + fx * side;
    const d = Math.hypot(o.x - a.pos.x, o.z - a.pos.z);
    o.graze = !fresh || d < 2.5;
    o.speed = o.graze ? 0 : (a.walkSpeed ?? 1.2) * (d > 6 ? 1.6 : 1);
    return o;
  }

  release() { this.flock = []; }
}
