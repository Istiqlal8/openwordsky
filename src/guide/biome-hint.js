// Journal hint for story goals "land on a <biome> planet": where the nearest one is.
import { el } from '../ui/dom.js';
import { nearestBiome } from './biome-finder.js';

export class BiomeHint {
  constructor(wiring) {
    this.wiring = wiring;
    this.key = '';
    this.text = null;
  }

  // Recompute only when the story goal or the current system changes.
  update() {
    const { log, save } = this.wiring, goal = log.story?.goal;
    const biome = goal?.type === 'land' && goal.biome ? goal.biome : null;
    const key = biome ? `${save.systemIndex}:${biome}` : '';
    if (key === this.key) return;
    this.key = key;
    this.text = biome ? this.describe(nearestBiome(save.galaxySeed, save.systemIndex, biome), biome) : null;
    log.version++;
  }

  describe(hit, biome) {
    if (!hit) return `Belum ada planet ${biome} di dekat sini.`;
    const kind = hit.planet.biome.label.toLowerCase();
    const where = hit.rank === 0 ? 'di sistem ini' : `sistem ${hit.system.name} · ${hit.ly.toFixed(1)} ly`;
    return `Planet ${kind} terdekat: ${hit.planet.name} · ${where}`;
  }

  journal() {
    if (!this.text) return null;
    const c = el('div', 'q-card gd-hint');
    c.append(el('div', 'q-tag', 'Petunjuk · peta (M)'), el('div', 'q-text', this.text));
    return c;
  }
}
