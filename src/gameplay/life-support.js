// Suit life support + hazard protection drain, storms and G-key recharge.
const LIFE_DRAIN = 100 / 360;    // full tank lasts ~6 minutes
const HAZARD_DRAIN = 100 / 240;  // per hazard factor
const HAZARD_REGEN = 4;          // per second when the planet is benign
const EMPTY_DPS = 2.5;           // health loss per second when a system is empty
const LIFE_ITEMS = ['Oksigen', 'Karbon'];
const HAZARD_ITEMS = ['Natrium', 'Ferit'];
const LIFE_GAIN = 20, HAZARD_GAIN = 25;

// Number of simultaneous hazards on a planet (temperature, radiation, toxicity).
export function hazardFactors(planet) {
  const t = planet.temperature;
  return (t < -10 || t > 45 ? 1 : 0) + (planet.radiation >= 3 ? 1 : 0) + (planet.toxicity >= 3 ? 1 : 0);
}

export class LifeSupport {
  constructor(player, planet) {
    this.player = player;
    this.factors = hazardFactors(planet);
    this.stormy = typeof planet.weather === 'string' && planet.weather.includes('Badai');
    this.storm = false;
    this.stormT = this.nextStorm();
    this.dmg = { life: 0, hazard: 0 };
  }

  nextStorm() {
    return 60 + Math.random() * 60;
  }

  update(dt) {
    const suit = this.player.suit;
    this.tickStorm(dt);
    const stormMul = this.storm ? 2 : 1;
    suit.lifeSupport = Math.max(0, suit.lifeSupport - LIFE_DRAIN * dt);
    const hz = this.factors ? -HAZARD_DRAIN * this.factors * stormMul : HAZARD_REGEN;
    suit.hazard = Math.min(100, Math.max(0, suit.hazard + hz * dt));
    this.starve('life', suit.lifeSupport, dt, 'Kehabisan oksigen');
    this.starve('hazard', suit.hazard, dt, 'Paparan bahaya');
  }

  tickStorm(dt) {
    if (!this.stormy) return;
    this.stormT -= dt;
    if (this.stormT > 0) return;
    this.storm = !this.storm;
    this.stormT = this.storm ? 30 + Math.random() * 30 : this.nextStorm();
    this.player.emit('notice', { text: this.storm ? 'Badai datang! Perlindungan bahaya terkuras 2×' : 'Badai mereda' });
  }

  // Empty system hurts in 1-second chunks so the HUD gets discrete hits.
  starve(which, value, dt, cause) {
    if (value > 0 || this.player.dead) { this.dmg[which] = 0; return; }
    this.dmg[which] += EMPTY_DPS * dt;
    if (this.dmg[which] < EMPTY_DPS) return;
    this.player.damageSuit(this.dmg[which], cause);
    this.dmg[which] = 0;
  }

  // G key: refill whichever system is lower, using what's in the inventory.
  recharge() {
    const suit = this.player.suit;
    const order = suit.lifeSupport <= suit.hazard ? ['life', 'hazard'] : ['hazard', 'life'];
    for (const which of order) {
      const text = this.refill(which);
      if (text) return this.notice(text);
    }
    const full = suit.lifeSupport >= 100 && suit.hazard >= 100;
    this.notice(full ? 'Sistem suit penuh' : 'Butuh Oksigen/Karbon atau Natrium/Ferit');
  }

  refill(which) {
    const life = which === 'life', suit = this.player.suit;
    const field = life ? 'lifeSupport' : 'hazard';
    if (suit[field] >= 100) return null;
    const item = (life ? LIFE_ITEMS : HAZARD_ITEMS).find((n) => this.player.count(n) > 0);
    if (!item || !this.player.removeItem(item, 1)) return null;
    const gain = life ? LIFE_GAIN : HAZARD_GAIN;
    suit[field] = Math.min(100, suit[field] + gain);
    return `${life ? 'Penunjang hidup' : 'Perlindungan bahaya'} +${gain}% (−1 ${item})`;
  }

  notice(text) {
    this.player.emit('notice', { text });
  }
}
