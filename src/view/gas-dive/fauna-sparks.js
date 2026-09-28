// Sparks: swarms of tiny luminous motes in the mid layers. Each mote swirls round its swarm's
// heart; fly through and they burst away from the ship, then drift back.
import * as THREE from 'three';
import { Agent, Species, wander, steer } from './fauna-mind.js';

const PER = 170, SCARE = 75;
const _d = new THREE.Vector3(), _w = new THREE.Vector3();

function motes(rng) {
  const home = new Float32Array(PER * 3), off = new Float32Array(PER * 3), vel = new Float32Array(PER * 3);
  for (let i = 0; i < PER * 3; i += 3) {
    _d.set(rng.range(-1, 1), rng.range(-0.6, 0.6), rng.range(-1, 1)).multiplyScalar(Math.cbrt(rng.next()));
    home[i] = off[i] = _d.x; home[i + 1] = off[i + 1] = _d.y; home[i + 2] = off[i + 2] = _d.z;
  }
  return { home, off, vel };
}

export class Sparks extends Species {
  constructor(theme) {
    super(theme.name('spark'), [-1900, -380], [150, 1400], 260);
    const rng = theme.rng('spark');
    this.colors = [theme.glow(rng, 0.03, 0.7), theme.glow(rng, 0.12, 0.72), new THREE.Color(1, 0.95, 0.85)];
    for (let i = 0; i < 3; i++) {
      const a = new Agent(rng.range(35, 70));
      a.m = motes(rng);
      this.agents.push(a);
    }
  }

  spawned(a) {
    const { home, off, vel } = a.m;
    off.set(home);
    vel.fill(0);
    for (let i = 0; i < off.length; i++) off[i] *= a.size;
  }

  update(ctx) {
    if (!this.tick(ctx)) return;
    for (const a of this.agents) {
      steer(a, wander(a, ctx.t, 5, _d), 0.4, ctx.dt);
      this.swirl(a, ctx);
    }
  }

  // Spring each mote toward its (rotating) home spot, push it away from a close ship.
  swirl(a, ctx) {
    const { home, off, vel } = a.m, dt = ctx.dt, near = a.shipDist < a.size + SCARE;
    const ang = ctx.t * 0.35 + a.phase, c = Math.cos(ang), s = Math.sin(ang), damp = Math.exp(-1.6 * dt);
    for (let i = 0, j = 0; i < off.length; i += 3, j++) {
      const hx = (home[i] * c - home[i + 2] * s) * a.size, hz = (home[i] * s + home[i + 2] * c) * a.size;
      vel[i] = (vel[i] + (hx - off[i]) * 1.4 * dt) * damp;
      vel[i + 1] = (vel[i + 1] + (home[i + 1] * a.size - off[i + 1]) * 1.4 * dt) * damp;
      vel[i + 2] = (vel[i + 2] + (hz - off[i + 2]) * 1.4 * dt) * damp;
      _w.set(a.pos.x + off[i], a.pos.y + off[i + 1], a.pos.z + off[i + 2]);
      if (near) this.scatter(_w, ctx.ship, vel, i, dt);
      off[i] += vel[i] * dt; off[i + 1] += vel[i + 1] * dt; off[i + 2] += vel[i + 2] * dt;
      const tw = 0.6 + 0.4 * Math.sin(ctx.t * 7 + j * 1.7);
      ctx.draw.glow.add(_w, 1.6 + (j % 5) * 0.35, this.colors[j % 3], tw * 1.6);
    }
  }

  scatter(p, ship, vel, i, dt) {
    _d.subVectors(p, ship);
    const dist = _d.length();
    if (dist > SCARE || dist < 0.01) return;
    _d.multiplyScalar(((1 - dist / SCARE) * 1400 * dt) / dist);
    vel[i] += _d.x; vel[i + 1] += _d.y; vel[i + 2] += _d.z;
  }
}
