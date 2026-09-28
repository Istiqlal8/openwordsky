// World addon (src/gameplay/world-addons.js): the duel event on this planet. The meta addon
// (src/duel/duel-meta.js) reaches it through duelWorld.
import { SurfaceDuel } from './surface-duel.js';
import { duelWorld } from './duel-link.js';

export class DuelWorld {
  constructor(ctx) {
    this.duel = new SurfaceDuel(ctx, {
      onDamage: (n, soaked) => duelWorld.onDamage?.(n, soaked),
      onState: () => duelWorld.onState?.(),
      onDefeat: (def, pos, where) => duelWorld.onDefeat?.(def, pos, where),
    });
  }

  update(dt, alive) { this.duel.update(dt, alive); }

  dispose() { this.duel.dispose(); }
}
