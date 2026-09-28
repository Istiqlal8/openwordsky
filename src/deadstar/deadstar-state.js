// Persistent state for "Bintang Mati": which systems are dead, which remnants were already
// salvaged, and the one nova currently running. Stored in log.s.deadstar, so it rides along in
// the save exactly like devourer/state.js.
import { Rng, hash32 } from '../core/rng.js';

export const WARN = 26;   // seconds of tremors and bleaching sky before the front arrives
export const BLAST = 7;   // seconds the front takes to sweep the system
const FIRST_MS = 8 * 60 * 1000;
const GAP_MS = [13 * 60 * 1000, 24 * 60 * 1000];

function fresh() {
  return { v: 1, playMs: 0, nextAt: FIRST_MS, ev: null, dead: [], salvaged: [], hist: [] };
}

export class DeadStarState {
  constructor(logState, galaxySeed) {
    logState.deadstar = { ...fresh(), ...logState.deadstar };
    this.s = logState.deadstar;
    this.galaxySeed = galaxySeed;
    this.s.dead ??= [];
    this.s.salvaged ??= [];
    this.s.hist ??= [];
  }

  get ev() { return this.s.ev; }
  get dead() { return this.s.dead; }

  isDead(index) { return this.s.dead.includes(index); }
  isSalvaged(index) { return this.s.salvaged.includes(index); }

  tick(dtMs) { this.s.playMs += dtMs; }
  due() { return !this.s.ev && this.s.playMs >= this.s.nextAt; }

  elapsed(now = Date.now()) {
    return this.s.ev ? Math.max(0, (now - this.s.ev.t0) / 1000) : 0;
  }

  // Seconds until the front hits; negative once it is already sweeping.
  left(now = Date.now()) { return WARN - this.elapsed(now); }

  phase(now = Date.now()) {
    const t = this.elapsed(now);
    if (t < WARN) return 'warn';
    return t < WARN + BLAST ? 'blast' : 'over';
  }

  // 0..1 across the warning, for tremor and sky-bleach ramps.
  warnRamp(now = Date.now()) {
    const k = this.elapsed(now) / WARN;
    return k < 0 ? 0 : k > 1 ? 1 : k;
  }

  begin(system, now = Date.now()) {
    this.s.ev = { sys: system.index, name: system.name, t0: now };
    return this.s.ev;
  }

  // The permanent part: once a system is on this list it reads as dead on every later visit.
  markDead(index, name, now = Date.now()) {
    if (this.s.dead.includes(index)) return false;
    this.s.dead.push(index);
    this.s.hist.unshift({ sys: index, name, at: now });
    this.s.hist = this.s.hist.slice(0, 10);
    return true;
  }

  markSalvaged(index) {
    if (this.s.salvaged.includes(index)) return false;
    this.s.salvaged.push(index);
    return true;
  }

  reschedule() {
    const rng = new Rng(hash32(this.galaxySeed, this.s.playMs | 0, this.s.dead.length));
    this.s.nextAt = this.s.playMs + rng.range(GAP_MS[0], GAP_MS[1]);
    this.s.ev = null;
  }

  // Debug: bring the next nova forward / push the countdown along.
  forceDue() { this.s.nextAt = this.s.playMs; }
  fastForward(seconds) { if (this.s.ev) this.s.ev.t0 -= seconds * 1000; }
}
