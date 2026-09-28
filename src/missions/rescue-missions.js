// Distress calls: one planet rescue at a time, multi-stage, time-limited, with a saved-planet record.
import { makeRescue } from './rescue-defs.js';

const FIRST_CALL = 150;               // game seconds before the first distress call
const CALL_GAP = [420, 720];          // between calls after a rescue ends
const between = ([lo, hi]) => lo + Math.random() * (hi - lo);

export class RescueMissions {
  constructor(state) {
    state.rescue ??= {};
    this.s = Object.assign({ active: null, next: FIRST_CALL, saved: [], failed: 0 }, state.rescue);
    state.rescue = this.s;
    this.onStage = null;  // (mission, stage) => void   a stage finished (not the last)
    this.onDone = null;   // (mission) => void
    this.onFail = null;   // (mission) => void
  }

  get active() { return this.s.active; }
  get stage() { return this.s.active?.stages[this.s.active.stage] ?? null; }

  // Counts down the call timer or the active rescue. Returns a new mission when a call comes in.
  tick(dt, seed, systemIndex) {
    const m = this.s.active;
    if (m) {
      m.left -= dt;
      if (m.left <= 0) this.fail();
      return null;
    }
    this.s.next -= dt;
    if (this.s.next > 0) return null;
    return this.call(seed, systemIndex);
  }

  call(seed, systemIndex) {
    const m = makeRescue(seed, systemIndex);
    this.s.next = m ? between(CALL_GAP) : 60;
    this.s.active = m;
    return m;
  }

  // where = { planetKey, systemIndex, inSpace }
  onAct(type, where) {
    const st = this.stage, m = this.s.active;
    if (!st || st.type !== 'act' || st.act !== type) return false;
    if (st.where === 'system' && (!where.inSpace || where.systemIndex !== m.dest.systemIndex)) return false;
    if (st.where === 'planet' && where.planetKey !== m.dest.key) return false;
    return this.bump(st, 1);
  }

  onArrive(planetKey, player) {
    const st = this.stage;
    if (!st || planetKey !== this.s.active.dest.key) return false;
    if (st.type === 'land') return this.bump(st, 1);
    return this.checkDeliver(player, planetKey);
  }

  // 'deliver' progress follows what the player carries; handed over on the target planet.
  checkDeliver(player, planetKey) {
    const st = this.stage;
    if (!st || st.type !== 'deliver') return false;
    const have = Math.min(st.n, st.items.reduce((n, it) => n + player.count(it), 0));
    const changed = have !== st.progress;
    st.progress = have;
    if (have < st.n || planetKey !== this.s.active.dest.key) return changed;
    let need = st.n;
    for (const it of st.items) {
      const take = Math.min(need, player.count(it));
      if (take) player.removeItem(it, take);
      need -= take;
    }
    this.advance();
    return true;
  }

  // Beacon pillars for this planet: [{ x, z, hit }] or null when none are needed here.
  beaconsFor(planetKey) {
    const st = this.stage;
    return st?.type === 'beacons' && this.s.active.dest.key === planetKey ? this.s.active.beacons : null;
  }

  placeBeacons(list) { this.s.active.beacons = list; }

  reachBeacon(i) {
    const b = this.s.active?.beacons?.[i];
    if (!b || b.hit) return false;
    b.hit = true;
    return this.bump(this.stage, 1);
  }

  bump(st, n) {
    st.progress = Math.min(st.n, st.progress + n);
    if (st.progress >= st.n) this.advance();
    return true;
  }

  advance() {
    const m = this.s.active;
    m.stage++;
    m.beacons = null;
    if (m.stage < m.stages.length) { this.onStage?.(m, m.stages[m.stage - 1]); return; }
    this.s.active = null;
    this.s.saved.push({ name: m.dest.name, key: m.dest.key, crisis: m.title.split(':')[0], at: Date.now() });
    this.onDone?.(m);
  }

  fail() {
    const m = this.s.active;
    this.s.active = null;
    this.s.failed++;
    this.onFail?.(m);
  }
}
