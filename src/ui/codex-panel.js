// Galaxy collection book (L): recorded species, finished planets and endemic items, with tabs.
import { el, clear, show } from './dom.js';

export const TABS = [
  { id: 'all', label: 'Semua' }, { id: 'fauna', label: 'Fauna' }, { id: 'flora', label: 'Flora' },
  { id: 'planets', label: 'Planet' }, { id: 'endemic', label: 'Khas' }, { id: 'trofi', label: 'Trofi' },
];
const TITLES = { fauna: 'Spesies fauna', flora: 'Spesies flora', planets: 'Planet tuntas', endemic: 'Benda khas planet' };
const EMPTY = { fauna: 'Pindai hewan (F).', flora: 'Panen tumbuhan.', planets: 'Tuntaskan koleksi planet (J).', endemic: 'Cari benda khas planet.' };
const date = (t) => new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

function row(item) {
  const r = el('div', `cx-row${item.relic ? ' is-relic' : ''}`);
  r.append(el('span', 'cx-name', item.name));
  const sub = [item.sub, item.owned ? `×${item.owned}` : '', item.at ? date(item.at) : ''].filter(Boolean).join(' · ');
  if (sub) r.append(el('span', 'cx-sub', sub));
  return r;
}

function section(id, items) {
  const c = el('div', 'q-card cx-card');
  c.append(el('div', 'q-tag', `${TITLES[id]} · ${items.length}`));
  if (!items.length) { c.append(el('div', 'cx-empty', EMPTY[id])); return c; }
  const list = el('div', 'cx-list');
  for (const it of items) list.append(row(it));
  c.append(list);
  return c;
}

function stats(d) {
  const box = el('div', 'cx-stats');
  const add = (n, label) => { const s = el('div', 'cx-stat'); s.append(el('b', '', n), el('span', '', label)); box.append(s); };
  add(d.planets.length, 'Planet tuntas');
  add(d.fauna.length, 'Fauna');
  add(d.flora.length, 'Flora');
  add(d.endemic.length, 'Benda khas');
  return box;
}

export class CodexPanel {
  constructor(root) {
    this.node = el('div', 'panel cx-book is-hidden');
    this.tab = 'all';
    this.onTab = null; // (id) => void, set by the owner to redraw
    this.extra = {};   // tab id -> () => Node, tabs drawn by other addons (achievements)
    root.append(this.node);
    // Number keys pick a tab; a DOM listener so it also works while the game is paused (Esc).
    addEventListener('keydown', (e) => {
      const i = Number(e.code.replace('Digit', '')) - 1;
      if (this.isOpen && TABS[i]) this.onTab?.(TABS[i].id);
    });
  }

  get isOpen() { return !this.node.classList.contains('is-hidden'); }
  toggle() { show(this.node, !this.isOpen); }

  draw(data) {
    const top = this.drawn === this.tab ? this.node.querySelector('.cx-body')?.scrollTop ?? 0 : 0;
    this.drawn = this.tab;
    clear(this.node);
    const head = el('div', 'inv-head');
    head.append(el('div', 'panel-label', 'Buku Koleksi Galaksi'), el('span', 'inv-hint', 'L tutup · 1-6 filter · Esc klik'));
    const body = el('div', 'cx-body');
    this.node.append(head, stats(data), this.tabs(), body);
    const ids = this.tab === 'all' ? ['planets', 'endemic', 'fauna', 'flora'] : [this.tab];
    if (this.extra[this.tab]) body.append(this.extra[this.tab]());
    else for (const id of ids) body.append(section(id, data[id]));
    body.scrollTop = top;
  }

  tabs() {
    const bar = el('div', 'cx-tabs');
    TABS.forEach((t, i) => {
      const b = el('button', `cx-tab${t.id === this.tab ? ' is-on' : ''}`, `${i + 1} ${t.label}`);
      b.addEventListener('click', () => this.onTab?.(t.id));
      bar.append(b);
    });
    return bar;
  }
}
