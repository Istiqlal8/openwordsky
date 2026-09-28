// Deep dwellers: bioluminescent tentacle blooms (anemones adrift, shy: they curl up when the
// ship nears) and pressure-ghosts (translucent veils that drift closer, then fade away).
import * as THREE from 'three';
import { Agent, Species, wander, steer, ease } from './fauna-mind.js';
import { Frame, tube } from './fauna-fields.js';

const TSEGS = 5, UP = new THREE.Vector3(0, 1, 0), WHITE = new THREE.Color(1, 1, 1);
const _f = new Frame(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
const _q = new THREE.Quaternion();

export class TentacleBlooms extends Species {
  constructor(theme) {
    super(theme.name('bloom'), [-3050, -1600], [150, 1300], 250);
    const rng = theme.rng('bloom');
    this.glow = theme.glow(rng, -0.1, 0.62);
    this.tip = theme.glow(rng, 0.15, 0.7);
    this.skin = theme.skin(rng, this.glow, 1.2);
    this.arms = Array.from({ length: 16 + rng.int(9) }, (_, i) => {
      const y = rng.range(0.1, 0.9), a = i * 2.39996, r = Math.sqrt(1 - y * y);
      return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    });
    for (let i = 0; i < 6; i++) {
      const a = new Agent(rng.range(3, 7));
      Object.assign(a, { r: a.size * 5, shut: 0 });
      this.agents.push(a);
    }
  }

  update(ctx) {
    if (!this.tick(ctx)) return;
    for (const a of this.agents) {
      steer(a, wander(a, ctx.t, 1.5, _d), 0.3, ctx.dt);
      a.shut += ((a.shipDist < 110 ? 1 : 0) - a.shut) * ease(a.shut < 0.5 ? 5 : 0.5, ctx.dt);
      this.drawBloom(a, ctx);
    }
  }

  drawBloom(a, ctx) {
    const d = ctx.draw, t = ctx.t + a.phase, S = a.size, reach = 1.3 * (1 - a.shut * 0.7);
    _f.set(a.pos, _q.setFromAxisAngle(UP, t * 0.05), S);
    _f.part(d.flesh, 0, 0, 0, 0, 0, 0, 1, 0.8, 1, this.skin);
    d.glow.add(a.pos, S * 4, this.glow, 0.8);
    this.arms.forEach((v, i) => {
      _f.point(_a, v.x * 0.9, v.y * 0.7, v.z * 0.9);
      for (let j = 1; j <= TSEGS; j++) {
        const sw = Math.sin(t * 0.8 - j * 0.6 + i) * 0.15 * j, curl = a.shut * j * 0.25;
        _f.point(_b, v.x * (0.9 + j * reach * 0.6 - curl) + sw, 0.7 * v.y + j * reach, v.z * (0.9 + j * reach * 0.6 - curl) + sw * 0.5);
        tube(d.tube, _a, _b, S * 0.07 * (1.1 - j / TSEGS * 0.8), this.skin);
        if (j === 3) d.glow.add(_b, S * 0.35, this.glow, 0.7);
        _a.copy(_b);
      }
      d.glow.add(_a, S * 0.6, this.tip, (0.8 + 0.6 * Math.sin(t * 2 + i)) * (1 - a.shut * 0.6));
    });
  }
}

export class PressureGhosts extends Species {
  constructor(theme) {
    super(theme.name('ghost'), [-3050, -1400], [200, 1100], 250);
    const rng = theme.rng('ghost');
    this.glow = theme.glow(rng, 0.05, 0.7).lerp(WHITE, 0.55);
    for (let i = 0; i < 5; i++) {
      const a = new Agent(rng.range(14, 38));
      Object.assign(a, { r: a.size * 1.5, fade: 0 });
      this.agents.push(a);
    }
  }

  spawned(a) { a.fade = 0; }

  update(ctx) {
    if (!this.tick(ctx)) return;
    for (const a of this.agents) {
      _d.subVectors(ctx.ship, a.pos).setLength(Math.max(0, a.shipDist - 140) * 0.05).clampLength(0, 9);
      steer(a, _d.addScaledVector(wander(a, ctx.t, 3, _b), 1), 0.4, ctx.dt);
      const want = a.shipDist < 70 ? 0 : 0.55 + 0.45 * Math.sin(ctx.t * 0.3 + a.phase);
      a.fade += (want - a.fade) * ease(want ? 0.5 : 3, ctx.dt);
      if (a.shipDist < 70 && a.fade < 0.03 && Math.random() < 0.02) a.alive = false;
      this.drawGhost(a, ctx);
    }
  }

  drawGhost(a, ctx) {
    const d = ctx.draw, t = ctx.t + a.phase, k = a.fade, b = Math.sin(t * 0.9) * 0.08;
    _f.set(a.pos, _q.setFromAxisAngle(UP, t * 0.07), a.size);
    _f.part(d.rim, 0, 0, 0, 0, 0, 0, 1 + b, 0.75 - b, 1 + b, this.glow, 0.4 * k);
    _f.part(d.rim, 0, -0.1, 0, 0, 0, 0, 0.5, 0.45, 0.5, this.glow, 0.5 * k);
    for (let i = 1; i <= 3; i++) {
      const s = 0.62 - i * 0.12, x = Math.sin(t * 0.7 - i * 0.8) * 0.2 * i;
      _f.part(d.rim, x, -0.4 - i * 0.75, 0, 0, 0, 0, s, s * 1.6, s, this.glow, (0.32 - i * 0.06) * k);
    }
    for (let s = 0; s < 6; s++) this.streamer(d, t, s, k);
    d.glow.add(a.pos, a.size * 2, this.glow, 0.15 * k);
  }

  streamer(d, t, s, k) {
    const ang = (s / 6) * Math.PI * 2;
    _f.point(_a, Math.cos(ang) * 0.9, -0.2, Math.sin(ang) * 0.9);
    for (let j = 1; j <= 5; j++) {
      const sw = Math.sin(t * 0.8 - j * 0.7 + s) * 0.18 * j;
      _f.point(_b, Math.cos(ang) * (0.9 - j * 0.1) + sw, -0.2 - j * 0.8, Math.sin(ang) * (0.9 - j * 0.1));
      d.strand.add(_a, _b, this.glow, (0.8 - j * 0.12) * k);
      _a.copy(_b);
    }
  }
}
