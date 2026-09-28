// Surface world addon (src/gameplay/world-addons.js): publishes the live gameplay ctx so the
// mech meta addon can walk the mech on this planet. Holds no scene objects of its own.
import { mechLink } from './mech-link.js';

export class MechWorld {
  constructor(ctx) {
    this.ctx = ctx;
    mechLink.ctx = ctx;
  }

  update() {}

  dispose() {
    if (mechLink.ctx === this.ctx) mechLink.ctx = null;
    this.ctx = null;
  }
}
