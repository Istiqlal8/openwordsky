// Detail pane of the inventory: what the selected item is, where it comes from, use buttons.
import { el, clear, show } from './dom.js';
import { itemInfo, ACTIONS } from '../items/catalog.js';

export class InventoryDetail {
  constructor(parent, onUse) {
    this.onUse = onUse; // (name, actionId) => toast text
    this.box = el('div', 'inv-detail is-hidden');
    parent.append(this.box);
    this.name = null;
  }

  select(name, count) {
    this.name = name;
    clear(this.box);
    show(this.box, true);
    const info = itemInfo(name);
    const head = el('div', 'inv-d-head');
    head.append(el('span', 'inv-d-name', name), el('span', 'inv-d-cat', info.cat), el('span', 'inv-d-count', `×${Math.round(count)}`));
    this.box.append(head, el('div', 'inv-d-desc', info.desc));
    this.box.append(this.row('Didapat dari', info.source), this.row('Kegunaan', info.use));
    if (info.actions.length) this.box.append(this.buttons(name, info.actions));
    this.status = el('div', 'inv-d-status');
    this.box.append(this.status);
  }

  row(label, text) {
    const r = el('div', 'inv-d-row');
    r.append(el('span', 'inv-d-key', label), el('span', 'inv-d-val', text));
    return r;
  }

  buttons(name, actions) {
    const box = el('div', 'inv-d-actions');
    for (const a of actions) {
      const b = el('button', 'btn inv-d-btn', ACTIONS[a]);
      b.type = 'button';
      b.addEventListener('click', () => { this.status.textContent = this.onUse(name, a); });
      box.append(b);
    }
    return box;
  }

  // Close when the item ran out.
  refresh(inventory) {
    if (!this.name) return;
    if (!(inventory[this.name] > 0)) { show(this.box, false); this.name = null; return; }
    const c = this.box.querySelector('.inv-d-count');
    if (c) c.textContent = `×${Math.round(inventory[this.name])}`;
  }
}
