// Abyss titans: colossal 500-1000 m silhouettes cruising the deep haze, barely visible, with
// slow glowing eye-spots and a faint ghostly outline. They keep their distance from the ship.
import * as THREE from 'three';
import { Agent, Species, wander, flee, steer, orient } from './fauna-mind.js';
import { Frame, tube } from './fauna-fields.js';

const BODY = 10, TSEGS = 7;
const _f = new Frame(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();

// Radius of body segment k (0 = head) in body units.
const girth = (k) => (k === 0 ? 0.1 : 0.085 * (1 - Math.pow(k / BODY, 1.4) * 0.8));

export class AbyssTitans extends Species {
  constructor(theme) {
    super(theme.name('titan'), [-3100, -1550], [1300, 2200], 450);
    this.margin = 250;
    const rng = theme.rng('titan');
    this.eye = theme.glow(rng, -0.03, 0.62);
    this.dots = theme.glow(rng, 0.1, 0.6);
    this.skin = theme.skin(rng, this.eye, 0.45);
    this.eyes = Array.from({ length: 2 + rng.int(3) }, (_, i) => ({ row: i >> 1, side: i % 2 ? 1 : -1, ph: rng.range(0, 9) }));
    this.tentacles = Array.from({ length: 6 + rng.int(5) }, () => rng.range(-0.07, 0.07));
    for (let i = 0; i < 2; i++) {
      const a = new Agent(rng.range(500, 1000));
      a.r = a.size * 0.12;
      this.agents.push(a);
    }
  }

  update(ctx) {
    if (!this.tick(ctx)) return;
    for (const a of this.agents) {
      steer(a, flee(a, ctx.ship, 800, 12, _d) ?? wander(a, ctx.t, 8, _d), 0.08, ctx.dt);
      orient(a, ctx.dt, 0.6);
      this.drawTitan(a, ctx);
    }
  }

  drawTitan(a, ctx) {
    const d = ctx.draw, t = ctx.t + a.phase;
    _f.set(a.pos, a.quat, a.size);
    for (let k = 0; k < BODY; k++) {
      const r = girth(k), z = -0.45 + k * 0.1;
      const x = Math.sin(t * 0.2 - k * 0.45) * 0.02, y = Math.sin(t * 0.3 - k * 0.5) * 0.015;
      _f.part(d.flesh, x, y, z, 0, 0, 0, r * 1.2, r, k === 0 ? 0.17 : 0.13, this.skin);
      _f.part(d.rim, x, y, z, 0, 0, 0, r * 1.3, r * 1.1, 0.14, this.eye, 0.035);
      if (k > 0) for (const s of [-1, 1]) d.glow.add(_f.point(_a, x + s * r * 1.3, y, z), a.size * 0.012, this.dots, 0.5);
    }
    this.drawFins(d, t);
    this.drawTentacles(d, t, a.size);
    this.drawEyes(d, t, a.size);
  }

  drawFins(d, t) {
    for (let k = 0; k < 3; k++) {
      const ang = Math.sin(t * 0.35 + k * 0.8) * 0.3, z = -0.25 + k * 0.2, w = 0.2 - k * 0.04;
      const cx = 0.07 + Math.cos(ang) * w, cy = Math.sin(ang) * w;
      _f.part(d.flesh, cx, cy, z, 0, 0, ang, w, 0.006, 0.06, this.skin);
      _f.part(d.flesh, -cx, cy, z, 0, 0, -ang, w, 0.006, 0.06, this.skin);
    }
  }

  // Long tentacles trailing from under the head.
  drawTentacles(d, t, L) {
    this.tentacles.forEach((x0, i) => {
      _f.point(_a, x0, -0.06, -0.42);
      for (let j = 1; j <= TSEGS; j++) {
        const sway = Math.sin(t * 0.25 - j * 0.5 + i) * 0.012 * j;
        _f.point(_b, x0 * (1 + j * 0.2) + sway, -0.06 - j * 0.028, -0.42 + j * 0.09);
        tube(d.tube, _a, _b, L * 0.007 * (1.1 - j / TSEGS * 0.8), this.skin);
        _a.copy(_b);
      }
      d.glow.add(_a, L * 0.015, this.dots, 0.6);
    });
  }

  // Slow blinking eye-spots down the flanks of the head.
  drawEyes(d, t, L) {
    for (const e of this.eyes) {
      const open = THREE.MathUtils.smoothstep(Math.sin(t * 0.3 + e.ph), -0.4, 0.6);
      _f.point(_a, e.side * 0.13, 0.03 - e.row * 0.035, -0.52 + e.row * 0.05);
      d.glow.add(_a, L * 0.05, this.eye, 0.4 + open * 2.4);
    }
  }
}
