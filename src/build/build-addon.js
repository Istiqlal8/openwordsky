// Meta addon for base building: hands the save/HUD/input to the world addon (src/build/hub.js)
// and adds a journal card listing every base the player has claimed.
import { hub, bases } from './hub.js';
import { ripe } from './base-life.js';
import { el } from '../ui/dom.js';

const count = (list, type) => list.filter((p) => p.type === type).length;

export class BuildAddon {
  constructor(wiring) {
    hub.wiring = wiring;
    wiring.panel.sections.push({ journal: () => this.journal() });
  }

  update(input) { hub.input = input; }

  journal() {
    const list = Object.values(bases());
    if (!list.length) return null;
    const c = el('div', 'q-card');
    c.append(el('div', 'q-tag', `Markas · ${list.length} planet · Y di darat untuk membangun`));
    for (const b of list) c.append(this.line(b));
    return c;
  }

  line(b) {
    const p = b.pieces;
    const farms = p.filter((q) => q.type === 'kebun'), pens = count(p, 'kandang');
    const extra = [farms.length && `${farms.length} kebun${farms.some((q) => ripe(q.data)) ? ' (siap panen)' : ''}`,
      pens && `${pens} kandang`].filter(Boolean).join(' · ');
    const line = el('div', 'q-line');
    line.append(el('span', 'q-goal', `${b.name}${extra ? ` · ${extra}` : ''}`), el('span', 'q-num', `${p.length} bagian`));
    return line;
  }
}
