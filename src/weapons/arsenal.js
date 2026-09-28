// Owned weapons, the equipped one, and buying with Nanit. Lives for the whole session;
// attachSave(save) loads/stores save.weapons + save.equipped (written by the game's persist()).
import { WEAPONS, DEFAULT_WEAPON, weaponById } from './catalog.js';
import { loadOwned, saveOwned, loadEquipped, saveEquipped } from './weapon-save.js';

export const CURRENCY = 'Nanit';

export class Arsenal {
  constructor() {
    this.save = null;
    this.list = [DEFAULT_WEAPON];
    this.current = DEFAULT_WEAPON;
    this.onChange = null; // optional () => void, e.g. persist after a purchase
  }

  attachSave(save) {
    this.save = save;
    this.list = loadOwned(save);
    this.current = loadEquipped(save, this.list);
  }

  // Owned ids in catalog order (slot 1 = Multitool).
  get owned() { return WEAPONS.filter((w) => this.list.includes(w.id)).map((w) => w.id); }
  get equipped() { return this.current; }
  get weapon() { return weaponById(this.current); }

  isOwned(id) { return this.list.includes(id); }

  equip(id) {
    if (!this.isOwned(id) || id === this.current) return false;
    this.current = id;
    saveEquipped(this.save, id);
    this.onChange?.();
    return true;
  }

  // Slot n (1-based) among owned weapons.
  equipSlot(n) {
    const id = this.owned[n - 1];
    return id ? this.equip(id) : false;
  }

  // Cycle through owned weapons (+1 / -1).
  cycle(dir) {
    const ids = this.owned, i = ids.indexOf(this.current);
    return this.equip(ids[(i + dir + ids.length) % ids.length]);
  }

  // -> { ok: true } | { ok: false, reason } ; takes Nanit from the player on success.
  buy(id, player) {
    const w = weaponById(id);
    if (!w) return { ok: false, reason: 'Senjata tidak dikenal' };
    if (this.isOwned(id)) return { ok: false, reason: 'Sudah dimiliki' };
    if (!player?.removeItem(CURRENCY, w.price)) return { ok: false, reason: `Butuh ${w.price} ${CURRENCY}` };
    this.list.push(id);
    saveOwned(this.save, this.list);
    this.onChange?.();
    return { ok: true };
  }
}
