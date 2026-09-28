// The reading overlay for the twin's flight log.
//
// Its own stylesheet is injected from here rather than added to index.html, the way
// src/settings/meta-addon.js does it, so the feature stays self-contained.
import { el, clear } from '../ui/dom.js';

const CSS_HREF = 'src/twin/twin.css';

function loadCss() {
  if (document.head.querySelector(`link[href="${CSS_HREF}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS_HREF;
  document.head.append(link);
}

export class TwinPanel {
  constructor(root) {
    loadCss();
    this.root = el('div', 'twin-log is-hidden');
    root.append(this.root);
  }

  get isOpen() { return !this.root.classList.contains('is-hidden'); }

  // entries: [{ day, text }] from twin-lore.js. reward: the payout line, or null.
  open(shipName, entries, reward) {
    clear(this.root);
    this.root.append(el('div', 'twin-head', 'Log penerbangan'), el('div', 'twin-ship', shipName));
    entries.forEach((e, i) => this.root.append(this.entry(e, i === entries.length - 1)));
    this.root.append(el('div', 'twin-foot', reward ? `${reward} · P untuk menutup` : 'P untuk menutup'));
    this.root.classList.remove('is-hidden');
    this.root.scrollTop = 0;
  }

  entry({ day, text }, last) {
    const node = el('div', last ? 'twin-entry is-last' : 'twin-entry');
    node.append(el('div', 'twin-day', `Hari ${day}`), el('div', 'twin-text', text));
    return node;
  }

  close() { this.root.classList.add('is-hidden'); }

  toggle(shipName, entries, reward) {
    if (this.isOpen) this.close();
    else this.open(shipName, entries, reward);
  }

  dispose() { this.root.remove(); }
}
