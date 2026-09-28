// Meta addon (src/game/addons.js): the galaxy-wide "Pemakan Planet" event. Owns the schedule,
// the announcement, the journal card and the reward payout, and mounts the 3D battle whenever
// the player is flying in the system under attack. Persistent state lives in log.s.devourer.
import { allSystems, planetsOf } from '../gen/galaxy.js';
import { DevourerState, MAX_HP } from './state.js';
import { setEatenKeys } from './husk.js';
import { setLiveEvent } from './live.js';
import { Battle } from './battle.js';
import { DevourerBanner, devourerCard, devourerTrack } from '../ui/devourer-panel.js';

const NEAR_RANK = [1, 7];      // it arrives in one of the nearest systems, a few jumps out
const WARP_COST = 30;
const TROPHY = 'Taring Pemakan Planet';
const AFTERGLOW = 6;           // seconds the wreck (or the husk) stays before cleanup

export class DevourerAddon {
  constructor(w) {
    this.w = w;
    this.state = new DevourerState(w.log.s, w.save.galaxySeed);
    setEatenKeys(this.state.eaten, this.state.scarred);
    setLiveEvent(this.state.ev && !this.state.ev.done ? this.state.ev : null);
    this.banner = new DevourerBanner(w.panel.tracker.parentNode);
    this.battle = null;
    this.after = 0;
    this.last = performance.now();
    w.panel.sections.push({ journal: () => devourerCard(this.state, this.view()), track: () => devourerTrack(this.view()) });
    this.expose();
  }

  get app() { return this.w.app ?? globalThis.__game?.app ?? null; }

  // Debug handle used by the headless tests: window.__devourer.
  expose() {
    globalThis.__devourer = {
      state: () => this.state.s,
      start: () => { this.state.forceDue(); this.spawn(); return this.state.ev; },
      skip: (s) => this.state.fastForward(s),
      damage: (n) => this.state.addPlayerDamage(n),
      finishNow: (outcome) => this.resolve(outcome),
      battle: () => this.battle,
      info: () => this.view(),
    };
  }

  update() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.state.tick(dt * 1000);
    if (this.state.due()) this.spawn();
    const ev = this.state.ev;
    if (!ev) { this.banner.hide(); this.drop(); return; }
    const wall = Date.now();
    if (!ev.done) this.checkOutcome(wall);
    this.syncBattle(dt, wall);
    this.showBanner(wall);
    this.cleanup(dt);
  }

  // --- schedule -------------------------------------------------------------

  spawn() {
    const app = this.app;
    const here = app?.game?.system;
    if (!here) return null;
    const all = allSystems(this.w.save.galaxySeed);
    const near = all.filter((s) => s.index !== here.index)
      .sort((a, b) => dist2(a, here) - dist2(b, here)).slice(NEAR_RANK[0] - 1, NEAR_RANK[1]);
    const pick = near[Math.floor(Math.random() * near.length)];
    const planet = this.pickPlanet(pick);
    if (!planet) { this.state.reschedule(); return null; }
    const ev = this.state.begin(pick, planet);
    setLiveEvent(ev);
    this.announce(ev, pick, here);
    return ev;
  }

  pickPlanet(system) {
    const planets = planetsOf(this.w.save.galaxySeed, system)
      .filter((p) => !p.gas && !p.eaten && !this.state.eaten.includes(p.key));
    return planets[Math.floor(Math.random() * planets.length)] ?? null;
  }

  announce(ev, system, here) {
    const { hud, sfx, player, log } = this.w;
    hud.toast(`PEMAKAN PLANET muncul di sistem ${system.name} — armada berkumpul`);
    hud.toast(`${ev.planetName} sedang dimakan · ${ly(system, here).toFixed(1)} ly · M untuk peta`);
    sfx.alarm?.(true);
    setTimeout(() => sfx.alarm?.(false), 2500);
    player.emit('act', { type: 'devourer', stage: 'arrive', planet: ev.planetName });
    log.version++;
  }

  // --- outcome --------------------------------------------------------------

  checkOutcome(wall) {
    if (this.state.hpFrac(wall) <= 0) this.resolve('win');
    else if (this.state.left(wall) <= 0) this.resolve('loss');
  }

  resolve(outcome) {
    const ev = this.state.finish(outcome);
    if (!ev) return;
    const share = this.state.contribution();
    setLiveEvent(null);
    if (outcome === 'win') this.battle?.playDeath();
    setEatenKeys(this.state.eaten, this.state.scarred);
    this.w.hud.toast(outcome === 'win'
      ? `PEMAKAN PLANET HANCUR — ${ev.planetName} diselamatkan`
      : `${ev.planetName} lenyap — Pemakan Planet pergi dengan kenyang`);
    this.w.sfx.explosion?.(1);
    this.reward(outcome, share, ev);
    this.w.player.emit('act', { type: 'devourer', stage: outcome, planet: ev.planetName, share });
    this.after = AFTERGLOW;
    this.w.log.version++;
  }

  // Rewards scale with the share of MAX_HP the player personally burned off.
  reward(outcome, share, ev) {
    if (share < 0.01 && outcome === 'loss') return;
    const win = outcome === 'win';
    const nanit = Math.round((win ? 350 : 80) + (win ? 4200 : 900) * share);
    const items = [['Kristal Alien', 1 + Math.round((win ? 8 : 2) * share)]];
    if (win && share >= 0.05) items.push(['Artefak Kuno', 1 + Math.round(4 * share)]);
    if (win && share >= 0.15 && !this.state.s.trophy) { items.push([TROPHY, 1]); this.state.s.trophy = true; }
    this.w.log.award({ kind: 'devourer', title: win ? `Pemakan Planet dikalahkan · ${ev.planetName}` : `Berjuang untuk ${ev.planetName}`,
      goal: { type: 'devourer', n: 1 }, progress: 1,
      reward: { nanit, items, xp: Math.round((win ? 150 : 40) + (win ? 900 : 200) * share) } });
  }

  cleanup(dt) {
    if (!this.state.ev?.done) return;
    this.after -= dt;
    if (this.after > 0) return;
    this.drop();
    this.state.reschedule();
    this.w.log.version++;
  }

  // --- the 3D battle --------------------------------------------------------

  syncBattle(dt, wall) {
    const app = this.app;
    const ev = this.state.ev;
    // The wreck (or the husk) stays on screen through the afterglow before it is torn down.
    const inSystem = app && app.game.mode === 'space' && app.space.system?.index === ev.sys;
    if (!inSystem || (ev.done && this.after <= 0)) { this.drop(); return; }
    // A warp out and back rebuilds every PlanetBody, so a battle holding the old one is stale.
    if (this.battle && !app.space.bodies.includes(this.battle.body)) this.drop();
    if (!this.battle) this.mount(app, ev);
    this.battle?.update(dt, wall);
  }

  mount(app, ev) {
    const body = app.space.bodies.find((b) => b.planet.key === ev.planetKey);
    const combat = app.spaceMode?.combat;
    if (!body || !combat?.system) return;
    this.battle = new Battle({ space: app.space, combat, player: this.w.player, sfx: this.w.sfx,
      hud: this.w.hud, state: this.state, body, ev });
    this.w.hud.toast(`Medan tempur: ${ev.planetName} — armada sekutu sudah di posisi`);
  }

  drop() {
    if (!this.battle) return;
    this.battle.dispose();
    this.battle = null;
  }

  // --- view model shared by banner, tracker and journal ---------------------

  view() {
    const ev = this.state.ev;
    if (!ev || ev.done) return null;
    const wall = Date.now();
    const here = this.app?.game?.system;
    return { planet: ev.planetName, system: ev.sysName, left: this.state.left(wall),
      hpFrac: this.state.hpFrac(wall), phase: this.state.phase(wall), share: this.state.contribution(),
      here: here?.index === ev.sys, jumps: 1, energy: WARP_COST, damage: ev.playerDmg, max: MAX_HP };
  }

  showBanner(wall) {
    const v = this.view();
    if (!v) { this.banner.hide(); return; }
    this.banner.show(v);
    if (Math.floor(this.state.left(wall)) % 30 === 0) this.w.log.version++;
  }

  arrived() { this.drop(); }
  departed() {}
}

const dist2 = (a, b) => (a.pos.x - b.pos.x) ** 2 + (a.pos.y - b.pos.y) ** 2 + (a.pos.z - b.pos.z) ** 2;
const ly = (a, b) => Math.sqrt(dist2(a, b)) * 0.1;
