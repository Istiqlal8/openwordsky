// Floaters: jellyfish / dandelion-seed hybrids drifting on the upper winds. A translucent bell,
// a crown of glowing seed filaments, a bright core and trailing threads. Shy: they puff away
// from the ship.
import * as THREE from 'three';
import { Agent, Species, wander, flee, steer } from './fauna-mind.js';
import { Frame } from './fauna-fields.js';

const THREADS = 6, KNOTS = 6;
const _f = new Frame(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
const _q = new THREE.Quaternion();

// Seed filament tips spread over the upper hemisphere (fibonacci spiral).
function crown(n) {
  return Array.from({ length: n }, (_, i) => {
    const y = 0.15 + 0.85 * (i / n), r = Math.sqrt(1 - y * y), a = i * 2.39996;
    return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  });
}

export class Floaters extends Species {
  constructor(theme) {
    super(theme.name('floater'), [-800, 220], [150, 1500], 260);
    const rng = theme.rng('floater');
    this.glow = theme.glow(rng, -0.04, 0.66);
    this.core = theme.glow(rng, 0.08, 0.75);
    this.tips = crown(12 + rng.int(8));
    this.reach = rng.range(1.4, 2.1);
    for (let i = 0; i < 22; i++) {
      const a = new Agent(rng.range(6, 16));
      a.r = a.size * 1.2;
      this.agents.push(a);
    }
  }

  update(ctx) {
    if (!this.tick(ctx)) return;
    for (const a of this.agents) {
      const want = flee(a, ctx.ship, 90, 22, _d) ?? wander(a, ctx.t, 3, _d);
      steer(a, want, 1.5, ctx.dt);
      this.drawFloater(a, ctx);
    }
  }

  drawFloater(a, ctx) {
    const t = ctx.t + a.phase, S = a.size, d = ctx.draw, p = Math.sin(t * 1.3);
    const scared = a.shipDist < 90 ? 1 : 0;
    _q.setFromAxisAngle(_b.set(0, 1, 0), t * 0.1);
    _f.set(a.pos, _q, S);
    _f.part(d.rim, 0, 0, 0, 0, 0, 0, 1 + p * 0.08, 0.55 - p * 0.1, 1 + p * 0.08, this.glow, 0.4);
    d.glow.add(a.pos, S * (1.4 + p * 0.2 + scared * 0.4), this.core, 0.6 + scared * 0.5);
    for (const tip of this.tips) {
      _f.point(_a, tip.x * 0.4, tip.y * 0.3, tip.z * 0.4);
      _f.point(_b, tip.x * this.reach, tip.y * this.reach * 0.9 + 0.2, tip.z * this.reach);
      d.strand.add(_a, _b, this.glow, 0.7);
      d.glow.add(_b, S * 0.25, this.core, 0.8 + 0.4 * Math.sin(t * 3 + tip.x * 5));
    }
    this.drawThreads(d, t);
  }

  drawThreads(d, t) {
    for (let s = 0; s < THREADS; s++) {
      const ang = (s / THREADS) * Math.PI * 2;
      _f.point(_a, Math.cos(ang) * 0.6, -0.1, Math.sin(ang) * 0.6);
      for (let k = 1; k <= KNOTS; k++) {
        const sway = Math.sin(t * 1.6 - k * 0.7 + s) * 0.12 * k;
        _f.point(_b, Math.cos(ang) * (0.6 - k * 0.05) + sway, -0.1 - k * 0.5, Math.sin(ang) * (0.6 - k * 0.05) + sway * 0.5);
        d.strand.add(_a, _b, this.glow, 0.8 - k * 0.1);
        _a.copy(_b);
      }
    }
  }
}
