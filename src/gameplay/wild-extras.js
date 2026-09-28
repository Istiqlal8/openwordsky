// World addon bundling rare wildlife variants, night/storm flora and random planet events.
// Debug handle: surfaceMode.gameplay.addons.find((a) => a.events) -> { rare, flora, events }.
import { RareWildlife } from './rare-wildlife.js';
import { NightFlora } from './night-flora.js';
import { PlanetEvents } from '../events/planet-events.js';

export class WildExtras {
  constructor(ctx) {
    this.rare = new RareWildlife(ctx);
    this.flora = new NightFlora(ctx);
    this.events = new PlanetEvents(ctx);
    this.parts = [this.rare, this.flora, this.events];
  }

  update(dt, alive) {
    for (const p of this.parts) p.update(dt, alive);
  }

  dispose() {
    for (const p of this.parts) p.dispose();
    this.parts = [];
  }
}
