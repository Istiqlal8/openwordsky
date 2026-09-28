// The "cari material" pane inside the galaxy map panel: browse or filter every material the
// galaxy can be searched for, pick one, and the map focuses the nearest system that has it — so
// the Warp button is one click away. Reads nothing; the caller owns the hunt state.
import { el, clear, show } from './dom.js';
import { SEARCH_GROUPS } from '../prospect/prospect-yield.js';
import { hunt } from '../prospect/prospect-hunt.js';

export class ProspectSearch {
  // onPick(name) -> hit | null; the caller runs the search and focuses the map.
  constructor(parent, { onPick }) {
    this.onPick = onPick;
    this.open_ = false;
    this.root = el('div', 'psearch is-hidden');
    this.filter = el('input', 'psearch-filter');
    this.filter.type = 'search';
    this.filter.placeholder = 'Cari material…';
    this.filter.addEventListener('input', () => this.drawList());
    this.result = el('div', 'psearch-result');
    this.list = el('div', 'psearch-list');
    this.root.append(this.filter, this.result, this.list);
    parent.append(this.root);
  }

  get isOpen() { return this.open_; }

  toggle(on = !this.open_) {
    this.open_ = on;
    show(this.root, on);
    if (!on) return;
    this.drawResult();
    this.drawList();
    this.filter.focus();
  }

  // One row per material, grouped, narrowed by whatever is typed.
  drawList() {
    clear(this.list);
    const q = this.filter.value.trim().toLowerCase();
    for (const g of SEARCH_GROUPS) {
      const names = q ? g.names.filter((n) => n.toLowerCase().includes(q)) : g.names;
      if (!names.length) continue;
      this.list.append(el('div', 'psearch-group', g.label));
      const box = el('div', 'psearch-names');
      for (const name of names) box.append(this.nameButton(name));
      this.list.append(box);
    }
    if (!this.list.childElementCount) this.list.append(el('div', 'psearch-empty', 'Tidak ada yang cocok.'));
  }

  nameButton(name) {
    const b = el('button', `psearch-name${hunt.item === name ? ' is-on' : ''}`, name);
    b.type = 'button';
    b.addEventListener('click', () => this.pick(name));
    return b;
  }

  pick(name) {
    this.onPick(hunt.item === name ? null : name);
    this.drawResult();
    this.drawList();
  }

  // What the current hunt found, or why it found nothing.
  drawResult() {
    clear(this.result);
    if (!hunt.item) {
      this.result.append(el('div', 'psearch-hint', 'Pilih material untuk menandainya di peta.'));
      return;
    }
    this.result.append(el('div', 'psearch-item', hunt.item));
    const hit = hunt.hit;
    if (!hit) {
      this.result.append(el('div', 'psearch-none', 'Tidak ada di 160 sistem terdekat.'));
      return;
    }
    const where = hit.rank === 0 ? 'di sistem ini' : `${hit.system.name} · ${hit.ly.toFixed(1)} ly`;
    this.result.append(
      el('div', 'psearch-where', `${hit.planet.name} · ${where}`),
      el('div', 'psearch-how', `${hit.planet.biome.label} · ${hit.how}`),
    );
  }

  dispose() { this.root.remove(); }
}
