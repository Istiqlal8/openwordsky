// Cargo board (O on a planet): delivery offers, hold usage, locked reasons. 1-4 load, Backspace drops.
import { el, clear, show } from './dom.js';
import { kindLabel } from '../missions/cargo-missions.js';
import { clock } from './missions-view.js';

function offerNote(o) {
  const t = o.limit ? `batas ${clock(o.limit)}` : o.wilt ? `layu ${clock(o.wilt)}` : '';
  const risk = o.kind === 'contraband' ? 'sistem bajak laut' : o.kind === 'plant' ? 'rapuh' : '';
  return [`muatan ${o.size}`, t, risk].filter(Boolean).join(' · ');
}

function offerRow(o, i, why) {
  const row = el('div', `q-card mis-offer is-${o.kind} ${why ? 'is-locked' : ''}`);
  row.append(el('div', 'q-tag', `${i + 1} · ${kindLabel(o)} · ${o.dest.jumps} lompatan`), el('div', 'q-title', o.title));
  row.append(el('div', 'q-text', `Ke ${o.dest.name} (${o.dest.systemName}) · ${offerNote(o)}`));
  const line = el('div', 'q-line');
  line.append(el('span', 'q-reward', `± ${o.pay} Nanit`), el('span', why ? 'mis-lock' : 'q-num', why ?? `tekan ${i + 1}`));
  row.append(line);
  return row;
}

export class CargoBoard {
  constructor(root) {
    this.node = el('div', 'panel q-journal mis-board is-hidden');
    root.append(this.node);
  }

  get isOpen() { return !this.node.classList.contains('is-hidden'); }
  toggle(open = !this.isOpen) { show(this.node, open); }

  // view = { planet, offers, hold: {used, max}, shipLabel, lockOf(offer) }
  draw(view) {
    clear(this.node);
    const head = el('div', 'inv-head');
    head.append(el('div', 'panel-label', `Papan Kargo · ${view.planet}`), el('span', 'inv-hint', 'O tutup · 1-4 muat · Backspace buang'));
    const hold = el('div', 'q-line');
    hold.append(el('span', 'q-goal', `Pesawat ${view.shipLabel}`), el('span', 'q-num', `muatan ${view.hold.used}/${view.hold.max}`));
    this.node.append(head, hold);
    if (!view.offers.length) this.node.append(el('div', 'q-text', 'Tidak ada tawaran lagi di planet ini.'));
    view.offers.forEach((o, i) => this.node.append(offerRow(o, i, view.lockOf(o))));
  }
}
