// Journal card for legendary monsters: defeated trophies, sightings and a hint to the
// nearest planet where a living legend roams. Progress lives in the save (log.s.legend).
import { el } from '../ui/dom.js';
import { bar } from '../ui/quest-panel.js';
import { LEGENDS, LEGEND_IDS } from './legend-data.js';
import { bindLegendStore, legendState, onLegendChange, defeatedIds } from './legend-store.js';
import { nearestLegend } from './legend-finder.js';

export class LegendJournal {
  constructor(wiring) {
    this.save = wiring.save;
    this.log = wiring.log;
    this.log.s.legend ??= { defeated: {}, seen: {} };
    bindLegendStore(this.log.s.legend);
    onLegendChange(() => this.log.version++);
  }

  hint() {
    const save = this.save;
    if (save?.galaxySeed === undefined || save.systemIndex === undefined) return null;
    const n = Object.keys(legendState().defeated).length;
    const f = nearestLegend(save.galaxySeed, save.systemIndex, n);
    if (!f) return 'Belum ada kabar monster legendaris di sekitar sini.';
    const where = f.rank === 0 ? 'di sistem ini' : `di sistem ${f.system.name}, ${f.ly.toFixed(1)} tahun cahaya`;
    return `${f.def.name} terlihat di planet ${f.def.where} ${f.planet.name} (${where}).`;
  }

  card() {
    const st = legendState(), beaten = defeatedIds();
    const c = el('div', 'q-card is-legend');
    c.append(el('div', 'q-tag', `Monster Legendaris · ${beaten.size}/${LEGEND_IDS.length} ditaklukkan`));
    c.append(bar(beaten.size, LEGEND_IDS.length));
    for (const id of LEGEND_IDS) {
      const def = LEGENDS[id];
      if (beaten.has(id)) c.append(el('div', 'q-text', `✓ ${def.name} · Trofi Legendaris`));
      else if (st.seen[id]) c.append(el('div', 'q-text', `${def.name} · terlihat di ${st.seen[id]}`));
    }
    const h = this.hint();
    if (h) c.append(el('div', 'q-reward', h));
    return c;
  }
}
