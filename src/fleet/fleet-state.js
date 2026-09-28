// Fleet in the save (log.s.fleet): frigates, running expeditions and pending reports.
// Expeditions run on wall-clock time (Date.now), so they keep going while the game is closed.
import { rngOf, hash32 } from '../core/rng.js';
import { word } from '../gen/names.js';
import { MAX_FRIGATES, MAX_LEVEL, CLASS_IDS, TYPE_BY_ID, frigateName, buyCost, repairCost, xpToNext } from './fleet-defs.js';
import { resolveExpedition } from './fleet-outcome.js';

const MIN = 60000;

export class Fleet {
  constructor(logState, galaxySeed) {
    this.s = (logState.fleet ??= { frigates: [], exps: [], next: 1 });
    this.galaxySeed = galaxySeed;
    if (!this.s.frigates.length) this.addFrigate('jelajah');
  }

  get frigates() { return this.s.frigates; }
  get exps() { return this.s.exps; }
  get full() { return this.s.frigates.length >= MAX_FRIGATES; }
  nextCost() { return buyCost(this.s.frigates.length); }

  addFrigate(cls) {
    const id = this.s.next++, rng = rngOf(hash32(this.galaxySeed ?? 1, id, 0xf7));
    const f = { id, name: frigateName(rng, word), cls: cls ?? rng.pick(CLASS_IDS), level: 1, xp: 0, damaged: false };
    this.s.frigates.push(f);
    return f;
  }

  expOf(f) { return this.s.exps.find((e) => e.frigate === f.id) ?? null; }
  status(f, now) {
    const e = this.expOf(f);
    if (e) return e.end <= now ? 'done' : 'away';
    return f.damaged ? 'damaged' : 'ready';
  }

  // Player pays with `pay(cost)` -> bool. Returns { ok, text }.
  buy(pay) {
    if (this.full) return { ok: false, text: `Armada penuh (${MAX_FRIGATES} fregat)` };
    if (!pay(this.nextCost())) return { ok: false, text: 'Bahan tidak cukup untuk fregat baru' };
    const f = this.addFrigate(null);
    return { ok: true, text: `Fregat baru bergabung: ${f.name}` };
  }

  repair(f, pay) {
    if (!f?.damaged) return { ok: false, text: 'Fregat ini tidak rusak' };
    if (this.expOf(f)) return { ok: false, text: 'Fregat masih di ekspedisi' };
    if (!pay(repairCost(f))) return { ok: false, text: 'Bahan perbaikan tidak cukup' };
    f.damaged = false;
    return { ok: true, text: `${f.name} diperbaiki` };
  }

  send(f, typeId, minutes, now) {
    if (!f) return { ok: false, text: 'Pilih fregat dulu' };
    const st = this.status(f, now);
    if (st !== 'ready') return { ok: false, text: st === 'damaged' ? `${f.name} rusak, perbaiki dulu (Enter)` : `${f.name} sedang bertugas` };
    const seed = hash32(this.galaxySeed ?? 1, f.id, now & 0x7fffffff, this.s.next++);
    this.s.exps.push({ frigate: f.id, type: typeId, minutes, start: now, end: now + minutes * MIN, seed, told: false });
    return { ok: true, text: `${f.name} berangkat: ${TYPE_BY_ID[typeId].label} · ${minutes} menit` };
  }

  // Finished expeditions that have not been announced yet (marks them told).
  newlyDone(now) {
    const out = this.s.exps.filter((e) => e.end <= now && !e.told);
    for (const e of out) e.told = true;
    return out;
  }

  // Resolve every finished expedition -> [{ frigate, exp, result, levelUp }].
  collect(now) {
    const done = this.s.exps.filter((e) => e.end <= now);
    this.s.exps = this.s.exps.filter((e) => e.end > now);
    return done.map((exp) => {
      const f = this.s.frigates.find((x) => x.id === exp.frigate);
      if (!f) return null;
      const result = resolveExpedition(exp, f, this.galaxySeed);
      if (result.damaged) f.damaged = true;
      return { frigate: f, exp, result, levelUp: this.gainXp(f, result.xp) };
    }).filter(Boolean);
  }

  gainXp(f, xp) {
    const before = f.level;
    f.xp += xp;
    while (f.level < MAX_LEVEL && f.xp >= xpToNext(f.level)) { f.xp -= xpToNext(f.level); f.level++; }
    return f.level > before;
  }

  // Soonest running expedition end, or null.
  soonest(now) {
    const running = this.s.exps.filter((e) => e.end > now).map((e) => e.end);
    return running.length ? Math.min(...running) : null;
  }
}
