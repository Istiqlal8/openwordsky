// Tracker rows + journal cards for cargo deliveries and planet rescues (same look as quest cards).
import { el } from './dom.js';
import { bar } from './quest-panel.js';
import { condition, kindLabel } from '../missions/cargo-missions.js';

export function clock(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Timer / condition text for one cargo, e.g. "sisa 4:10" or "kondisi 72%".
function cargoStatus(m) {
  if (m.limit) return `sisa ${clock(m.limit - m.age)}`;
  if (m.wilt) return m.age > m.wilt ? 'layu' : `segar ${clock(m.wilt - m.age)}`;
  const c = condition(m);
  return c < 1 ? `kondisi ${Math.round(c * 100)}%` : `${m.dest.jumps} lompatan`;
}

function cargoTimeBar(m) {
  if (m.limit) return bar(Math.max(0, m.limit - m.age), m.limit);
  if (m.wilt) return bar(Math.max(0, m.wilt - m.age), m.wilt);
  return bar(Math.round(condition(m) * 100), 100);
}

export function cargoTrack(cargo, hold) {
  if (!cargo.active.length) return null;
  const box = el('div', 'q-track is-cargo');
  box.append(el('div', 'q-title', `Kargo · muatan ${hold.used}/${hold.max}`));
  for (const m of cargo.active) {
    const line = el('div', 'q-line');
    line.append(el('span', 'q-goal', `${m.title} → ${m.dest.name}`), el('span', 'q-num', cargoStatus(m)));
    box.append(line, cargoTimeBar(m));
  }
  return box;
}

export function cargoCard(m) {
  const c = el('div', `q-card is-cargo is-${m.kind}`);
  c.append(el('div', 'q-tag', `Kargo · ${kindLabel(m)} · dari ${m.from}`), el('div', 'q-title', m.title));
  c.append(el('div', 'q-text', `Antar ke ${m.dest.name} (sistem ${m.dest.systemName}, ${m.dest.jumps} lompatan). Muatan ${m.size}.`));
  const line = el('div', 'q-line');
  line.append(el('span', 'q-goal', 'Status'), el('span', 'q-num', cargoStatus(m)));
  c.append(line, cargoTimeBar(m), el('div', 'q-reward', `± ${m.pay} Nanit`));
  return c;
}

function stageRow(st, i, current) {
  const row = el('div', `mis-stage ${i < current ? 'is-done' : i === current ? 'is-now' : ''}`);
  const num = i < current ? '✓' : `${st.progress}/${st.n}`;
  row.append(el('span', 'q-goal', st.label), el('span', 'q-num', num));
  return row;
}

export function rescueTrack(m) {
  if (!m) return null;
  const st = m.stages[m.stage];
  const box = el('div', 'q-track is-rescue');
  box.append(el('div', 'q-title', m.title));
  const line = el('div', 'q-line');
  line.append(el('span', 'q-goal', st.label), el('span', 'q-num', `${st.progress}/${st.n}`));
  const time = el('div', 'q-line');
  time.append(el('span', 'q-goal', `Tahap ${m.stage + 1}/${m.stages.length}`), el('span', 'q-num mis-timer', clock(m.left)));
  box.append(line, time, bar(Math.max(0, m.left), m.time));
  return box;
}

export function rescueCard(m) {
  const c = el('div', 'q-card is-rescue');
  c.append(el('div', 'q-tag', `Sinyal darurat · ${m.dest.systemName} · ${m.dest.jumps} lompatan · sisa ${clock(m.left)}`),
    el('div', 'q-title', m.title), el('div', 'q-text', m.text));
  m.stages.forEach((st, i) => c.append(stageRow(st, i, m.stage)));
  const [item, n] = m.reward.items[0] ?? [];
  c.append(bar(Math.max(0, m.left), m.time), el('div', 'q-reward', `${m.reward.nanit} Nanit${item ? ` · ${n} ${item}` : ''} · ${m.reward.xp} XP`));
  return c;
}

export function savedCard(saved) {
  if (!saved.length) return null;
  const c = el('div', 'q-card is-saved');
  c.append(el('div', 'q-tag', `Planet diselamatkan · ${saved.length}`));
  for (const r of saved.slice(-4).reverse()) c.append(el('div', 'q-text', `${r.name} · ${r.crisis}`));
  return c;
}
