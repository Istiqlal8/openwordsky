// Gliders: flocks of manta-like flyers of the upper clouds. Curious: once the ship is near they
// swing round and bank in formation around it, matching its drift; otherwise they wander.
import * as THREE from 'three';
import { Agent, Species, wander, circle, steer, orient } from './fauna-mind.js';
import { Frame } from './fauna-fields.js';

const _f = new Frame(), _p = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
const _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _roll = new THREE.Quaternion();
const Z = new THREE.Vector3(0, 0, 1);

// V formation behind the leader, in wingspans.
function formation(rng, n) {
  return Array.from({ length: n }, (_, i) => {
    const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    return { phase: rng.range(0, 20), size: rng.range(0.8, 1.2),
      off: new THREE.Vector3(side * row * 1.5 + rng.range(-0.3, 0.3), -row * 0.25 + rng.range(-0.3, 0.3), row * 1.3) };
  });
}

export class Gliders extends Species {
  constructor(theme) {
    super(theme.name('glider'), [-700, 300], [500, 1800], 200);
    const rng = theme.rng('glider');
    this.glow = theme.glow(rng, 0.04, 0.62);
    this.skin = theme.belly.clone().lerp(this.glow, 0.35).multiplyScalar(0.55);
    this.span = rng.range(7, 13);
    this.orbit = rng.range(70, 140);
    this.tail = rng.range(1.2, 2.4);
    for (let i = 0; i < 2; i++) {
      const a = new Agent(this.span * 3);
      a.members = formation(rng, 7 + rng.int(6));
      a.dir = rng.chance(0.5) ? 1 : -1;
      this.agents.push(a);
    }
  }

  update(ctx) {
    if (!this.tick(ctx)) return;
    for (const a of this.agents) {
      a.mood = a.shipDist < 1100 ? Math.min(1, a.mood + ctx.dt * 0.5) : Math.max(0, a.mood - ctx.dt * 0.2);
      const want = a.mood > 0.3 ? circle(a, ctx.ship, ctx.vel, this.orbit, 30, a.dir, _d) : wander(a, ctx.t, 22, _d);
      steer(a, want, 0.9, ctx.dt);
      orient(a, ctx.dt, 1.2);
      for (const m of a.members) this.drawGlider(a, m, ctx);
    }
  }

  drawGlider(a, m, ctx) {
    const t = ctx.t + m.phase, S = this.span * m.size, d = ctx.draw;
    _p.copy(m.off).multiplyScalar(this.span).applyQuaternion(a.quat).add(a.pos);
    _p.y += Math.sin(t * 1.1) * 1.5;
    _q.copy(a.quat).multiply(_roll.setFromAxisAngle(Z, Math.sin(t * 0.8) * 0.12));
    _f.set(_p, _q, S);
    _f.part(d.manta, 0, 0, 0, 0, 0, 0, 1, 1, 1, this.skin);
    for (const s of [-1, 1]) d.glow.add(_f.point(_a, s * 0.12, 0.03, -0.42), S * 0.12, this.glow, 1.1);
    for (let i = 0; i < 3; i++) d.glow.add(_f.point(_a, 0, 0.04, -0.2 + i * 0.22), S * 0.1, this.glow, 0.5);
    _f.point(_a, 0, 0, 0.45);
    for (let i = 1; i <= 4; i++) {
      _f.point(_b, Math.sin(t * 3 - i) * 0.06 * i, 0, 0.45 + (i / 4) * this.tail);
      d.strand.add(_a, _b, this.glow, 0.9);
      _a.copy(_b);
    }
    d.glow.add(_a, S * 0.12, this.glow, 0.9);
  }
}
