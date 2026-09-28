// Pemakan Planet: the whole galaxy-wide event state in one place. Everything the world does is
// derived from (seed + elapsed time); the player's own contribution is tracked separately so a
// future multiplayer layer can sum several players' damage against the same world state.
import { Rng, hash32 } from '../core/rng.js';

export const MAX_HP = 100000;
export const DURATION = 360;              // seconds the fleet has to kill it
export const NODES = 6;                   // shield nodes that must fall first
const FIRST_MS = 10 * 60 * 1000;          // earliest arrival after ~10 minutes of play
const GAP_MS = [16 * 60 * 1000, 28 * 60 * 1000];
const SHIELD_BAND = 0.22;                 // first 22% of the health bar is the shield phase
const ENRAGE_AT = 0.35;                   // hp fraction where it starts sweeping the fleet

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

function fresh() {
  return { v: 1, playMs: 0, nextAt: FIRST_MS, ev: null, eaten: [], scarred: [], wins: 0, losses: 0, hist: [], trophy: false };
}

// Damage the NPC fleet lands on its own, as a fraction of MAX_HP. Seeded per event and always
// short of a kill, so the player's guns decide whether the planet lives.
function fleetShare(seed) {
  return new Rng(hash32(seed, 0x51ee)).range(0.66, 0.9);
}

export class DevourerState {
  constructor(logState, galaxySeed) {
    logState.devourer = { ...fresh(), ...logState.devourer };
    this.s = logState.devourer;
    this.galaxySeed = galaxySeed;
    this.s.eaten ??= [];
    this.s.scarred ??= [];
    this.s.hist ??= [];
  }

  get ev() { return this.s.ev; }
  get eaten() { return this.s.eaten; }
  get scarred() { return this.s.scarred; }

  // Wall-clock seconds since the entity arrived.
  elapsed(now = Date.now()) {
    return this.s.ev ? Math.max(0, (now - this.s.ev.t0) / 1000) : 0;
  }

  left(now = Date.now()) {
    return this.s.ev ? Math.max(0, DURATION - this.elapsed(now)) : 0;
  }

  // World damage (seed + time) plus every player's damage. One source of truth for all views.
  progress(now = Date.now()) {
    const ev = this.s.ev;
    if (!ev) return 0;
    const t = clamp01(this.elapsed(now) / DURATION);
    return clamp01(fleetShare(ev.seed) * Math.pow(t, 1.2) + ev.playerDmg / MAX_HP);
  }

  hpFrac(now = Date.now()) { return 1 - this.progress(now); }

  phase(now = Date.now()) {
    const hp = this.hpFrac(now);
    if (hp <= 0) return 'collapse';
    if (hp > 1 - SHIELD_BAND) return 'shield';
    return hp > ENRAGE_AT ? 'open' : 'enraged';
  }

  // Shield nodes still standing: they pop one by one across the shield band.
  nodesLeft(now = Date.now()) {
    const k = clamp01(this.progress(now) / SHIELD_BAND);
    return Math.max(0, NODES - Math.floor(k * NODES + 1e-6));
  }

  contribution() {
    return this.s.ev ? clamp01(this.s.ev.playerDmg / MAX_HP) : 0;
  }

  // Damage from the local player. Returns the amount that actually landed.
  addPlayerDamage(amount) {
    const ev = this.s.ev;
    if (!ev || amount <= 0) return 0;
    const room = MAX_HP * this.hpFrac();
    const dealt = Math.min(amount, Math.max(0, room));
    ev.playerDmg += dealt;
    return dealt;
  }

  tick(dtMs) {
    this.s.playMs += dtMs;
  }

  due() {
    return !this.s.ev && this.s.playMs >= this.s.nextAt;
  }

  // Start an event on `system` around `planet`. Wall-clock t0 keeps the countdown honest.
  begin(system, planet, now = Date.now()) {
    const seed = hash32(this.galaxySeed, system.index, Math.floor(now / 1000));
    this.s.ev = { id: `dv-${seed >>> 0}`, seed, sys: system.index, sysName: system.name,
      planetKey: planet.key, planetIndex: planet.index, planetName: planet.name,
      t0: now, playerDmg: 0, joined: false, done: null };
    return this.s.ev;
  }

  // Close the event: 'win' scars the planet, 'loss' eats it for good.
  finish(outcome, now = Date.now()) {
    const ev = this.s.ev;
    if (!ev || ev.done) return null;
    ev.done = outcome;
    const list = outcome === 'loss' ? this.s.eaten : this.s.scarred;
    if (!list.includes(ev.planetKey)) list.push(ev.planetKey);
    this.s[outcome === 'win' ? 'wins' : 'losses']++;
    this.s.hist.unshift({ planet: ev.planetName, sys: ev.sysName, outcome, at: now,
      share: Math.round(this.contribution() * 100) });
    this.s.hist = this.s.hist.slice(0, 8);
    return ev;
  }

  // Clear the finished event and schedule the next arrival.
  reschedule() {
    const rng = new Rng(hash32(this.galaxySeed, this.s.playMs | 0, this.s.wins + this.s.losses));
    this.s.nextAt = this.s.playMs + rng.range(GAP_MS[0], GAP_MS[1]);
    this.s.ev = null;
  }

  // Debug: bring the next arrival forward / push the countdown along.
  forceDue() { this.s.nextAt = this.s.playMs; }
  fastForward(seconds) { if (this.s.ev) this.s.ev.t0 -= seconds * 1000; }
}
