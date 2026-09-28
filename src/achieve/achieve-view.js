// Trophy list (collection book tab) and the unlock banner.
import { el } from '../ui/dom.js';
import { CATEGORIES, MEDALS, REWARD } from './achieve-defs.js';

const BANNER_MS = 3600;
const date = (t) => new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

function row({ def, value, got }) {
  const hide = def.hidden && !got;
  const r = el('div', `ac-row is-${def.medal}${got ? ' is-got' : ''}`);
  r.append(el('i', 'ac-medal'));
  const text = el('div', 'ac-text');
  text.append(el('div', 'ac-name', hide ? '???' : def.name), el('div', 'ac-desc', hide ? 'Trofi rahasia' : def.desc));
  r.append(text);
  const side = el('div', 'ac-side');
  if (got) side.append(el('span', 'ac-date', date(got)));
  else if (!hide) {
    side.append(el('span', 'ac-num', `${value.toLocaleString('id-ID')}/${def.goal.toLocaleString('id-ID')}`));
    const bar = el('span', 'q-bar'), fill = el('i', 'q-fill');
    fill.style.width = `${Math.round((100 * value) / def.goal)}%`;
    bar.append(fill);
    side.append(bar);
  }
  r.append(side);
  return r;
}

// Trophy list for the collection book's "Trofi" tab, grouped by category.
export function achieveBody(items) {
  const box = el('div', 'ac-body');
  const got = items.filter((i) => i.got).length;
  box.append(el('div', 'ac-total', `${got}/${items.length} trofi terbuka`));
  for (const cat of CATEGORIES) {
    const list = items.filter((i) => i.def.cat === cat);
    const card = el('div', 'q-card ac-card');
    card.append(el('div', 'q-tag', `${cat} · ${list.filter((i) => i.got).length}/${list.length}`));
    for (const it of list) card.append(row(it));
    box.append(card);
  }
  return box;
}

// One banner at a time; later unlocks wait their turn.
export class AchieveBanner {
  constructor(root) {
    this.root = root;
    this.queue = [];
    this.busy = false;
  }

  push(def) {
    this.queue.push(def);
    if (!this.busy) this.next();
  }

  next() {
    const def = this.queue.shift();
    this.busy = !!def;
    if (!def) return;
    const b = el('div', `ac-banner is-${def.medal}`);
    b.append(el('i', 'ac-medal'));
    const text = el('div', 'ac-text');
    text.append(el('div', 'ac-kicker', `Trofi ${MEDALS[def.medal]} terbuka · +${REWARD[def.medal]} Nanit`), el('div', 'ac-name', def.name),
      el('div', 'ac-desc', def.desc));
    b.append(text);
    this.root.append(b);
    setTimeout(() => b.classList.add('is-out'), BANNER_MS - 500);
    setTimeout(() => { b.remove(); this.next(); }, BANNER_MS);
  }
}
