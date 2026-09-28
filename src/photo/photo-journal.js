// Photo challenges + gallery card. Listens for 'photo' events from PhotoMode, awards each
// challenge once through the quest log and shows the newest thumbnails in the journal.
import { el } from '../ui/dom.js';
import { bar } from '../ui/quest-panel.js';
import { SUBJECT } from './photo-subjects.js';
import { loadPhotos } from './photo-store.js';

const SPECIES = 'Spesies: ';
const CHALLENGES = [
  { id: 'satwa', title: 'Potret Satwa', text: 'Foto 3 spesies hewan berbeda', n: 3, nanit: 300, xp: 40 },
  { id: 'malam', title: 'Langit Malam', text: 'Foto di malam hari (aurora juga dihitung)', n: 1, nanit: 250, xp: 30, subject: [SUBJECT.night, SUBJECT.aurora] },
  { id: 'langka', title: 'Kilau Emas', text: 'Foto hewan langka berwarna emas', n: 1, nanit: 500, xp: 60, subject: [SUBJECT.rare] },
  { id: 'peristiwa', title: 'Saksi Peristiwa', text: 'Foto saat peristiwa planet berlangsung', n: 1, nanit: 400, xp: 50, subject: [SUBJECT.event] },
  { id: 'legenda', title: 'Sang Legenda', text: 'Foto monster legendaris', n: 1, nanit: 800, xp: 90, subject: [SUBJECT.legend] },
];
const THUMBS = 8;

export class PhotoJournal {
  constructor(wiring) {
    this.log = wiring.log;
    this.s = this.log.s.photo ??= { done: {}, species: {}, count: 0 };
    wiring.player.on('photo', (p) => this.taken(p));
  }

  progress(c) {
    if (this.s.done[c.id]) return c.n;
    return c.id === 'satwa' ? Math.min(c.n, Object.keys(this.s.species).length) : 0;
  }

  taken({ subjects }) {
    this.s.count++;
    for (const sub of subjects) if (sub.startsWith(SPECIES)) this.s.species[sub.slice(SPECIES.length)] = 1;
    for (const c of CHALLENGES) {
      if (this.s.done[c.id]) continue;
      const hit = c.subject ? c.subject.some((x) => subjects.includes(x)) : this.progress(c) >= c.n;
      if (hit) this.finish(c);
    }
    this.log.version++;
  }

  finish(c) {
    this.s.done[c.id] = Date.now();
    this.log.award({ kind: 'photo', title: `Foto: ${c.title}`, text: c.text, goal: { type: 'photo', n: c.n },
      progress: c.n, reward: { nanit: c.nanit, items: [], xp: c.xp } });
  }

  card() {
    const c = el('div', 'q-card is-photo'), done = CHALLENGES.filter((x) => this.s.done[x.id]).length;
    c.append(el('div', 'q-tag', `Tantangan foto · ${done}/${CHALLENGES.length} · P mode foto`));
    for (const q of CHALLENGES) {
      const line = el('div', 'q-line'), p = this.progress(q);
      line.append(el('span', 'q-goal', `${this.s.done[q.id] ? '✓ ' : ''}${q.title} · ${q.text}`), el('span', 'q-num', `${p}/${q.n}`));
      c.append(line, bar(p, q.n));
    }
    c.append(el('div', 'q-reward', `Hadiah ${CHALLENGES.map((q) => q.nanit).join(' / ')} Nanit`));
    c.append(this.gallery());
    return c;
  }

  gallery() {
    const photos = loadPhotos().slice(0, THUMBS), g = el('div', 'photo-gallery');
    g.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:6px';
    if (!photos.length) g.append(el('div', 'q-text', 'Galeri kosong.'));
    for (const p of photos) {
      const img = el('img');
      img.src = p.src;
      img.alt = p.planet || 'Foto';
      img.title = [p.planet, ...(p.subjects ?? [])].filter(Boolean).join(' · ');
      img.style.cssText = 'width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:4px;display:block';
      g.append(img);
    }
    return g;
  }
}
