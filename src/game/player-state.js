// Player + ship vitals and inventory. Gameplay modules mutate it; HUD reads it.
const MAX = 100;
const SHIELD_DELAY = 3;

export class PlayerState {
  constructor(saved = {}) {
    this.ship = { hull: MAX, shield: MAX, energy: MAX, ...saved.ship };
    this.suit = { health: MAX, lifeSupport: MAX, hazard: MAX, ...saved.suit };
    this.inventory = { ...saved.inventory };
    this.pet = saved.pet ?? null; // tamed creature, re-spawned on every landing
    this.upgrades = { ...saved.upgrades }; // crafted suit/tool tiers, see src/craft/upgrades.js
    this.listeners = {};
    this.sinceShipHit = 99;
    this.dead = false;
  }

  on(event, cb) {
    (this.listeners[event] ??= []).push(cb);
  }

  emit(event, data) {
    for (const cb of this.listeners[event] ?? []) cb(data);
  }

  // Shield soaks damage first. Emits 'shipDestroyed' once when hull hits 0.
  damageShip(amount) {
    if (this.dead) return;
    this.sinceShipHit = 0;
    const soaked = Math.min(this.ship.shield, amount);
    this.ship.shield -= soaked;
    this.ship.hull = Math.max(0, this.ship.hull - (amount - soaked));
    this.emit('shipHit', { shield: soaked > 0 });
    if (this.ship.hull <= 0) this.die('shipDestroyed');
  }

  damageSuit(amount, cause = 'Cedera') {
    if (this.dead) return;
    this.suit.health = Math.max(0, this.suit.health - amount);
    this.emit('suitHit', { cause });
    if (this.suit.health <= 0) this.die('playerDied', cause);
  }

  die(event, cause) {
    this.dead = true;
    this.emit(event, { cause });
  }

  useEnergy(amount) {
    if (this.ship.energy < amount) return false;
    this.ship.energy -= amount;
    return true;
  }

  addItem(name, n = 1) {
    this.inventory[name] = (this.inventory[name] ?? 0) + n;
    this.emit('item', { name, n, total: this.inventory[name] });
  }

  removeItem(name, n = 1) {
    if ((this.inventory[name] ?? 0) < n) return false;
    this.inventory[name] -= n;
    if (!this.inventory[name]) delete this.inventory[name];
    return true;
  }

  count(name) { return this.inventory[name] ?? 0; }

  // Passive regen: shield after a pause, a trickle of energy.
  tickShip(dt) {
    this.sinceShipHit += dt;
    if (this.sinceShipHit > SHIELD_DELAY) this.ship.shield = Math.min(MAX, this.ship.shield + dt * 12);
    this.ship.energy = Math.min(MAX, this.ship.energy + dt * 2.5);
  }

  respawn(loseFraction = 0.5) {
    this.dead = false;
    this.ship = { hull: MAX, shield: MAX, energy: Math.max(40, this.ship.energy) };
    this.suit = { health: MAX, lifeSupport: MAX, hazard: MAX };
    for (const k of Object.keys(this.inventory)) {
      this.inventory[k] = Math.floor(this.inventory[k] * (1 - loseFraction));
      if (!this.inventory[k]) delete this.inventory[k];
    }
    this.emit('respawn');
  }

  toJSON() {
    return { ship: this.ship, suit: this.suit, inventory: this.inventory, pet: this.pet, upgrades: this.upgrades };
  }
}

export const VITAL_MAX = MAX;
