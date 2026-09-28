// Quest HUD: compact tracker on the right + journal panel (J) with rank, story, contracts, catalog.
import { el, clear, show } from './dom.js';
import { collectionSection, collectionTrack } from './collection-view.js';

const BIOME = { desert: 'gurun', frozen: 'beku', ocean: 'samudra', volcanic: 'vulkanik', lush: 'subur' };
const GOAL = {
  land: 'Mendarat', scan: 'Pindai planet', harvest: 'Panen tumbuhan', mine: 'Tambang batu',
  scanFauna: 'Spesies fauna baru', floraNew: 'Spesies flora baru', pickup: 'Pungut benda',
  gather: 'Hasil hewan (Q)', hunt: 'Buru hewan', tame: 'Jinakkan hewan', warp: 'Warp',
  discover: 'Planet baru', ruin: 'Reruntuhan', asteroid: 'Asteroid', pirate: 'Bajak laut', sentinel: 'Drone penjaga', clear: 'Koleksi planet tuntas',
};

// Shared card/row builders so addon sections look like the rest of the journal.
export { journalCard, trackRow, bar };

export function goalLabel(goal) {
  if (goal.type === 'item') return goal.item;
  if (goal.type === 'deliver') return `Serahkan ${goal.item}`;
  if (goal.type === 'meet') return `Mendarat: ${goal.where}`;
  if (goal.type === 'land' && goal.biome) return `Mendarat: ${BIOME[goal.biome] ?? goal.biome}`;
  return GOAL[goal.type] ?? goal.type;
}

function rewardText(r) {
  const parts = [`${r.nanit} Nanit`, ...r.items.map(([name, n]) => `${n} ${name}`), `${r.xp} XP`];
  return parts.join(' · ');
}

function bar(value, max) {
  const b = el('span', 'q-bar');
  const fill = el('i', 'q-fill');
  fill.style.width = `${Math.round((100 * value) / max)}%`;
  b.append(fill);
  return b;
}

function trackRow(q) {
  const row = el('div', `q-track is-${q.kind}`);
  row.append(el('div', 'q-title', q.title));
  const line = el('div', 'q-line');
  line.append(el('span', 'q-goal', goalLabel(q.goal)), el('span', 'q-num', `${q.progress}/${q.goal.n}`));
  row.append(line, bar(q.progress, q.goal.n));
  return row;
}

function journalCard(q) {
  const c = el('div', `q-card is-${q.kind}`);
  const tag = q.kind === 'story' ? `Bab ${q.chapter} · ${q.chapterName}`
    : `${q.kind === 'npc' ? `Permintaan ${q.giver}` : 'Kontrak'}${q.where ? ` · ${q.where}` : ''}`;
  c.append(el('div', 'q-tag', tag), el('div', 'q-title', q.title), el('div', 'q-text', q.text));
  const line = el('div', 'q-line');
  line.append(el('span', 'q-goal', goalLabel(q.goal)), el('span', 'q-num', `${q.progress}/${q.goal.n}`));
  c.append(line, bar(q.progress, q.goal.n), el('div', 'q-reward', rewardText(q.reward)));
  return c;
}

export class QuestPanel {
  constructor(root, log, collection) {
    this.log = log;
    this.collection = collection;
    // Extra journal/tracker blocks from addons: { journal?() -> Element|null, track?() -> Element|null }.
    // Addons bump log.version when their content changes so the panel redraws.
    this.sections = [];
    this.seen = -1;
    this.tracker = el('div', 'q-tracker');
    this.journal = el('div', 'panel q-journal is-hidden');
    root.append(this.tracker, this.journal);
  }

  get isOpen() { return !this.journal.classList.contains('is-hidden'); }
  toggle() { show(this.journal, !this.isOpen); this.seen = -1; }

  update() {
    if (this.seen === this.log.version) return;
    this.seen = this.log.version;
    this.drawTracker();
    if (this.isOpen) this.drawJournal();
  }

  drawTracker() {
    clear(this.tracker);
    this.tracker.append(el('div', 'panel-label', 'Misi · J'));
    for (const q of this.log.active) this.tracker.append(trackRow(q));
    const st = this.collection.status;
    if (st) this.tracker.append(collectionTrack(st));
    for (const x of this.sections) { const n = x.track?.(); if (n) this.tracker.append(n); }
  }

  drawJournal() {
    const log = this.log, r = log.rank;
    clear(this.journal);
    const head = el('div', 'inv-head');
    head.append(el('div', 'panel-label', 'Jurnal Misi'), el('span', 'inv-hint', 'J tutup · K ganti kontrak'));
    const rank = el('div', 'q-rank');
    rank.append(el('span', 'q-rank-name', r.name), el('span', 'q-num', r.next ? `${r.xp}/${r.next} XP` : `${r.xp} XP`));
    const stats = el('div', 'q-stats', `Misi selesai ${log.s.done} · Fauna tercatat ${log.catalogCount('fauna')} · Flora tercatat ${log.catalogCount('flora')}`);
    this.journal.append(head, rank, bar(r.next ? r.xp : 1, r.next ?? 1), stats);
    const story = log.story;
    const st = this.collection.status;
    if (st) this.journal.append(collectionSection(st, this.collection.clearedCount));
    this.journal.append(story ? journalCard(story) : el('div', 'q-text', 'Kisah utama selesai. Kontrak baru terus datang.'));
    for (const x of this.sections) { const n = x.journal?.(); if (n) this.journal.append(n); }
    for (const c of log.contracts) this.journal.append(journalCard(c));
  }
}
