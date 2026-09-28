// World addon (src/gameplay/world-addons.js): the boss that lairs on this planet.
// The meta addon (src/raid/raid-meta.js) reaches it through raidWorld.
import { SurfaceRaid } from './surface-raid.js';
import { raidWorld } from './raid-world-link.js';

export class RaidWorld {
  constructor(ctx) {
    this.raid = new SurfaceRaid(ctx, {
      onDamage: (n, ref, soaked) => raidWorld.onDamage?.(n, ref, soaked),
      onPhase: () => raidWorld.onState?.(),
      onDefeat: (def, bonus) => raidWorld.onDefeat?.(def, bonus),
      onState: () => raidWorld.onState?.(),
    });
  }

  update(dt, alive) { this.raid.update(dt, alive); }

  dispose() { this.raid.dispose(); }
}
