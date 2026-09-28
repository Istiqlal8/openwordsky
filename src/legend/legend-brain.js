// Legendary monster behaviour: roam its lair, hunt the player, charge / stomp attacks,
// flee when badly hurt and come back later. Moves beast.ref.pos; the beast places the model.
import { Shockwave } from './legend-wave.js';

const AGGRO = 70;        // starts hunting a player this close
const GIVE_UP = 230;     // loses interest beyond this distance
const WALK = 3, HUNT = 7.5, DASH = 26, FLEE = 16;
const WINDUP = 1.1, DASH_TIME = 1.5;
const FLEE_AT = 0.35;    // flees once when hp drops below this fraction
const BITE_DMG = 12, CHARGE_DMG = 26, STOMP_DMG = 20;

export class LegendBrain {
  constructor(beast, ctx) {
    this.b = beast;
    this.ctx = ctx;
    this.state = 'roam';
    this.t = 0;
    this.atkT = 3;
    this.biteT = 0;
    this.goal = { x: beast.ref.pos.x, z: beast.ref.pos.z };
    this.home = { ...this.goal };
    this.dir = { x: 1, z: 0 };
    this.kind = 'charge';
    this.hitDone = false;
    this.fled = false;
    this.provoked = false;
    this.shake = 0;
    this.moving = 0;
    this.wave = new Shockwave(ctx.surface.scene, beast.def.glow);
  }

  get feet() { return this.ctx.surface.feet; }

  distance() {
    const p = this.b.ref.pos, f = this.feet;
    return Math.hypot(f.x - p.x, f.z - p.z);
  }

  // Player that can be attacked: alive, on foot and not flying.
  target() {
    const s = this.ctx.surface;
    return !this.ctx.player.dead && !s.flying && this.b.calm <= 0;
  }

  grounded() {
    const s = this.ctx.surface, f = this.feet;
    return !s.flying && f.y - s.floorAt(f.x, f.z) < 1.2;
  }

  provoke() {
    this.provoked = true;
    if (this.state === 'roam') this.enter('hunt');
  }

  enter(state, t = 0) {
    this.state = state;
    this.t = t;
    this.b.onState?.(state);
  }

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 2);
    if (this.wave.update(dt, this.feet, this.grounded())) this.hurt(STOMP_DMG, 'Gelombang kejut');
    this.t -= dt;
    const d = this.distance();
    if (this.b.ref.hp < this.b.def.hp * FLEE_AT && !this.fled && this.state !== 'flee') this.startFlee();
    this[this.state](dt, d);
    return this.moving;
  }

  roam(dt, d) {
    if (this.target() && (d < AGGRO || this.provoked)) { this.enter('hunt'); this.b.roar(); return; }
    if (this.t <= 0) this.pickWander();
    this.walkTo(this.goal, WALK, dt, 2);
  }

  pickWander() {
    this.t = 6 + Math.random() * 6;
    const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 30;
    this.goal = { x: this.home.x + Math.cos(a) * r, z: this.home.z + Math.sin(a) * r };
  }

  hunt(dt, d) {
    if (!this.target() || d > GIVE_UP) { this.provoked = false; this.home = { ...this.b.ref.pos }; this.enter('roam'); return; }
    this.atkT -= dt;
    this.biteT -= dt;
    const reach = this.b.radius + 2.5;
    if (d < reach && this.biteT <= 0) { this.biteT = 1.4; this.hurt(BITE_DMG, `Digigit ${this.b.def.name}`); }
    if (this.atkT <= 0) { this.windup(d); return; }
    this.walkTo(this.feet, d < reach ? 0 : HUNT, dt, reach - 0.5);
  }

  windup(d) {
    this.kind = d > 22 || Math.random() < 0.45 ? 'charge' : 'stomp';
    this.enter('rear', WINDUP);
    this.b.roar();
  }

  rear(dt) {
    this.moving = 0;
    this.face(this.feet, dt * 4);
    if (this.t > 0) return;
    if (this.kind === 'stomp') { this.stomp(); return; }
    const p = this.b.ref.pos, f = this.feet, len = Math.hypot(f.x - p.x, f.z - p.z) || 1;
    this.dir = { x: (f.x - p.x) / len, z: (f.z - p.z) / len };
    this.hitDone = false;
    this.enter('charge', DASH_TIME);
  }

  stomp() {
    const p = this.b.ref.pos;
    this.wave.start(p.x, this.ctx.surface.floorAt(p.x, p.z), p.z, this.b.radius);
    this.shake = 1;
    this.b.stomped();
    this.atkT = 4 + Math.random() * 2;
    this.enter('hunt');
  }

  charge(dt, d) {
    const p = this.b.ref.pos;
    p.x += this.dir.x * DASH * dt;
    p.z += this.dir.z * DASH * dt;
    this.moving = 2;
    this.face({ x: p.x + this.dir.x, z: p.z + this.dir.z }, dt * 10);
    if (!this.hitDone && d < this.b.radius + 2 && this.grounded()) {
      this.hitDone = true;
      this.hurt(CHARGE_DMG, `Diseruduk ${this.b.def.name}`);
      this.feet.x += this.dir.x * 5;
      this.feet.z += this.dir.z * 5;
      this.shake = 0.8;
    }
    if (this.t <= 0) { this.atkT = 4 + Math.random() * 3; this.enter('hunt'); }
  }

  startFlee() {
    this.fled = true;
    const p = this.b.ref.pos, f = this.feet, len = Math.hypot(p.x - f.x, p.z - f.z) || 1;
    this.dir = { x: (p.x - f.x) / len, z: (p.z - f.z) / len };
    this.enter('flee', 9);
    this.b.fleeing(true);
  }

  flee(dt) {
    const p = this.b.ref.pos;
    this.walkTo({ x: p.x + this.dir.x * 20, z: p.z + this.dir.z * 20 }, FLEE, dt, 0);
    if (this.t > 0) return;
    this.home = { x: p.x, z: p.z };
    this.enter('lurk', 18);
  }

  // Hides and licks its wounds, then comes back for the player.
  lurk(dt) {
    this.moving = 0;
    this.b.ref.hp = Math.min(this.b.def.hp * 0.6, this.b.ref.hp + dt * 12);
    if (this.t > 0) return;
    this.b.fleeing(false);
    this.provoked = true;
    this.atkT = 2;
    this.enter('hunt');
  }

  dead() { this.moving = 0; }

  hurt(amount, cause) {
    if (this.target()) this.ctx.player.damageSuit(amount, cause);
  }

  walkTo(goal, speed, dt, stop) {
    const p = this.b.ref.pos, dx = goal.x - p.x, dz = goal.z - p.z, len = Math.hypot(dx, dz);
    if (len <= stop || speed <= 0) { this.moving = 0; if (len > 0.01) this.face(goal, dt * 3); return; }
    const step = Math.min(len - stop, speed * dt);
    p.x += (dx / len) * step;
    p.z += (dz / len) * step;
    this.moving = speed > HUNT ? 2 : 1;
    this.face(goal, dt * 3);
  }

  // Turns the model toward a point (creature forward is +x).
  face(goal, k) {
    const p = this.b.ref.pos, r = this.b.root.rotation;
    const yaw = Math.atan2(-(goal.z - p.z), goal.x - p.x);
    r.y += Math.atan2(Math.sin(yaw - r.y), Math.cos(yaw - r.y)) * Math.min(1, k);
  }

  dispose() { this.wave.dispose(); }
}
