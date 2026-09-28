// Planet collection checklist for the quest journal and tracker.
import { el } from './dom.js';

function group(title, rows, hintOf) {
  const g = el('div', 'col-group');
  const done = rows.filter((r) => r.done).length;
  g.append(el('div', 'q-tag', `${title} · ${done}/${rows.length}`));
  const list = el('div', 'col-list');
  for (const r of rows) {
    const row = el('div', `col-row ${r.done ? 'is-done' : ''} ${r.endemic ? 'is-endemic' : ''}`);
    row.append(el('span', 'col-mark', r.done ? '✓' : '·'), el('span', 'col-name', r.done ? r.name : (hintOf?.(r) ?? '???')));
    if (r.hint && !r.done) row.title = r.hint;
    list.append(row);
  }
  g.append(list);
  return g;
}

// Unfound species stay hidden ("???"); unfound items show their name + where to get them.
export function collectionSection(st, clearedCount) {
  const c = el('div', 'q-card col-card');
  const tag = st.cleared ? 'Tuntas' : `${st.done}/${st.total}`;
  c.append(el('div', 'q-tag', `Koleksi planet · ${tag} · planet tuntas ${clearedCount}`), el('div', 'q-title', st.planet));
  c.append(group('Fauna (pindai F)', st.fauna), group('Flora (panen)', st.flora),
    group('Barang', st.items, (r) => `${r.name} — ${r.hint}`));
  return c;
}

export function collectionTrack(st) {
  const row = el('div', 'q-track is-collection');
  row.append(el('div', 'q-title', `Koleksi ${st.planet}`));
  const line = el('div', 'q-line');
  line.append(el('span', 'q-goal', st.cleared ? 'Tuntas' : 'Fauna, flora, barang'), el('span', 'q-num', `${st.done}/${st.total}`));
  const bar = el('span', 'q-bar'), fill = el('i', 'q-fill');
  fill.style.width = `${Math.round((100 * st.done) / Math.max(1, st.total))}%`;
  bar.append(fill);
  row.append(line, bar);
  return row;
}
