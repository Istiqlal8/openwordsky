// Counts quest-log records (acts, items, clears) and unlocks achievements. State: log.s.achieve.
import { systemAt } from '../gen/galaxy.js';
import { ACHIEVEMENTS, ITEM_FLAGS } from './achieve-defs.js';

const COUNTED_ITEMS = new Set(Object.keys(ITEM_FLAGS));

export class AchieveTracker {
  constructor(log, save, player) {
    Object.assign(this, { log, save, player });
    this.fresh = !log.s.achieve; // first run on this save: old progress unlocks quietly
    this.s = (log.s.achieve ??= { got: {}, c: {}, f: {}, biomes: {} });
    this.dirty = true;
    log.watchers.push((type, data) => this.record(type, data));
  }

  record(type, data = {}) {
    if (type === 'item') { this.item(data.item); return; }
    this.s.c[type] = (this.s.c[type] ?? 0) + (Number(data.n) > 0 ? Number(data.n) : 1);
    if (type === 'land' && data.biome) this.s.biomes[data.biome] = 1;
    if (type === 'warp') this.checkSystem();
    this.dirty = true;
  }

  item(name) {
    if (!COUNTED_ITEMS.has(name)) return;
    this.flag(ITEM_FLAGS[name]);
  }

  flag(name) {
    if (this.s.f[name]) return;
    this.s.f[name] = 1;
    this.dirty = true;
  }

  arrived(planet) {
    if (planet?.golden) this.flag('golden');
  }

  checkSystem() {
    const sys = systemAt(this.save.galaxySeed, this.save.systemIndex);
    if (sys?.star?.blackHole) this.flag('blackhole');
  }

  ctx() {
    return { c: this.s.c, f: this.s.f, biomes: Object.keys(this.s.biomes).length, log: this.log, save: this.save, player: this.player };
  }

  // Current progress for every achievement: [{ def, value, got }].
  list() {
    const x = this.ctx();
    return ACHIEVEMENTS.map((def) => ({ def, value: Math.min(def.goal, safe(def, x)), got: this.s.got[def.id] ?? null }));
  }

  // Unlocks everything whose goal is met; returns the newly unlocked definitions.
  evaluate() {
    this.dirty = false;
    const x = this.ctx(), out = [];
    for (const def of ACHIEVEMENTS) {
      if (this.s.got[def.id] || safe(def, x) < def.goal) continue;
      this.s.got[def.id] = Date.now();
      out.push(def);
    }
    return out;
  }

  get count() { return Object.keys(this.s.got).length; }
}

function safe(def, x) {
  try { return Number(def.value(x)) || 0; } catch { return 0; }
}
