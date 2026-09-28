// Inventory panel (resource grid) + compact loot feed ("+3 Ferit").
import { el, clear, show } from './dom.js';

const MIN_SLOTS = 12;
const FEED_MS = 2500;
const FEED_FADE_MS = 400;
const FEED_MAX = 5;

// Stable hue from a resource name (FNV-1a).
function hueOf(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return (h >>> 0) % 360;
}

// Procedural resource icon: a colored gem whose shape also varies with the hash.
export function resourceIcon(name) {
  const hue = hueOf(name);
  const icon = el('span', `res-icon res-shape-${hue % 3}`);
  icon.style.setProperty('--h', String(hue));
  return icon;
}

export class Inventory {
  constructor(root) {
    this.root = root;
    this.sig = null;
    this.panel = el('div', 'panel inv is-hidden');
    const head = el('div', 'inv-head');
    head.append(el('div', 'panel-label', 'Inventaris'), el('span', 'inv-hint', 'Tab'));
    this.grid = el('div', 'inv-grid');
    this.panel.append(head, this.grid);
    this.feed = el('div', 'loot-feed');
    root.append(this.panel, this.feed);
  }

  get isOpen() { return !this.panel.classList.contains('is-hidden'); }

  toggle() { if (this.isOpen) this.hide(); else this.show(); }

  show() {
    show(this.panel, true);
    this.panel.classList.remove('inv-in');
    void this.panel.offsetWidth;
    this.panel.classList.add('inv-in');
  }

  hide() { show(this.panel, false); }

  // Rebuilds the grid only when the inventory contents change.
  update(player) {
    const items = Object.entries(player?.inventory ?? {})
      .filter(([, n]) => n > 0)
      .sort((a, b) => a[0].localeCompare(b[0], 'id'));
    const sig = items.map(([k, n]) => `${k}:${Math.round(n)}`).join('|');
    if (sig === this.sig) return;
    this.sig = sig;
    this.render(items);
  }

  render(items) {
    clear(this.grid);
    for (const [name, n] of items) this.grid.append(this.slot(name, n));
    for (let i = items.length; i < MIN_SLOTS; i++) this.grid.append(el('div', 'inv-slot is-empty'));
  }

  slot(name, n) {
    const s = el('div', 'inv-slot');
    s.append(resourceIcon(name), el('span', 'inv-count', String(Math.round(n))), el('span', 'inv-name', name));
    return s;
  }

  // Loot feed entry; repeated pickups of the same resource merge into one line.
  notify(name, n = 1) {
    const last = this.feed.lastElementChild;
    if (last && last.dataset.name === name && !last.classList.contains('is-out')) {
      last.dataset.n = String(Number(last.dataset.n) + n);
      last.querySelector('.loot-text').textContent = `+${last.dataset.n} ${name}`;
      this.schedule(last);
      return;
    }
    const row = el('div', 'loot');
    row.dataset.name = name;
    row.dataset.n = String(n);
    row.append(resourceIcon(name), el('span', 'loot-text', `+${n} ${name}`));
    this.feed.append(row);
    this.schedule(row);
    while (this.feed.childElementCount > FEED_MAX) this.feed.firstChild.remove();
  }

  // (Re)start the fade-out timers for one feed row.
  schedule(row) {
    clearTimeout(row.fadeTimer);
    clearTimeout(row.removeTimer);
    row.fadeTimer = setTimeout(() => row.classList.add('is-out'), FEED_MS - FEED_FADE_MS);
    row.removeTimer = setTimeout(() => row.remove(), FEED_MS);
  }
}
