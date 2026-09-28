// Achievements: counts progress, shows the unlock banner (+ sfx + Nanit). The list lives in the
// collection book (L) as the "Trofi" tab.
import { AchieveTracker } from './achieve-tracker.js';
import { AchieveBanner, achieveBody } from './achieve-view.js';
import { REWARD } from './achieve-defs.js';

const CHECK_EVERY = 500; // ms between progress checks (derived counts: Nanit, catalog, ...)

export class AchieveAddon {
  constructor(w) {
    this.w = w;
    this.tracker = new AchieveTracker(w.log, w.save, w.player);
    this.banner = new AchieveBanner(w.hud.root);
    this.last = 0;
    this.linked = false;
    this.tracker.checkSystem();
    if (this.tracker.fresh) this.catchUp();
  }

  // An older save meets many goals at once: pay them quietly with one summary toast.
  catchUp() {
    const got = this.tracker.evaluate();
    if (!got.length) return;
    this.pay(got);
    this.w.hud.toast(`${got.length} trofi terbuka dari petualangan sebelumnya (L · Trofi)`);
  }

  pay(defs) {
    const n = defs.reduce((sum, d) => sum + REWARD[d.medal], 0);
    this.w.log.granting = true; // reward Nanit is not a quest "item" pickup
    this.w.player.addItem('Nanit', n);
    this.w.log.granting = false;
  }

  // The collection book is another addon; hook the tab once every addon exists.
  link(addons) {
    this.linked = true;
    const guide = addons.find((a) => a.codex?.extra);
    if (guide) guide.codex.extra.trofi = () => achieveBody(this.tracker.list());
  }

  arrived(planet) {
    this.tracker.arrived(planet);
    this.check(true);
  }

  update(input, w) {
    if (!this.linked) this.link(w.addons);
    this.check(false);
  }

  check(force) {
    const now = performance.now();
    if (!force && !this.tracker.dirty && now - this.last < CHECK_EVERY) return;
    this.last = now;
    const got = this.tracker.evaluate();
    if (!got.length) return;
    this.pay(got);
    for (const def of got) this.banner.push(def);
    this.w.sfx.discover?.();
    this.w.log.version++; // redraws the book
  }
}
