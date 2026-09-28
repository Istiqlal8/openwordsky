// Accepted deliveries: hold space, timers for live cargo, hull damage for fragile cargo, payout.
import { lockReason } from './ship-cargo.js';
import { makeOffers, KINDS } from './cargo-offers.js';

const FRAGILE = new Set(['plant', 'contraband']);
const EXPLORER_TIME = 1.25; // explorers keep animals alive longer (better life support)

export class CargoMissions {
  constructor(state) {
    state.cargo ??= {};
    this.s = Object.assign({ active: [], offers: [], board: null, delivered: 0, failed: 0 }, state.cargo);
    state.cargo = this.s;
  }

  get active() { return this.s.active; }
  get offers() { return this.s.offers; }

  // New board whenever the player lands somewhere else.
  refreshOffers(seed, planet, systemIndex) {
    if (this.s.board === planet.key && this.s.offers.length) return;
    this.s.board = planet.key;
    this.s.offers = makeOffers(seed, planet, systemIndex);
  }

  // -> { ok, text }
  accept(index, design, hull) {
    const o = this.s.offers[index];
    if (!o) return { ok: false, text: 'Tidak ada tawaran di nomor itu' };
    const why = lockReason(o, design, this.s.active);
    if (why) return { ok: false, text: `Tidak bisa dimuat: ${why}` };
    const m = { ...o, age: 0, bruise: 0, lastHull: hull };
    if (m.limit && design.cls === 'explorer') m.limit = Math.round(m.limit * EXPLORER_TIME);
    this.s.offers.splice(index, 1);
    this.s.active.push(m);
    return { ok: true, text: `Muatan dimuat: ${m.title} → ${m.dest.name}` };
  }

  // Drops the oldest cargo (no reward). Returns it or null.
  abandon() {
    return this.s.active.shift() ?? null;
  }

  // Ages every cargo; returns the missions that just failed (dead animals).
  tick(dt, hull) {
    const failed = [];
    for (const m of this.s.active) {
      m.age += dt;
      if (FRAGILE.has(m.kind) && hull < m.lastHull) m.bruise += m.lastHull - hull;
      m.lastHull = hull;
      if (m.limit && m.age >= m.limit) failed.push(m);
    }
    if (failed.length) {
      this.s.active = this.s.active.filter((m) => !failed.includes(m));
      this.s.failed += failed.length;
    }
    return failed;
  }

  // Landing on a destination hands over every cargo bound for it. -> [{ mission, reward }]
  arrive(planetKey) {
    const done = this.s.active.filter((m) => m.dest.key === planetKey);
    if (!done.length) return [];
    this.s.active = this.s.active.filter((m) => !done.includes(m));
    this.s.delivered += done.length;
    return done.map((m) => ({ mission: m, reward: rewardOf(m) }));
  }
}

// 0..1 health of the cargo value (shown in the tracker too).
export function condition(m) {
  let c = 1;
  if (m.wilt && m.age > m.wilt) c *= 0.4;
  if (FRAGILE.has(m.kind)) c *= Math.max(0.3, 1 - m.bruise / 60);
  return c;
}

export function rewardOf(m) {
  let mult = condition(m);
  if (m.limit && m.age < m.limit * 0.5) mult *= 1.25; // arrived with half the time left
  const nanit = Math.max(10, Math.round(m.pay * mult));
  return { nanit, items: [], xp: 10 + Math.round(nanit / 10) };
}

export function kindLabel(m) { return KINDS[m.kind]?.label ?? m.kind; }
