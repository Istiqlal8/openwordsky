// Small shared bits for the two fleet overlays: buttons, Nanit formatting and stat bars.
import { el } from '../ui/dom.js';

// Label, max value used for the bar, and how the number is written.
export const STAT_ROWS = [
  ['hangar', 'Teluk pesawat', 14, (v) => `${v} slot`],
  ['cargo', 'Palka kargo', 26, (v) => `${v} kt`],
  ['comfort', 'Kenyamanan', 100, (v) => `${v}%`],
  ['thrust', 'Daya dorong', 100, (v) => `${v}%`],
];

export const nanit = (n) => `${Math.round(n).toLocaleString('id-ID')} Nanit`;

export function button(cls, label, onClick) {
  const b = el('button', cls, label);
  b.type = 'button';
  b.onclick = onClick;
  return b;
}

// Builds the four stat rows into `host`. Returns setStats(stats).
export function statBars(host) {
  const grid = el('div', 'fl-stats');
  const rows = {};
  for (const [key, label, , fmt] of STAT_ROWS) {
    const fill = el('div', 'fl-fill');
    const track = el('div', 'fl-track');
    const val = el('span', 'fl-stat-val');
    track.append(fill);
    grid.append(el('span', 'fl-stat', label), track, val);
    rows[key] = { fill, val, fmt };
  }
  host.append(grid);
  return (stats) => {
    for (const [key, , max] of STAT_ROWS) {
      const v = stats?.[key] ?? 0, r = rows[key];
      r.fill.style.width = `${Math.round(Math.max(0.04, Math.min(1, v / max)) * 100)}%`;
      r.val.textContent = r.fmt(v);
    }
  };
}

// Stops game keybinds firing while a text field inside the overlay has focus.
export function shieldKeys(root) {
  root.addEventListener('keydown', (e) => { if (e.code !== 'Escape') e.stopPropagation(); });
  root.addEventListener('keyup', (e) => e.stopPropagation());
}
