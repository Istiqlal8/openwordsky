// Shared life for gas fauna: agents that spawn around the camera inside their depth band, get
// recycled when left behind, and react to the ship (curious ones circle, shy ones scatter).
import * as THREE from 'three';

const TAU = Math.PI * 2;
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _v = new THREE.Vector3();
export const rand = (a, b) => a + Math.random() * (b - a);
export const ease = (rate, dt) => 1 - Math.exp(-rate * dt);

export class Agent {
  constructor(size = 1) {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.quat = new THREE.Quaternion();
    Object.assign(this, { size, r: size, alive: false, yaw: 0, pitch: 0, bank: 0, phase: Math.random() * 100,
      home: Math.random() * TAU, mood: 0, shipDist: 1e9 });
  }
}

// Base for one species: band = [minY, maxY]; ring = [near, far] spawn distance around the camera.
export class Species {
  constructor(name, band, ring, spread = 250) {
    Object.assign(this, { name, band, ring, spread, agents: [], active: false, margin: 350 });
  }

  // Wakes / sleeps with depth, recycles lost agents. Returns false while out of band.
  tick(ctx) {
    const y = ctx.cam.y, [lo, hi] = this.band;
    this.active = y > lo - this.margin && y < hi + this.margin;
    if (!this.active) { for (const a of this.agents) a.alive = false; return false; }
    const far2 = this.ring[1] * this.ring[1] * 1.6;
    for (const a of this.agents) {
      if (!a.alive || a.pos.distanceToSquared(ctx.cam) > far2) this.respawn(a, ctx);
      a.shipDist = a.pos.distanceTo(ctx.ship);
    }
    return true;
  }

  // New spot on a ring around the camera, biased ahead of the ship.
  respawn(a, ctx) {
    const [near, far] = this.ring;
    const ahead = Math.atan2(ctx.vel.x, ctx.vel.z);
    const ang = ctx.vel.lengthSq() > 1 && Math.random() < 0.7 ? ahead + rand(-1.1, 1.1) : Math.random() * TAU;
    const r = a.alive ? rand(near + (far - near) * 0.5, far) : rand(near, far);
    const y = THREE.MathUtils.clamp(ctx.cam.y + rand(-this.spread, this.spread), this.band[0], this.band[1]);
    a.pos.set(ctx.cam.x + Math.sin(ang) * r, y, ctx.cam.z + Math.cos(ang) * r);
    a.home = Math.random() * TAU;
    a.vel.set(0, 0, 0);
    a.alive = true;
    this.spawned?.(a, ctx);
  }

  // Nearest living agent to p: { agent, d } (distance to its surface) or null.
  nearest(p) {
    let best = null;
    for (const a of this.agents) {
      if (!a.alive) continue;
      const d = Math.max(0, a.pos.distanceTo(p) - a.r);
      if (!best || d < best.d) best = { agent: a, d };
    }
    return best;
  }
}

// Desired velocity: slow wandering heading with a gentle vertical bob.
export function wander(a, t, speed, out) {
  const h = a.home + Math.sin(t * 0.05 + a.phase) * 1.4;
  return out.set(-Math.sin(h) * speed, Math.sin(t * 0.11 + a.phase) * speed * 0.08, -Math.cos(h) * speed);
}

// Desired velocity to circle a moving target at radius r (dir = +1 / -1), matching its drift.
export function circle(a, target, targetVel, r, speed, dir, out) {
  _v.subVectors(a.pos, target);
  _v.y *= 0.5;
  const d = Math.max(1, _v.length());
  _v.divideScalar(d);
  out.set(-_v.z * dir, 0, _v.x * dir).multiplyScalar(speed);
  out.addScaledVector(_v, (r - d) * 0.35);
  out.y += (target.y - a.pos.y) * 0.3;
  return out.addScaledVector(targetVel, 0.85);
}

// Desired velocity away from the ship (scaled by how close it is), or null when calm.
export function flee(a, ship, fear, speed, out) {
  if (a.shipDist > fear) return null;
  const k = 1 - a.shipDist / fear;
  return out.subVectors(a.pos, ship).normalize().multiplyScalar(speed * (0.4 + k));
}

export function steer(a, desired, rate, dt) {
  a.vel.lerp(desired, ease(rate, dt));
  a.pos.addScaledVector(a.vel, dt);
}

// Face along velocity (forward = -Z), banking into turns.
export function orient(a, dt, bankGain = 2.5) {
  const h = Math.hypot(a.vel.x, a.vel.z);
  if (h > 0.05) {
    let dy = Math.atan2(-a.vel.x, -a.vel.z) - a.yaw;
    dy -= TAU * Math.round(dy / TAU);
    a.yaw += dy * ease(2.2, dt);
    a.bank += (THREE.MathUtils.clamp(dy * bankGain, -0.9, 0.9) - a.bank) * ease(3, dt);
    a.pitch += (Math.atan2(a.vel.y, h) * 0.8 - a.pitch) * ease(2, dt);
  }
  a.quat.setFromEuler(_e.set(a.pitch, a.yaw, a.bank));
}
