// Small HUD strip of active food buffs (icon + seconds left), bottom-left beside the vitals.
import { el, clear, show } from './dom.js';

export class BuffBar {
  constructor(root) {
    this.root = el('div', 'buff-bar is-hidden');
    this.sig = '';
    root.append(this.root);
  }

  // list: [{ id, icon, name, left }]
  draw(list) {
    const sig = list.map((b) => `${b.id}:${b.left}`).join(',');
    if (sig === this.sig) return;
    this.sig = sig;
    show(this.root, list.length > 0);
    clear(this.root);
    for (const b of list) {
      const chip = el('div', `buff buff-${b.id}${b.left <= 10 ? ' is-ending' : ''}`);
      chip.title = b.name;
      chip.append(el('span', 'buff-icon', b.icon), el('span', 'buff-left', fmt(b.left)));
      this.root.append(chip);
    }
  }
}

function fmt(s) {
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
}
