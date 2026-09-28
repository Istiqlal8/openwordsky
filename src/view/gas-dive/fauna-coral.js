// Cloud coral: floating spherical reef colonies in the mid layers, lumpy bodies bristling with
// glowing polyps that ripple with light. Shy polyps pull in and dim when the ship comes close.
import * as THREE from 'three';
import { Agent, Species, wander, steer, ease } from './fauna-mind.js';
import { Frame, tube } from './fauna-fields.js';

const _f = new Frame(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
const _q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);

function sphereDirs(rng, n, jitter) {
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996 + rng.range(-jitter, jitter);
    return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r).normalize();
  });
}

export class CloudCoral extends Species {
  constructor(theme) {
    super(theme.name('coral'), [-1750, -520], [250, 1700], 280);
    const rng = theme.rng('coral');
    this.glow = theme.glow(rng, 0.06, 0.62);
    this.accent = theme.glow(rng, -0.1, 0.66);
    this.reef = theme.skin(rng, this.glow, 1.4).lerp(theme.belly, 0.3);
    this.lumps = sphereDirs(rng, 8, 0.6).map((v) => ({ v, s: rng.range(0.45, 0.68) }));
    this.polyps = sphereDirs(rng, 34 + rng.int(14), 0.3).map((v) => ({ v, len: rng.range(0.2, 0.45) }));
    const n = 3 + rng.int(3);
    for (let i = 0; i < n; i++) {
      const a = new Agent(rng.range(18, 48));
      a.r = a.size * 1.2;
      a.shut = 0;
      this.agents.push(a);
    }
  }

  update(ctx) {
    if (!this.tick(ctx)) return;
    for (const a of this.agents) {
      steer(a, wander(a, ctx.t, 2.5, _d), 0.3, ctx.dt);
      a.shut += ((a.shipDist < a.size * 3 + 60 ? 1 : 0) - a.shut) * ease(a.shut < 0.5 ? 4 : 0.6, ctx.dt);
      this.drawColony(a, ctx);
    }
  }

  drawColony(a, ctx) {
    const d = ctx.draw, t = ctx.t + a.phase, S = a.size;
    _f.set(a.pos, _q.setFromAxisAngle(UP, t * 0.04 + a.home), S);
    for (const l of this.lumps) _f.part(d.flesh, l.v.x * 0.42, l.v.y * 0.42, l.v.z * 0.42, l.v.x, l.v.y, 0, l.s, l.s * 0.9, l.s, this.reef);
    d.glow.add(a.pos, S * 2.4, this.glow, 0.35 * (1 - a.shut * 0.6));
    const open = 1 - a.shut * 0.8;
    this.polyps.forEach((p, i) => {
      const wave = 0.5 + 0.5 * Math.sin(t * 2.2 - p.v.y * 4 + i * 0.3);
      _f.point(_a, p.v.x * 0.78, p.v.y * 0.78, p.v.z * 0.78);
      const L = 0.8 + p.len * open;
      _f.point(_b, p.v.x * L, p.v.y * L, p.v.z * L);
      tube(d.tube, _a, _b, S * 0.028, this.reef);
      d.glow.add(_b, S * 0.2, i % 3 ? this.glow : this.accent, (0.35 + wave * 0.9) * open);
    });
  }
}
