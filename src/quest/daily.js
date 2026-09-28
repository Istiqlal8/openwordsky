// Daily challenges: 3 goals per real-world day, seeded by the local date, plus a streak bonus
// for consecutive days with all three done. State lives in log.s.daily.
import { Rng, hash32 } from '../core/rng.js';
import { matches } from './quest-log.js';

const PER_DAY = 3;
const STREAK_BONUS = 120;  // Nanit per streak day, capped at MAX_STREAK_PAY days
const MAX_STREAK_PAY = 7;

// [type, title, text, lo, hi, pay per unit]
const POOL = [
  ['harvest', 'Panen Raya', 'Panen tumbuhan di planet mana saja.', 25, 40, 12],
  ['mine', 'Hari Tambang', 'Tambang batu sebanyak mungkin.', 15, 25, 16],
  ['hunt', 'Musim Berburu', 'Buru hewan dengan blaster.', 5, 8, 60],
  ['gather', 'Peternak Rajin', 'Ambil hasil hewan jinak (Q).', 5, 8, 50],
  ['pickup', 'Pemulung Handal', 'Pungut benda bercahaya di tanah.', 10, 16, 30],
  ['scanFauna', 'Ahli Satwa Harian', 'Catat spesies fauna baru (F).', 3, 5, 120],
  ['floraNew', 'Botanis Harian', 'Panen spesies tumbuhan yang belum tercatat.', 3, 5, 110],
  ['warp', 'Pengembara Bintang', 'Warp ke sistem lain.', 2, 4, 150],
  ['discover', 'Kartografer Harian', 'Pindai planet yang belum ditemukan.', 3, 6, 110],
  ['asteroid', 'Pemecah Batu Angkasa', 'Hancurkan asteroid dengan laser.', 15, 25, 20],
  ['pirate', 'Pemburu Hadiah', 'Kalahkan bajak laut.', 2, 4, 180],
  ['land', 'Pendaratan Beruntun', 'Mendarat di planet mana saja.', 3, 5, 90],
];

const pad = (n) => String(n).padStart(2, '0');
export function dayKey(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function dayBefore(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

// The same date always yields the same three challenges.
export function challengesFor(key) {
  const rng = new Rng(hash32(...key.split('-').map(Number), 0xda11));
  return rng.take(POOL, PER_DAY).map(([type, title, text, lo, hi, pay], i) => {
    const n = lo + rng.int(hi - lo + 1), nanit = Math.round(n * pay);
    const items = rng.chance(0.5) ? [[rng.pick(['Emas', 'Kobalt', 'Logam Penjaga']), 3 + rng.int(6)]] : [];
    return { id: `d${key}-${i}`, kind: 'daily', title, text, goal: { type, n }, progress: 0, done: false,
      reward: { nanit, items, xp: 30 + Math.round(nanit / 6) } };
  });
}

export class DailyChallenges {
  constructor(wiring) {
    this.w = wiring;
    this.log = wiring.log;
    this.s = (this.log.s.daily ??= { day: null, list: [], streak: 0, lastFull: null });
    this.roll();
    this.log.watchers.push((type, data) => this.record(type, data));
  }

  get list() { return this.s.list; }
  get doneCount() { return this.s.list.filter((c) => c.done).length; }
  get streakBonus() { return STREAK_BONUS * Math.min(this.s.streak + 1, MAX_STREAK_PAY); }

  // New local day -> fresh challenges; a missed day breaks the streak.
  roll() {
    const today = dayKey();
    if (this.s.day === today) return false;
    this.s.day = today;
    this.s.list = challengesFor(today);
    if (this.s.lastFull !== dayBefore(today)) this.s.streak = 0;
    this.log.version++;
    return true;
  }

  record(type, data) {
    for (const c of this.s.list) {
      if (c.done || !matches(c.goal, type, data)) continue;
      c.progress = Math.min(c.goal.n, c.progress + (data.n ?? 1));
      this.log.version++;
      if (c.progress >= c.goal.n) this.finish(c);
    }
  }

  finish(c) {
    c.done = true;
    this.log.award(c);
    if (this.doneCount < PER_DAY) return;
    this.s.streak = this.s.lastFull === dayBefore(this.s.day) ? this.s.streak + 1 : 1;
    this.s.lastFull = this.s.day;
    const nanit = STREAK_BONUS * Math.min(this.s.streak, MAX_STREAK_PAY);
    this.log.award({ title: `Beruntun ${this.s.streak} hari`, reward: { nanit, items: [['Emas', this.s.streak]], xp: 25 * this.s.streak } });
  }

  update() {
    const t = Math.floor(performance.now() / 1000);
    if (t === this.tick) return;
    this.tick = t;
    if (this.roll()) this.w.hud.toast('Tantangan harian baru tersedia (J)');
  }
}
