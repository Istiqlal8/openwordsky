// Random temporary planet events (meteor shower, migration, mass bloom): at most one at a time,
// a few minutes apart. World addon (see src/gameplay/world-addons.js).
// Debug: surfaceMode.gameplay.addons.find((a) => a.force).force('meteor' | 'migrasi' | 'mekar').
import { MeteorShower } from './meteor-shower.js';
import { Migration } from './migration.js';
import { Bloom } from './bloom.js';

const EVENTS = { meteor: MeteorShower, migrasi: Migration, mekar: Bloom };
const FIRST = [90, 180];   // seconds after landing before the first event may start
const GAP = [180, 300];    // quiet time between events
const RETRY = 30;          // an event that cannot run here (no herd) tries again soon

const between = ([a, b]) => a + Math.random() * (b - a);

export class PlanetEvents {
  constructor(ctx) {
    this.ctx = ctx;
    this.active = null;
    this.left = 0;
    this.wait = between(FIRST);
  }

  update(dt, alive) {
    if (this.active) return this.tick(dt, alive);
    this.wait -= dt;
    const s = this.ctx.surface;
    if (this.wait > 0 || !alive || s.flying || this.ctx.planet.gas) return;
    const ids = Object.keys(EVENTS);
    if (!this.force(ids[Math.floor(Math.random() * ids.length)])) this.wait = RETRY;
  }

  tick(dt, alive) {
    this.left -= dt;
    this.active.update(dt, alive);
    if (this.left <= 0 || this.active.done) this.end();
  }

  // Starts an event now (ends the current one). -> true when it started.
  force(id) {
    const Ev = EVENTS[id];
    if (!Ev) return false;
    if (this.active) this.end();
    const ev = new Ev(this.ctx);
    if (ev.failed) { ev.dispose(); return false; }
    this.active = ev;
    this.left = ev.duration;
    this.ctx.player.emit('notice', { text: ev.title });
    return true;
  }

  end() {
    const ev = this.active;
    if (!ev) return;
    this.active = null;
    this.wait = between(GAP);
    ev.dispose();
    this.ctx.player.emit('notice', { text: ev.endText });
    if (ev.participated) this.ctx.player.emit('act', { type: 'event', id: ev.id });
  }

  get current() { return this.active?.id ?? null; }

  dispose() {
    this.active?.dispose();
    this.active = null;
  }
}
