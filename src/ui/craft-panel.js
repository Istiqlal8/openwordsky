// Workbench + market panel (U). Pure view: draws the rows the craft addon hands it and reports
// clicks back through callbacks { select(i), act(i, all), tab(id) }.
import { el, clear, show } from './dom.js';
import { resourceIcon } from './inventory.js';

const TABS = [['craft', 'Racik'], ['cook', 'Dapur'], ['ship', 'Pesawat'], ['market', 'Pasar']];

function pips(tier, max) {
  const p = el('span', 'cr-pips');
  for (let i = 0; i < max; i++) p.append(el('i', i < tier ? 'is-on' : ''));
  return p;
}

function costLine(cost) {
  const line = el('div', 'cr-cost');
  for (const c of cost) {
    const chip = el('span', `cr-chip${c.have >= c.n ? '' : ' is-short'}`, `${c.label} ${Math.min(c.have, c.n)}/${c.n}`);
    if (c.hint) chip.title = c.hint;
    line.append(chip);
  }
  return line;
}

export class CraftPanel {
  constructor(root, on) {
    this.on = on;
    this.root = el('div', 'panel cr-panel is-hidden');
    root.append(this.root);
  }

  get isOpen() { return !this.root.classList.contains('is-hidden'); }
  show(on) { show(this.root, on); }

  draw(v) {
    clear(this.root);
    const head = el('div', 'inv-head');
    head.append(el('div', 'panel-label', 'Bengkel & Pasar'), el('span', 'inv-hint', 'U tutup · ←→ tab · ↑↓ / 1–9 pilih · Enter'));
    const info = el('div', 'cr-info');
    info.append(el('span', 'cr-nanit', `${v.nanit} Nanit`), el('span', '', v.place));
    const list = el('div', 'cr-list');
    v.rows.forEach((r, i) => {
      if (r.head) list.append(el('div', 'cr-head', r.head));
      list.append(this.row(r, i, v.sel === i));
    });
    if (!v.rows.length) list.append(el('div', 'q-text', 'Tas kosong.'));
    this.root.append(head, this.tabs(v.tab), info, list);
    list.querySelector('.is-sel')?.scrollIntoView?.({ block: 'nearest' });
  }

  tabs(active) {
    const bar = el('div', 'cr-tabs');
    for (const [id, label] of TABS) {
      const b = el('button', `cr-tab${id === active ? ' is-on' : ''}`, label);
      b.addEventListener('click', () => this.on.tab(id));
      bar.append(b);
    }
    return bar;
  }

  row(r, i, selected) {
    const c = el('div', `q-card cr-row${selected ? ' is-sel' : ''}${r.ok ? '' : ' is-locked'}`);
    c.addEventListener('click', () => this.on.select(i));
    const top = el('div', 'cr-top');
    if (i < 9) top.append(el('span', 'cr-key', String(i + 1)));
    if (r.count !== undefined || r.buy) top.append(resourceIcon(r.title.replace(/^\d+ /, '')));
    top.append(el('span', 'q-title', r.count !== undefined ? `${r.title} ×${r.count}` : r.title));
    if (r.max) top.append(pips(r.tier, r.max));
    if (r.price !== undefined) top.append(el('span', `cr-price${r.bonus ? ' is-bonus' : ''}`, `${r.price} N${r.buy ? '' : '/bh'}`));
    c.append(top);
    if (r.sub) c.append(el('div', 'cr-sub', r.sub));
    if (r.cost?.length) c.append(costLine(r.cost));
    c.append(this.buttons(r, i));
    return c;
  }

  buttons(r, i) {
    const bar = el('div', 'cr-btns');
    const add = (label, all) => {
      if (!label) return;
      const b = el('button', 'cr-btn', label);
      b.disabled = !r.ok;
      b.addEventListener('click', (e) => { e.stopPropagation(); this.on.act(i, all); });
      bar.append(b);
    };
    add(r.button, false);
    add(r.button2, true);
    return bar;
  }
}
