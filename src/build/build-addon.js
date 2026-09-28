// Meta addon for base building: hands the save/HUD/input/flow to the world addon
// (src/build/hub.js), owns teleport travel, and adds a journal card listing your bases.
import { hub, bases } from './hub.js';
import { travelTo } from './travel.js';
import { ripe } from './base-life.js';
import { lockerCount } from './locker.js';
import { CraftAddon } from '../craft/craft-addon.js';
import { el } from '../ui/dom.js';

const count = (list, type) => list.filter((p) => p.type === type).length;

export class BuildAddon {
  constructor(wiring) {
    hub.wiring = wiring;
    hub.travel = (key) => travelTo(wiring, key);
    wiring.panel.sections.push({ journal: () => this.journal() });
  }

  update(input, wiring) {
    hub.input = input;
    if (!hub.openCraft) this.findCraft(wiring);
  }

  // The workbench piece opens the crafting panel the craft addon already owns.
  findCraft(wiring) {
    const craft = wiring.addons?.find((a) => a instanceof CraftAddon);
    if (craft) hub.openCraft = () => craft.open(hub.input);
  }

  journal() {
    const list = Object.values(bases());
    if (!list.length) return null;
    const total = list.reduce((n, b) => n + b.pieces.length, 0);
    const c = el('div', 'q-card');
    c.append(el('div', 'q-tag', `Markas · ${list.length} planet · ${total} bagian · Y di darat untuk membangun`));
    for (const b of list) c.append(this.line(b));
    return c;
  }

  line(b) {
    const p = b.pieces;
    const farms = p.filter((q) => q.type === 'kebun');
    const stored = p.filter((q) => q.type === 'loker').reduce((n, q) => n + lockerCount(q), 0);
    const extra = [
      farms.length && `${farms.length} kebun${farms.some((q) => ripe(q.data)) ? ' (siap panen)' : ''}`,
      count(p, 'kandang') && `${count(p, 'kandang')} kandang`,
      stored && `loker ${stored} barang`,
      count(p, 'teleport') && 'pad teleport',
    ].filter(Boolean).join(' · ');
    const line = el('div', 'q-line');
    line.append(el('span', 'q-goal', `${b.name}${extra ? ` · ${extra}` : ''}`), el('span', 'q-num', `${p.length} bagian`));
    return line;
  }
}
