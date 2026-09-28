// Meta addon (src/game/addons.js): "Bintang Mati" — a star that actually dies.
//
// A rare, deterministic subset of systems is fated (dead-registry.js). Every so often one of
// them goes: if the player is flying there it becomes the set piece in nova-run.js, otherwise it
// collapses off-screen and the galaxy map picks up a new grave. Either way the system is dead
// for good — remnant.js dims the star, scorch.js burns its planets on every later visit, and
// log.s.deadstar remembers which ones.
import { allSystems } from '../gen/galaxy.js';
import { resolveSpace } from '../raid/raid-link.js';
import { DeadStarState, WARN, BLAST } from './deadstar-state.js';
import { setDeadSystems, isDoomed, isFated, HOME_SYSTEM } from './dead-registry.js';
import { dimAll, dimSystem, dimLiveStar } from './remnant.js';
import { NovaRun } from './nova-run.js';

const SALVAGE_REACH = 5;   // multiples of the remnant's radius you must close to, to harvest it
const CRUST = 'Debu Bintang';

export class DeadStarAddon {
  constructor(w) {
    this.w = w;
    this.state = new DeadStarState(w.log.s, w.save.galaxySeed);
    setDeadSystems(this.state.dead);
    dimAll(w.save.galaxySeed, this.state.dead);
    this.run = null;
    this.saw = false;
    this.last = performance.now();
    this.expose();
  }

  get app() { return this.w.app ?? globalThis.__game?.app ?? null; }
  get here() { return this.app?.game?.system ?? null; }

  expose() {
    globalThis.__deadstar = {
      kill: (i) => this.force(i),
      list: () => [...this.state.dead],
      isDead: (i) => this.state.isDead(i),
      event: () => this.state.ev,
      skip: (s) => this.state.fastForward(s),
      fated: (i) => isFated(this.w.save.galaxySeed, allSystems(this.w.save.galaxySeed)[i ?? this.here?.index]),
    };
  }

  update() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.state.tick(dt * 1000);
    if (this.state.due()) this.fire();
    if (this.state.ev) this.runEvent(dt);
    else this.salvage();
  }

  // --- schedule -------------------------------------------------------------

  // The star under the player's nose gets the set piece; otherwise the nearest fated one dies
  // quietly and shows up on the map as a grave they can go and read.
  fire() {
    const here = this.here;
    if (here && isDoomed(this.w.save.galaxySeed, here)) { this.begin(here); return; }
    const target = this.nearestDoomed(here);
    if (!target) { this.state.reschedule(); return; }
    this.kill(target, false);
    this.state.reschedule();
  }

  nearestDoomed(here) {
    const seed = this.w.save.galaxySeed;
    let best = null, bestD = Infinity;
    for (const s of allSystems(seed)) {
      if (!isDoomed(seed, s) || s.index === here?.index) continue;
      const d = here ? dist2(s, here) : s.index;
      if (d < bestD) { best = s; bestD = d; }
    }
    return best;
  }

  begin(system) {
    this.state.begin(system);
    this.saw = false;
    this.w.hud.toast(`Peringatan: bintang ${system.name} kehilangan tekanan inti`);
    this.w.player.emit('act', { type: 'deadstar', stage: 'warn', system: system.name });
    this.w.log.version++;
  }

  // --- the running nova -----------------------------------------------------

  runEvent(dt) {
    const ev = this.state.ev;
    const t = this.state.elapsed();
    if (t >= WARN + BLAST) { this.finish(ev); return; }
    const app = this.app;
    const present = app?.game?.mode === 'space' && app.space?.system?.index === ev.sys;
    if (!present) { this.drop(); return; }
    this.saw = true;   // stays true after a warp out: running away still counts as surviving it
    if (!this.run) this.run = new NovaRun(this.w, ev);
    this.run.update(dt, t, this.state.warnRamp());
  }

  finish(ev) {
    this.drop();
    this.kill({ index: ev.sys, name: ev.name }, Boolean(this.saw));
    this.state.reschedule();
  }

  drop() {
    this.run?.dispose();
    this.run = null;
  }

  // --- permanence -----------------------------------------------------------

  // Order matters: the live star is found by its old size, so dim the view before the data.
  kill(system, witnessed) {
    const seed = this.w.save.galaxySeed;
    if (!this.state.markDead(system.index, system.name)) return;
    const space = resolveSpace()?.space ?? this.app?.space ?? null;
    if (witnessed && space?.system?.index === system.index) dimLiveStar(space);
    dimSystem(seed, system.index);
    setDeadSystems(this.state.dead);
    this.w.hud.toast(witnessed
      ? `Sistem ${system.name} mati — kau selamat dari novanya`
      : `Sinyal nova: ${system.name} padam selamanya — tandai di peta (M)`);
    this.w.player.emit('act', { type: 'deadstar', stage: 'dead', system: system.name });
    this.award(system.name, witnessed);
    this.w.log.version++;
  }

  award(name, witnessed) {
    this.w.log.award({ kind: 'deadstar', title: witnessed ? `Selamat dari nova ${name}` : `Nova tercatat: ${name}`,
      goal: { type: 'deadstar', n: 1 }, progress: 1,
      reward: { nanit: witnessed ? 600 : 120, xp: witnessed ? 140 : 30,
        items: witnessed ? [[CRUST, 3]] : [] } });
  }

  // --- what a corpse is worth ----------------------------------------------

  // Close on the remnant itself and the collapsed core is yours, once per dead system. It is the
  // one thing a living system cannot give you, and the crust down on its planets is the other.
  salvage() {
    const app = this.app;
    const sys = app?.game?.mode === 'space' ? app.space?.system : null;
    if (!sys || !this.state.isDead(sys.index) || this.state.isSalvaged(sys.index)) return;
    const ship = app.space.ship;
    if (!ship || ship.position.length() > sys.star.size * SALVAGE_REACH) return;
    this.state.markSalvaged(sys.index);
    this.w.sfx.discover?.();
    this.w.hud.toast(`Inti ${sys.name} dipanen — sisa nova masuk palka`);
    this.w.log.award({ kind: 'deadstar', title: `Panen sisa nova · ${sys.name}`,
      goal: { type: 'deadstar', n: 1 }, progress: 1,
      reward: { nanit: 260, xp: 60, items: [[CRUST, 2], ['Uranium', 2]] } });
    this.w.log.version++;
  }

  // --- debug ----------------------------------------------------------------

  // __deadstar.kill(i): the system the player is in gets the whole set piece, anything else dies
  // on the spot. Ignores the fated list on purpose — it is a test hook.
  force(index) {
    const here = this.here;
    const i = index ?? here?.index;
    if (i == null || i === HOME_SYSTEM || this.state.ev || this.state.isDead(i)) return null;
    const sys = allSystems(this.w.save.galaxySeed)[i];
    if (!sys) return null;
    if (here?.index === i) { this.begin(sys); return this.state.ev; }
    this.kill(sys, false);
    return null;
  }

  arrived() { this.drop(); }
  departed() {}
}

const dist2 = (a, b) => (a.pos.x - b.pos.x) ** 2 + (a.pos.y - b.pos.y) ** 2 + (a.pos.z - b.pos.z) ** 2;
