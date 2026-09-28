// One settlement resident: walks between doors via the square, works a field, sits, fishes, minds a
// stall, plays tag, chats, patrols, rides or herds (life-sim/activities.js). Animals may attack:
// armed residents shoot back, the others run indoors; knocked-down residents get back up later.
import { groundY } from '../base/site.js';
import { Person } from './person.js';
import { Vitals } from '../life-sim/vitals.js';
import { ACTIVITIES, defend } from '../life-sim/activities.js';

const SPEED = { walk: 1.5, play: 2.6, work: 1, guard: 1.3, chat: 1.4, scan: 1.1, mine: 1, herd: 1.2, ride: 1.5 };
const GREET_RANGE = 6;
const ACTIVE_RANGE = 170; // animals only go for residents this close to the player
const FIXED = new Set(['sit', 'fish', 'stand']); // stay on their anchor
const BOLT = { colonist: 0x9cff6a, miner: 0xff7a3a, scientist: 0x5ff4ff };

export class Villager {
  // info: { name, role, kid, mode, anchor: {x, z, y?, yaw?}, look, armed }
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
    this.lift = 0;     // extra height (riding)
    this.vitals = new Vitals(this, { armed: info.armed, faction: info.role, radius: info.kid ? 0.3 : 0.45,
      maxHp: info.kid ? 60 : 100, color: BOLT[info.role] ?? 0xffa040, beam: info.role === 'miner' });
    this.person.holdGun(Boolean(info.armed) && info.mode === 'guard');
  }

  get group() { return this.person.group; }
  get fixed() { return FIXED.has(this.mode); }

  // ctx: { h, planet, hub, spots, doors, rand, life }; player: { x, z }.
  update(dt, ctx, player) {
    this.t += dt;
    const dp = Math.hypot(player.x - this.feet.x, player.z - this.feet.z);
    this.vitals.active = dp < ACTIVE_RANGE && !this.vitals.hidden;
    const alarm = this.vitals.update(dt);
    if (!alarm) { this.group.visible = true; this.refuge = null; }
    const pose = alarm ? defend(this, alarm, dt, ctx) : this.routine(dt, ctx, player, dp);
    if (dp >= GREET_RANGE) this.waveT = 0;
    if (!this.riding && (!this.fixed || this.feet.y === 0 || alarm)) this.feet.y = groundY(ctx.h, ctx.planet, this.feet.x, this.feet.z) + 0.03;
    this.person.pose(pose, this.t);
    this.group.position.set(this.feet.x, this.feet.y + this.lift, this.feet.z);
    this.group.rotation.y = this.yaw;
    this.group.rotation.x = this.vitals.flinch > 0 ? -0.25 * this.vitals.flinch / 0.3 : 0;
  }

  routine(dt, ctx, player, dp) {
    this.person.holdGun(Boolean(this.armed) && this.mode === 'guard');
    const talkable = dp < GREET_RANGE && this.mode !== 'sit' && this.mode !== 'fish' && !this.riding;
    if (talkable) return this.greet(dt, player);
    const act = ACTIVITIES[this.mode];
    if (act) return act(this, dt, ctx);
    if (this.fixed) return this.mode === 'sit' ? 'sit' : this.mode === 'fish' ? 'fish' : 'idle';
    return this.roam(dt, ctx);
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
      return this.atWork ? (this.mode === 'work' ? 'work' : ACTIVE_POSE[this.mode] ?? 'idle') : 'idle';
    }
    if (!this.target) this.pick(ctx);
    if (this.step(dt)) { this.arrive(ctx); return 'idle'; }
    return 'walk';
  }

  // Next destination: doors through the square (walkers), near the anchor (workers), around the square (kids).
  pick(ctx) {
    const r = ctx.rand, a = r() * Math.PI * 2;
    if (this.mode === 'work' || this.mode === 'mine' || this.mode === 'scan') {
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
    const r = ctx.rand(), busy = this.mode === 'work' || this.mode === 'mine' || this.mode === 'scan';
    this.atWork = busy;
    this.pause = this.mode === 'play' ? r * 1.5 : busy ? 5 + r * 8 : 2 + r * 5;
  }

  // Walk toward the target; true on arrival.
  step(dt, speed = SPEED[this.mode] ?? SPEED.walk) {
    return this.moveTo(this.target.x, this.target.z, speed, dt, 0.3);
  }

  // Walk toward (x, z) at `speed`; true once within `stop` m.
  moveTo(x, z, speed, dt, stop = 0.3) {
    const dx = x - this.feet.x, dz = z - this.feet.z, d = Math.hypot(dx, dz);
    if (d < stop) return true;
    this.turnTo(dx, dz, dt * 5);
    const s = Math.min(d, speed * dt);
    this.feet.x += (dx / d) * s;
    this.feet.z += (dz / d) * s;
    return false;
  }

  turnTo(dx, dz, k) {
    const want = Math.atan2(-dx, -dz), diff = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw));
    this.yaw += diff * Math.min(1, k);
  }

  dispose() {
    this.vitals.dispose();
    this.person.dispose();
  }
}

const ACTIVE_POSE = { mine: 'aim', scan: 'scan' };
