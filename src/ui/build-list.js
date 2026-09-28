// Small list panel used by base stations (locker, teleport pad). Pure view: it draws the rows
// it is given and reports clicks through { pick(i, all), close() }.
import { el, clear, show } from './dom.js';

export class BuildList {
  constructor(root, on) {
    this.on = on;
    this.sig = '';
    this.root = el('div', 'panel bd-list-panel is-hidden');
    root.append(this.root);
  }

  get isOpen() { return !this.root.classList.contains('is-hidden'); }

  show(on) {
    show(this.root, on);
    this.sig = '';
  }

  // v = { title, hint, note, sel, rows: [{ head, label, right, sub, ok }] }
  draw(v) {
    const sig = JSON.stringify(v);
    if (sig === this.sig) return;
    this.sig = sig;
    clear(this.root);
    const head = el('div', 'inv-head');
    head.append(el('div', 'panel-label', v.title), el('span', 'inv-hint', v.hint));
    this.root.append(head);
    if (v.note) this.root.append(el('div', 'cr-sub', v.note));
    const list = el('div', 'cr-list');
    v.rows.forEach((r, i) => {
      if (r.head) list.append(el('div', 'cr-head', r.head));
      list.append(this.row(r, i, i === v.sel));
    });
    if (!v.rows.length) list.append(el('div', 'q-text', 'Kosong.'));
    this.root.append(list);
  }

  row(r, i, selected) {
    const c = el('div', `q-card cr-row${selected ? ' is-sel' : ''}${r.ok === false ? ' is-locked' : ''}`);
    const top = el('div', 'cr-top');
    if (i < 9) top.append(el('span', 'cr-key', String(i + 1)));
    top.append(el('span', 'q-title', r.label));
    if (r.right) top.append(el('span', 'cr-price', r.right));
    c.append(top);
    if (r.sub) c.append(el('div', 'cr-sub', r.sub));
    c.addEventListener('click', (e) => this.on.pick(i, e.shiftKey));
    return c;
  }
}
