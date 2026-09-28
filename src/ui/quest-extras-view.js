// Journal cards + tracker rows for daily challenges, the rival race and alien reputation.
import { el } from './dom.js';
import { goalLabel, bar } from './quest-panel.js';

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function row(title, goal, num, value, max, cls) {
  const r = el('div', `q-track ${cls}`);
  const line = el('div', 'q-line');
  line.append(el('span', 'q-goal', goal), el('span', 'q-num', num));
  r.append(el('div', 'q-title', title), line, bar(value, max));
  return r;
}

export function dailyCard(daily) {
  const s = daily.s, c = el('div', 'q-card is-daily');
  const streak = s.streak ? ` · beruntun ${s.streak} hari` : '';
  c.append(el('div', 'q-tag', `Tantangan harian · ${daily.doneCount}/${daily.list.length}${streak}`));
  for (const q of daily.list) {
    const r = el('div', `q-daily ${q.done ? 'is-done' : ''}`);
    const line = el('div', 'q-line');
    line.append(el('span', 'q-goal', `${q.done ? '✓ ' : ''}${q.title} · ${goalLabel(q.goal)}`), el('span', 'q-num', `${q.progress}/${q.goal.n}`));
    r.append(line, bar(q.progress, q.goal.n));
    c.append(r);
  }
  c.append(el('div', 'q-reward', `Bonus beruntun: +${daily.streakBonus} Nanit`));
  return c;
}

export function dailyTrack(daily) {
  const next = daily.list.find((q) => !q.done);
  if (!next) return null;
  return row(`Harian ${daily.doneCount}/${daily.list.length}`, `${next.title}`, `${next.progress}/${next.goal.n}`,
    next.progress, next.goal.n, 'is-daily');
}

export function rivalTrack(rival, st) {
  const r = rival.race;
  if (!r) return null;
  const done = st?.done ?? 0, total = st?.total ?? 1;
  return row(`Balapan vs ${rival.name}`, `Koleksi ${r.planet} · ${clock(r.left)}`, `${done}/${total}`, done, total, 'is-rival');
}

export function rivalCard(rival) {
  const s = rival.s;
  if (!s.won && !s.lost && !s.race) return null;
  const c = el('div', 'q-card is-rival');
  c.append(el('div', 'q-tag', `Rival · menang ${s.won} · kalah ${s.lost}`), el('div', 'q-title', rival.name));
  const text = s.race ? `Sedang berlomba mengkatalog ${s.race.planet}. Sisa waktu ${clock(s.race.left)}. Bonus ${s.race.bonus} Nanit.`
    : 'Penjelajah saingan yang mengincar koleksi planet yang sama denganmu.';
  c.append(el('div', 'q-text', text));
  return c;
}

export function repCard(rep) {
  const c = el('div', 'q-card is-rep');
  c.append(el('div', 'q-tag', 'Reputasi ras alien'));
  const list = el('div', 'rep-list');
  for (const { race, pts, tier } of rep.standings) {
    const r = el('div', 'rep-row');
    r.append(el('span', 'rep-name', race.name), el('span', `rep-tier is-t${tier.index}`, tier.name),
      el('span', 'q-num', tier.next ? `${pts}/${tier.next}` : `${pts}`));
    r.append(bar(tier.next ? pts : 1, tier.next ?? 1));
    list.append(r);
  }
  c.append(list, el('div', 'q-reward', 'Naik lewat dagang dan misi di pos mereka · Sahabat: pesanan khusus'));
  return c;
}
