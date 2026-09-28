// Sentinel alert level 0..5: mining heat and aggression raise it, calm lowers it.
const MAX = 5;
const ITEMS_PER_LEVEL = 8;
const HEAT_DECAY = 0.25;   // items forgotten per second (the "short window")
const CALM_DELAY = 30;     // seconds without offences before the level drops
const STEP_DOWN = 10;      // seconds between further drops

export class Wanted {
  constructor() {
    this.reset();
  }

  reset() {
    this.level = 0;
    this.heat = 0;
    this.calm = 0;
  }

  // Harvested items feed heat; every ITEMS_PER_LEVEL raises the level by one.
  mined(n) {
    this.calm = 0;
    this.heat += n;
    while (this.heat >= ITEMS_PER_LEVEL) {
      this.heat -= ITEMS_PER_LEVEL;
      this.raise(1);
    }
  }

  raise(n) {
    this.calm = 0;
    this.level = Math.min(MAX, this.level + n);
  }

  // At least `min` (e.g. after shooting a sentinel).
  atLeast(min) {
    this.calm = 0;
    this.level = Math.max(this.level, Math.min(MAX, min));
  }

  update(dt) {
    this.heat = Math.max(0, this.heat - HEAT_DECAY * dt);
    if (this.level === 0) return;
    this.calm += dt;
    if (this.calm < CALM_DELAY) return;
    this.level--;
    this.calm = CALM_DELAY - STEP_DOWN;
  }
}
