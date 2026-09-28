// Full-screen overlays (hangar, shipyard) that pause play and return to the mode they came from.
import { loadCustom, saveCustom, clearActiveSpec } from '../ui/shipyard/shipyard-store.js';
import { WeaponStore } from '../ui/store/weapon-store.js';

export class Overlays {
  // ctx: { input, sfx, setMode, getMode, hangar, save, player, hud, persist, onShip(design, spec?) }
  constructor(ctx) {
    this.ctx = ctx;
    this.back = 'space';
    this.shipyard = null; // set by main once the DIY shipyard exists
    this.store = new WeaponStore();
  }

  open(mode) {
    const { input, sfx, setMode, getMode } = this.ctx;
    this.back = getMode();
    input.unlock();
    sfx.setEngine(0);
    setMode(mode);
  }

  resume() {
    const { input, setMode } = this.ctx;
    input.justPressed.clear();
    setMode(this.back);
    input.lock();
  }

  hangar(current) {
    this.open('hangar');
    const onPick = (d) => { clearActiveSpec(this.ctx.save); this.ctx.onShip(d, null); };
    this.ctx.hangar.open({ current: current.seed, onPick, onClose: () => this.resume() });
  }

  // Doors of the Earth home base.
  baseAction(act, design) {
    const { player, hud, persist } = this.ctx;
    if (act === 'hangar') this.hangar(design);
    else if (act === 'shipyard') this.openShipyard(design);
    else if (act === 'store') this.openStore();
    else if (act === 'rest') {
      Object.assign(player.suit, { health: 100, lifeSupport: 100, hazard: 100 });
      hud.toast('Istirahat di rumah: suit pulih');
      persist();
    }
  }

  // Weapon shop (home base Toko, freighter trade terminal).
  openStore() {
    const { player, arsenal, persist } = this.ctx;
    this.open('hangar');
    this.store.open({ player, owned: arsenal.owned,
      onBuy: (id) => { const r = arsenal.buy(id, player); if (r.ok) { arsenal.equip(id); persist(); } return r; },
      onClose: () => this.resume() });
  }

  openShipyard(current) {
    if (!this.shipyard) return;
    this.open('hangar');
    const save = this.ctx.save;
    this.shipyard.open({
      current, slots: loadCustom(save),
      onSave: (d, spec, slot) => { saveCustom(save, spec, slot); this.ctx.onShip(d, spec); },
      onClose: () => this.resume(),
    });
  }
}
