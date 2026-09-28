// Rival explorer: one named rival per galaxy who sometimes races the player to finish a
// planet's collection. Win before the timer ends for a bonus; leave or run out and the rival
// claims the planet. State lives in log.s.rival.
import { Rng, hash32 } from '../core/rng.js';
import { word } from '../gen/names.js';

const RACE_CHANCE = 0.3;
const SEC_PER_ENTRY = 45, MIN_SEC = 300, MAX_SEC = 1200;
const MAX_REMAINING = 30; // skip planets with too much left to be winnable

export function rivalName(galaxySeed) {
  const rng = new Rng(hash32(galaxySeed, 0x71a1));
  return `${word(rng)} ${word(rng)}`;
}

export class Rival {
  constructor(wiring) {
    this.w = wiring;
    this.log = wiring.log;
    this.s = (this.log.s.rival ??= { race: null, won: 0, lost: 0, claimed: {} });
    this.name = rivalName(wiring.save.galaxySeed ?? 0);
    this.last = 0;
  }

  // `race` = { key, planet, left (seconds), bonus }
  get race() { return this.s.race; }

  arrived(planet) {
    if (this.s.race || planet.gas) return;
    const st = this.w.collection.status;
    const left = st ? st.total - st.done : 0;
    if (!st || st.cleared || this.s.claimed[planet.key] || left < 1 || left > MAX_REMAINING) return;
    if (Math.random() >= RACE_CHANCE) return;
    const secs = Math.min(MAX_SEC, Math.max(MIN_SEC, left * SEC_PER_ENTRY));
    this.s.race = { key: planet.key, planet: planet.name, left: secs, bonus: 200 + st.total * 25 };
    this.w.hud.toast(`Rival ${this.name} juga sedang mengkatalog ${planet.name}! Tuntaskan koleksinya dalam ${Math.round(secs / 60)} menit.`);
    this.log.version++;
  }

  departed() { if (this.s.race) this.lose('Kau meninggalkan planet'); }

  lose(why) {
    const r = this.s.race;
    this.s.race = null;
    this.s.lost++;
    this.s.claimed[r.key] = Date.now();
    this.w.hud.toast(`${why}. ${this.name} mengklaim koleksi ${r.planet}.`);
    this.log.version++;
  }

  win() {
    const r = this.s.race;
    this.s.race = null;
    this.s.won++;
    this.log.award({ title: `Mengalahkan ${this.name} di ${r.planet}`, reward: { nanit: r.bonus, items: [['Emas', 2]], xp: 60 } });
  }

  update() {
    const r = this.s.race;
    const now = performance.now() / 1000, dt = Math.min(0.25, now - this.last);
    this.last = now;
    if (!r) return;
    if (this.log.s.cleared[r.key]) { this.win(); return; }
    const here = this.w.planet?.key;
    if (here && here !== r.key) { this.lose('Kau pindah planet'); return; }
    if (here !== r.key) return; // timer only runs on the contested planet
    const before = Math.ceil(r.left);
    r.left -= dt;
    if (r.left <= 0) { this.lose('Waktu habis'); return; }
    if (Math.ceil(r.left) !== before) this.log.version++; // redraw the countdown once a second
  }
}
