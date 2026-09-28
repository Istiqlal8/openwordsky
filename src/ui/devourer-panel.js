// Screen furniture for the Pemakan Planet event: the pulsing banner that follows the player
// everywhere, plus the journal card and mission-tracker row (quest-panel.js sections).
import { el, clear } from './dom.js';
import { bar } from './quest-panel.js';

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const PHASE = { shield: 'Perisai aktif', open: 'Inti terbuka', enraged: 'Mengamuk', collapse: 'Runtuh' };

export class DevourerBanner {
  constructor(root) {
    this.root = el('div', 'dv-banner is-hidden');
    root.append(this.root);
    this.key = '';
  }

  hide() {
    if (this.root.classList.contains('is-hidden')) return;
    this.root.classList.add('is-hidden');
    this.key = '';
  }

  // view = { planet, system, left, hpFrac, phase, here, jumps, share }
  show(view) {
    this.root.classList.remove('is-hidden');
    const key = `${view.planet}|${view.here}|${Math.floor(view.left)}|${Math.round(view.hpFrac * 100)}|${view.phase}`;
    if (key === this.key) return;
    this.key = key;
    clear(this.root);
    this.root.classList.toggle('is-here', Boolean(view.here));
    this.root.append(el('div', 'dv-title', 'PEMAKAN PLANET'),
      el('div', 'dv-where', `${view.planet} · Sistem ${view.system}`));
    const line = el('div', 'dv-line');
    line.append(el('span', 'dv-phase', PHASE[view.phase] ?? ''), el('span', 'dv-clock', clock(view.left)));
    this.root.append(line, bar(Math.max(0, view.hpFrac) * 100, 100));
    this.root.append(el('div', 'dv-hint', view.here
      ? `Kontribusimu ${Math.round(view.share * 100)}%`
      : `Tekan M · ${view.jumps} lompatan (30 energi tiap warp)`));
  }
}

export function devourerTrack(view) {
  if (!view) return null;
  const row = el('div', 'q-track is-devourer');
  row.append(el('div', 'q-title', `Pemakan Planet · ${view.planet}`));
  const line = el('div', 'q-line');
  line.append(el('span', 'q-goal', PHASE[view.phase] ?? ''), el('span', 'q-num', clock(view.left)));
  row.append(line, bar(Math.max(0, view.hpFrac) * 100, 100));
  return row;
}

function historyRow(h) {
  const row = el('div', 'dv-hist');
  row.append(el('span', 'dv-hist-name', `${h.planet} · ${h.sys}`),
    el('span', h.outcome === 'win' ? 'dv-ok' : 'dv-bad', h.outcome === 'win' ? 'Planet diselamatkan' : 'Planet lenyap'),
    el('span', 'dv-share', `${h.share}%`));
  return row;
}

export function devourerCard(state, view) {
  const s = state.s;
  const c = el('div', 'q-card is-devourer');
  c.append(el('div', 'q-tag', 'Peristiwa galaksi'), el('div', 'q-title', 'Pemakan Planet'));
  if (view) {
    c.append(el('div', 'q-text', `${view.planet} di sistem ${view.system} sedang dimakan. ${PHASE[view.phase]}.`));
    const line = el('div', 'q-line');
    line.append(el('span', 'q-goal', `Kontribusimu ${Math.round(view.share * 100)}%`), el('span', 'q-num', clock(view.left)));
    c.append(line, bar(Math.max(0, view.hpFrac) * 100, 100));
  } else {
    c.append(el('div', 'q-text', 'Tidak ada yang muncul sekarang. Ia datang tanpa jadwal, di sistem mana saja.'));
  }
  c.append(el('div', 'q-reward', `Menang ${s.wins} · Planet lenyap ${s.losses}${s.trophy ? ' · Trofi: Taring Pemakan' : ''}`));
  for (const h of s.hist.slice(0, 4)) c.append(historyRow(h));
  return c;
}
