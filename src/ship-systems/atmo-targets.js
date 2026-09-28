// Homing targets for atmospheric ship guns: creatures and sentinel drones in front of the camera.
// Targets are pooled proxies exposing { pos, alive } like space pirates, so RocketPool can chase them.
import * as THREE from 'three';

const POOL = 64;
const RANGE = 450;
const tmpV = new THREE.Vector3();
const tmpF = new THREE.Vector3();

// A chaseable point on a scene object; alive while the object stays in the scene.
class Proxy {
  constructor() { this.obj = null; this.ref = null; this.lift = 0; this.v = new THREE.Vector3(); }
  set(obj, ref, lift) { this.obj = obj; this.ref = ref; this.lift = lift; return this; }
  get pos() { return this.v.copy(this.obj.position).setY(this.obj.position.y + this.lift); }
  get alive() { return Boolean(this.obj?.parent) && !this.ref?.dead; }
}

export class AtmoTargets {
  constructor(ctx, sentinels) {
    this.ctx = ctx;
    this.sentinels = sentinels;
    this.pool = Array.from({ length: POOL }, () => new Proxy());
    this.next = 0;
    this.cands = [];
  }

  // Candidate objects: { obj, ref, lift } records reused across frames.
  collect() {
    const out = this.cands;
    let n = 0;
    const put = (obj, ref, lift) => {
      out[n] ??= { obj: null, ref: null, lift: 0, taken: false };
      Object.assign(out[n++], { obj, ref, lift, taken: false });
    };
    for (const d of this.sentinels()?.drones ?? []) put(d.group, null, 0);
    for (const g of this.ctx.creatures?.groups ?? []) {
      for (const b of g.bodies?.() ?? []) if (!b.ref?.dead) put(b.root, b.ref, b.radius * 0.8);
    }
    out.length = n;
    return out;
  }

  // Up to n distinct targets within coneDeg of the camera view, best aligned first.
  pick(out, n, coneDeg) {
    out.length = 0;
    const cam = this.ctx.surface.camera;
    const fwd = cam.getWorldDirection(tmpF);
    const minCos = Math.cos(THREE.MathUtils.degToRad(coneDeg));
    const cands = this.collect();
    while (out.length < n) {
      const c = this.best(cands, cam.position, fwd, minCos);
      if (!c) break;
      c.taken = true;
      out.push(this.proxy().set(c.obj, c.ref, c.lift));
    }
    return out;
  }

  best(cands, from, fwd, minCos) {
    let best = null, bestDot = minCos;
    for (const c of cands) {
      if (c.taken) continue;
      tmpV.subVectors(c.obj.position, from);
      const d = tmpV.length();
      if (d > RANGE || d < 1) continue;
      const dot = tmpV.dot(fwd) / d;
      if (dot > bestDot) { bestDot = dot; best = c; }
    }
    return best;
  }

  proxy() {
    const p = this.pool[this.next];
    this.next = (this.next + 1) % POOL;
    return p;
  }
}
