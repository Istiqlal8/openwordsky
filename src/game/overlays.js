// Full-screen overlays (hangar, shipyard) that pause play and return to the mode they came from.
import { loadCustom, saveCustom, clearActiveSpec } from '../ui/shipyard/shipyard-store.js';

export class Overlays {
  // ctx: { input, sfx, setMode, getMode, hangar, save, onShip(design, spec?) }
  constructor(ctx) {
    this.ctx = ctx;
    this.back = 'space';
    this.shipyard = null; // set by main once the DIY shipyard exists
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
