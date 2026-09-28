// Build-mode menu bar (bottom of the screen): category tabs, the pieces with key, name and
// cost, and the status line. Pure view: reports clicks through { pick(i), cat(i), op(name) }.
import { el, clear, show } from './dom.js';

const OPS = [['rotate', 'Putar'], ['paint', 'Warna'], ['remove', 'Hapus'], ['undo', 'Batal'], ['place', 'Pasang'], ['exit', 'Selesai']];

function costLine(cost) {
  const line = el('div', 'bd-cost');
  for (const c of cost) line.append(el('span', c.have >= c.n ? '' : 'is-short', `${c.label} ${Math.min(c.have, c.n)}/${c.n}`));
  return line;
}

export class BuildBar {
  constructor(root, on) {
    this.on = on;
    this.sig = '';
    this.root = el('div', 'panel bd-bar is-hidden');
    root.append(this.root);
  }

  show(on) { show(this.root, on); this.sig = ''; }

  // v = { title, status, bad, sel, cat, cats, items: [{ name, cost: [{ label, have, n }], ok }] }
  draw(v) {
    const sig = JSON.stringify(v);
    if (sig === this.sig) return;
    this.sig = sig;
    clear(this.root);
    const head = el('div', 'inv-head');
    head.append(el('div', 'panel-label', v.title),
      el('span', 'inv-hint', 'Y/Esc selesai · Q/E kategori · 1–0 pilih · R putar · C warna · Klik/T pasang · X hapus · Z batal'));
    const list = el('div', 'bd-list');
    v.items.forEach((it, i) => list.append(this.item(it, i, i === v.sel)));
    this.root.append(head);
    if (v.cat >= 0) this.root.append(this.tabs(v.cats, v.cat));
    this.root.append(list, el('div', `bd-status${v.bad ? ' is-bad' : ''}`, v.status), this.ops());
    list.querySelector('.is-sel')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  tabs(cats, active) {
    const bar = el('div', 'cr-tabs');
    cats.forEach((label, i) => {
      const b = el('button', `cr-tab${i === active ? ' is-on' : ''}`, label);
      b.addEventListener('click', () => this.on.cat(i));
      bar.append(b);
    });
    return bar;
  }

  item(it, i, selected) {
    const c = el('button', `bd-item${selected ? ' is-sel' : ''}${it.ok ? '' : ' is-locked'}`);
    c.append(el('span', 'bd-key', i < 10 ? String((i + 1) % 10) : ''), el('span', 'bd-name', it.name), costLine(it.cost));
    c.addEventListener('click', () => this.on.pick(i));
    return c;
  }

  ops() {
    const bar = el('div', 'bd-ops');
    for (const [id, label] of OPS) {
      const b = el('button', 'cr-btn', label);
      b.addEventListener('click', () => this.on.op(id));
      bar.append(b);
    }
    return bar;
  }
}
