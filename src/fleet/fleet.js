// Ownership of the player's capital ship. The spec lives in save.freighter; when it is set the
// player's own "Kapal Induk" replaces the system freighter in every system they visit.
import { writeSave } from '../state.js';
import { normalizeSpec, specStats, buildCost, archetypeLabel } from './fleet-spec.js';

export const CURRENCY = 'Nanit';

export class Fleet {
  constructor(save) {
    this.save = save ?? {};
    this.spec = this.save.freighter ? normalizeSpec(this.save.freighter) : null;
  }

  // { spec } while the player owns a capital ship, otherwise null.
  get owned() {
    return this.spec ? { spec: this.spec } : null;
  }

  get isOwned() { return Boolean(this.spec); }

  // The descriptor Freighter.mountOwned()/mount(system, spec) renders, or null.
  design() {
    return this.spec ? { ...this.spec } : null;
  }

  // Spend `price` Nanit and take ownership. Returns { ok, reason?, spec? }.
  buy(player, spec, price) {
    const cost = Math.max(0, Math.round(Number(price) || 0));
    if (!player) return { ok: false, reason: 'Pemain tidak ada' };
    if (player.count(CURRENCY) < cost) return { ok: false, reason: `Nanit kurang (${cost.toLocaleString('id-ID')})` };
    if (cost && !player.removeItem(CURRENCY, cost)) return { ok: false, reason: 'Pembayaran gagal' };
    return { ok: true, spec: this.set(spec), cost };
  }

  // Take ownership without charging (shop already billed, or the yard rebuilds an owned hull).
  set(spec) {
    this.spec = normalizeSpec(spec);
    this.save.freighter = { ...this.spec };
    writeSave(this.save);
    return { ...this.spec };
  }

  clear() {
    this.spec = null;
    delete this.save.freighter;
    writeSave(this.save);
  }

  // Shop/HUD summary of what is owned: name, class label, stats and what it cost to build.
  summary() {
    if (!this.spec) return null;
    return { name: this.spec.name, label: archetypeLabel(this.spec), stats: specStats(this.spec), value: buildCost(this.spec) };
  }

  affords(player, price) {
    return (player?.count(CURRENCY) ?? 0) >= Math.max(0, Math.round(Number(price) || 0));
  }
}
