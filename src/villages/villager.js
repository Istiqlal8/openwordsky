// One settlement resident: walks between doors via the square, works a field, sits, fishes, minds a stall or plays.
import { groundY } from '../base/site.js';
import { Person } from './person.js';

const SPEED = { walk: 1.5, play: 2.6, work: 1 };
const GREET_RANGE = 6;
const FIXED = new Set(['sit', 'fish', 'stand']); // stay on their anchor

export class Villager {
  // info: { name, role, kid, mode, anchor: {x, z, y?, yaw?}, look }
  constructor(mat, info, seed) {
    Object.assign(this, info);
    this.seed = seed;
    this.person = new Person(mat, info.look, info.kid ? 0.62 : 1);
    this.feet = { x: info.anchor.x, y: info.anchor.y ?? 0, z: info.anchor.z };
    this.yaw = info.anchor.yaw ?? seed % 6;
    this.target = null;
    this.pause = seed % 4;
    this.t = seed % 10;
    this.waveT = 0;
    this.greets = 0;
    this.line = null;
    this.gifted = false;
  }

  get group() { return this.person.group; }

  // ctx: { h, planet, hub, spots, rand }; player: { x, z }.
  update(dt, ctx, player) {
    this.t += dt;
    const dp = Math.hypot(player.x - this.feet.x, player.z - this.feet.z);
    const seated = FIXED.has(this.mode);
    let pose = this.mode === 'sit' ? 'sit' : this.mode === 'fish' ? 'fish' : 'idle';
    if (dp < GREET_RANGE && this.mode !== 'sit' && this.mode !== 'fish') pose = this.greet(dt, player);
    else if (!seated) pose = this.roam(dt, ctx);
    if (dp >= GREET_RANGE) this.waveT = 0;
    if (!seated || this.feet.y === 0) this.feet.y = groundY(ctx.h, ctx.planet, this.feet.x, this.feet.z) + 0.03;
    this.person.pose(pose, this.t);
    this.group.position.set(this.feet.x, this.feet.y, this.feet.z);
    this.group.rotation.y = this.yaw;
  }

  // Face the player and wave for the first moments of a meeting.
  greet(dt, player) {
    this.turnTo(player.x - this.feet.x, player.z - this.feet.z, dt * 4);
    this.waveT += dt;
    return this.waveT < 1.8 ? 'wave' : 'idle';
  }

  roam(dt, ctx) {
    if (this.pause > 0) {
      this.pause -= dt;
      return this.mode === 'work' && this.atWork ? 'work' : 'idle';
    }
    if (!this.target) this.pick(ctx);
    if (this.step(dt)) { this.arrive(ctx); return 'idle'; }
    return 'walk';
  }

  // Next destination: doors through the square (walkers), near the anchor (workers), around the square (kids).
  pick(ctx) {
    const r = ctx.rand, a = r() * Math.PI * 2;
    if (this.mode === 'work') {
      const d = r() * 3;
      this.target = { x: this.anchor.x + Math.cos(a) * d, z: this.anchor.z + Math.sin(a) * d };
    } else if (this.mode === 'play') {
      const d = 3 + r() * 7;
      this.target = { x: ctx.hub.x + Math.cos(a) * d, z: ctx.hub.z + Math.sin(a) * d };
    } else if (this.viaHub) {
      this.target = ctx.spots[Math.floor(r() * ctx.spots.length)];
      this.viaHub = false;
    } else {
      const d = r() * 4;
      this.target = { x: ctx.hub.x + Math.cos(a) * d, z: ctx.hub.z + Math.sin(a) * d };
      this.viaHub = true;
    }
  }

  arrive(ctx) {
    this.target = null;
    const r = ctx.rand();
    this.atWork = this.mode === 'work';
    this.pause = this.mode === 'play' ? r * 1.5 : this.mode === 'work' ? 5 + r * 8 : 2 + r * 5;
  }

  // Walk toward the target; true on arrival.
  step(dt) {
    const dx = this.target.x - this.feet.x, dz = this.target.z - this.feet.z, d = Math.hypot(dx, dz);
    if (d < 0.3) return true;
    this.turnTo(dx, dz, dt * 5);
    const s = Math.min(d, (SPEED[this.mode] ?? SPEED.walk) * dt);
    this.feet.x += (dx / d) * s;
    this.feet.z += (dz / d) * s;
    return false;
  }

  turnTo(dx, dz, k) {
    const want = Math.atan2(-dx, -dz), diff = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw));
    this.yaw += diff * Math.min(1, k);
  }

  dispose() { this.person.dispose(); }
}
