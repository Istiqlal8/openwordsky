// Sky whales: balloon-bodied leviathans of the upper clouds. Pods drift slowly, gas sacs on
// their backs pulse, tendrils trail beneath, and they send out a low glow pulse (more often
// when the ship comes close, which also makes them turn to look).
import * as THREE from 'three';
import { Agent, Species, wander, circle, steer, orient, rand } from './fauna-mind.js';
import { Frame, tube } from './fauna-fields.js';

const SEGS = 5;
const ZERO = new THREE.Vector3();
const _f = new Frame(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();

function podMembers(rng, n) {
  return Array.from({ length: n }, (_, i) => ({
    size: rng.range(55, 105) * (i === 0 ? 1.2 : 1), phase: rng.range(0, 50), world: new THREE.Vector3(),
    off: new THREE.Vector3(rng.range(-1, 1) * 1.4, rng.range(-0.5, 0.5), i * 1.25 + rng.range(0, 0.4)),
  }));
}

export class SkyWhales extends Species {
  constructor(theme) {
    super(theme.name('whale'), [-600, 320], [600, 2300], 200);
    const rng = theme.rng('whale');
    this.glow = theme.glow(rng, 0, 0.6);
    this.skin = theme.skin(rng, this.glow);
    this.belly = theme.belly.clone().multiplyScalar(0.75);
    this.eye = theme.glow(rng, 0.1, 0.72);
    this.sacs = 2 + rng.int(3);
    this.tendrils = Array.from({ length: 5 + rng.int(5) }, () => [rng.range(-0.2, 0.2), rng.range(-0.3, 0.6)]);
    for (let p = 0; p < 3; p++) {
      const a = new Agent(1);
      a.members = podMembers(rng, 2 + rng.int(3));
      a.pulse = 0;
      a.pulseTimer = rng.range(1, 6);
      this.agents.push(a);
    }
  }

  update(ctx) {
    if (!this.tick(ctx)) return;
    for (const a of this.agents) {
      const want = a.shipDist < 800 ? circle(a, ctx.ship, ZERO, 380, 11, 1, _d) : wander(a, ctx.t, 9, _d);
      steer(a, want, 0.25, ctx.dt);
      orient(a, ctx.dt, 1.2);
      this.pulseTick(a, ctx.dt);
      for (const m of a.members) this.drawWhale(a, m, ctx);
    }
  }

  // The low glow pulse: a slow flash every few seconds, quicker when the ship is close.
  pulseTick(a, dt) {
    a.pulse *= Math.exp(-dt * 1.2);
    a.pulseTimer -= dt;
    if (a.pulseTimer > 0) return;
    a.pulse = 1;
    a.pulseTimer = a.shipDist < 600 ? rand(2.5, 4) : rand(6, 11);
  }

  drawWhale(a, m, ctx) {
    const t = ctx.t + m.phase, d = ctx.draw, L = m.size;
    m.world.copy(m.off).multiplyScalar(L).applyQuaternion(a.quat).add(a.pos);
    m.world.y += Math.sin(t * 0.25) * 6;
    _f.set(m.world, a.quat, L);
    _f.part(d.flesh, 0, 0, 0, 0, 0, 0, 0.34, 0.3, 1, this.skin);
    _f.part(d.flesh, 0, -0.1, -0.3, 0, 0, 0, 0.27, 0.2, 0.62, this.belly);
    this.drawFins(d, Math.sin(t * 0.7) * 0.35 - 0.1, t);
    this.drawSacs(d, t, a.pulse, L);
    this.drawTendrils(d, t, L);
    this.drawLights(d, a.pulse, L);
  }

  // Pectoral fins pivot at the body; flukes wave up and down.
  drawFins(d, ang, t) {
    const half = 0.3, cx = 0.24 + Math.cos(ang) * half, cy = -0.08 + Math.sin(ang) * half;
    _f.part(d.flesh, cx, cy, -0.2, 0, 0.2, ang, half, 0.022, 0.17, this.skin);
    _f.part(d.flesh, -cx, cy, -0.2, 0, -0.2, -ang, half, 0.022, 0.17, this.skin);
    _f.part(d.flesh, 0, 0.02, 1.02, Math.sin(t * 0.7 + 1.2) * 0.35, 0, 0, 0.4, 0.02, 0.13, this.skin);
  }

  drawSacs(d, t, pulse, L) {
    for (let i = 0; i < this.sacs; i++) {
      const z = -0.45 + (i / Math.max(1, this.sacs - 1)) * 0.8, s = 1 + Math.sin(t * 1.4 + i * 1.7) * 0.1;
      _f.part(d.rim, 0, 0.3 + (i % 2) * 0.04, z, 0, 0, 0, 0.17 * s, 0.22 * s, 0.19 * s, this.glow, 0.45 + pulse * 0.9);
      d.glow.add(_f.point(_a, 0, 0.3, z), L * 0.22, this.glow, 0.1 + pulse * 0.45);
    }
  }

  // Tendrils hang from the belly and sway, trailing a little behind.
  drawTendrils(d, t, L) {
    this.tendrils.forEach(([x, z], i) => {
      _f.point(_a, x, -0.24, z);
      for (let j = 1; j <= SEGS; j++) {
        const sway = Math.sin(t * 0.9 - j * 0.6 + i) * 0.05 * j;
        _f.point(_b, x + sway, -0.24 - j * 0.2, z + j * 0.1 + sway * 0.4);
        tube(d.tube, _a, _b, L * 0.011 * (1.2 - j / SEGS), this.skin);
        _a.copy(_b);
      }
      d.glow.add(_a, L * 0.08, this.glow, 0.8);
    });
  }

  drawLights(d, pulse, L) {
    for (let i = 0; i < 5; i++) {
      for (const s of [-1, 1]) d.glow.add(_f.point(_a, s * 0.31, 0.02, -0.55 + i * 0.26), L * 0.06, this.glow, 0.6 + pulse);
    }
    for (const s of [-1, 1]) d.glow.add(_f.point(_a, s * 0.21, 0.03, -0.86), L * 0.08, this.eye, 1.2);
    if (pulse > 0.02) d.glow.add(_f.point(_a, 0, 0.1, 0), L * 3.2, this.glow, pulse * 0.45);
  }

  nearest(p) {
    let best = null;
    for (const a of this.agents) {
      if (!a.alive) continue;
      for (const m of a.members) {
        const d = Math.max(0, m.world.distanceTo(p) - m.size * 0.7);
        if (!best || d < best.d) best = { agent: a, d };
      }
    }
    return best;
  }
}
