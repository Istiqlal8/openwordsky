// Planet event (src/events/planet-events.js): a moon slides in front of the star. Daylight
// drains over ~25 s, holds near-dark for ~45 s, then comes back. While it is dark the night
// flora opens in the middle of the day and the sentinel patrol loses the player.
// Debug: globalThis.__eclipse (src/eclipse/eclipse-debug.js).
import { EclipseShadow } from './eclipse-shadow.js';
import { eclipseLink } from './eclipse-link.js';
import { installEclipseDebug } from './eclipse-debug.js';

const INGRESS = 25, TOTALITY = 45, EGRESS = 25;
// Chance the moons line up at all, by moon count. One moon rarely does; three often do.
const ALIGN = [0, 0.18, 0.4, 0.7];
const HOLD = 0.12;      // how far the moon still drifts while the star stays fully covered
const NEEDS_SUN = 0.8;  // daylight at the start: an eclipse at dusk would be invisible

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v) => v * v * (3 - 2 * v);

installEclipseDebug();

export class Eclipse {
  constructor(ctx) {
    this.ctx = ctx;
    this.id = 'gerhana';
    this.duration = INGRESS + TOTALITY + EGRESS;
    this.title = 'Bulan menutupi matahari — gerhana dimulai';
    this.endText = 'Matahari kembali penuh';
    this.participated = false;
    this.t = 0;
    this.cover = 0;
    this.phase = 'masuk';
    if (!this.possible(ctx)) { this.failed = true; return; }
    const cycle = ctx.surface?.sky?.cycle;
    if (!cycle || (cycle.daylight < NEEDS_SUN && !this.forced)) { this.failed = true; return; }
    this.shadow = new EclipseShadow(ctx.surface.sky);
    eclipseLink.event = this;
  }

  // No moon, no eclipse; a gas giant has no surface to darken. A forced start skips both the
  // rarity roll and the moon count so a headless run can trigger it on whatever planet it is on.
  possible(ctx) {
    this.forced = eclipseLink.forced;
    eclipseLink.forced = false; // one shot, however this attempt turns out
    if (ctx.planet?.gas) return false;
    if (this.forced) return true;
    const moons = ctx.planet?.moons ?? 0;
    return moons > 0 && Math.random() < ALIGN[Math.min(moons, ALIGN.length - 1)];
  }

  update(dt) {
    this.t += dt;
    this.trace();
    this.shadow.set(this.cover, this.offset);
    if (this.phase === 'puncak') this.blindSentinels();
  }

  // Coverage, the moon's slide across the star, and the phase name for the current second.
  trace() {
    const t = this.t;
    if (t < INGRESS) return this.at('masuk', smooth(t / INGRESS), -1);
    const out = t - INGRESS - TOTALITY;
    if (out < 0) {
      const u = (t - INGRESS) / TOTALITY;
      return this.at('puncak', 1, (u - 0.5) * 2 * HOLD, true);
    }
    return this.at('keluar', smooth(clamp01(1 - out / EGRESS)), 1);
  }

  // `dir` -1 approaching, +1 leaving; for totality `raw` is already the final offset.
  at(phase, cover, dir, raw = false) {
    this.cover = cover;
    this.offset = raw ? dir : dir * (HOLD + (1 - cover) * (1 - HOLD));
    if (phase !== this.phase) this.enter(phase);
  }

  enter(phase) {
    this.phase = phase;
    const { player, gameplay } = this.ctx;
    if (phase === 'puncak') {
      gameplay?.sentinels?.clearHostiles(); // the same call the respawn path uses to calm a patrol
      player.emit('notice', { text: 'Gerhana total — penjaga kehilangan jejakmu' });
      this.participated = true;
    } else if (phase === 'keluar') {
      player.emit('notice', { text: 'Piringan matahari mulai muncul kembali' });
    }
  }

  // World addons run before Wanted.update and Sentinels.update in the same surface frame, so
  // clearing the meter here keeps the patrol calm for the whole of totality without touching
  // anything private: mining heat and alert level simply never build while the star is hidden.
  blindSentinels() {
    this.ctx.gameplay?.wantedMeter?.reset();
  }

  // Debug: end the event on the next tick; PlanetEvents sees `done` and disposes us.
  skip() {
    this.done = true;
  }

  dispose() {
    this.shadow?.dispose();
    this.shadow = null;
    if (eclipseLink.event === this) eclipseLink.event = null;
  }
}
