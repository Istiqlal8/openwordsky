// World addon (src/gameplay/world-addons.js): this planet's legendary monster, and the link
// that lets the meta addon (riding, photo mode) reach the surface scene.
import { LegendHunt } from './legend-hunt.js';
import { worldLink } from './world-link.js';

export class LegendWorld {
  constructor(ctx) {
    this.ctx = ctx;
    this.legend = new LegendHunt(ctx);
    worldLink.ctx = ctx;
    worldLink.hunt = this.legend;
  }

  update(dt, alive) { this.legend.update(dt, alive); }

  dispose() {
    this.legend.dispose();
    if (worldLink.ctx === this.ctx) { worldLink.ctx = null; worldLink.hunt = null; }
  }
}
