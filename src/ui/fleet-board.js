// Fleet board (Y in space): frigates, expedition types with success chance, buy / repair.
import { el, clear, show } from './dom.js';
import { bar } from './quest-panel.js';
import { TYPES, DURATIONS, successChance, repairCost, xpToNext, durationScale } from '../fleet/fleet-defs.js';
import { costText, frigateLine, statusText } from './fleet-view.js';

const HINT = 'Y tutup · ↑↓ fregat · ←→ durasi · 1-4 kirim · Enter perbaiki · 5 beli';

export class FleetBoard {
  constructor(root) {
    this.node = el('div', 'panel q-journal fleet-board is-hidden');
    root.append(this.node);
  }

  get isOpen() { return !this.node.classList.contains('is-hidden'); }
  toggle(open = !this.isOpen) { show(this.node, open); }

  // view = { fleet, sel, minutes, now, reports: [text] }
  draw(view) {
    clear(this.node);
    const head = el('div', 'inv-head');
    head.append(el('div', 'panel-label', 'Armada · Kapal Induk'), el('span', 'inv-hint', HINT));
    this.node.append(head);
    for (const r of view.reports) this.node.append(el('div', 'q-text fleet-report', r));
    view.fleet.frigates.forEach((f, i) => this.node.append(this.frigateRow(view, f, i)));
    const f = view.fleet.frigates[view.sel];
    if (f) this.node.append(this.typeRows(view, f));
    this.node.append(this.buyRow(view.fleet));
  }

  frigateRow(view, f, i) {
    const row = el('div', `q-card fleet-frigate ${i === view.sel ? 'is-sel' : ''} ${f.damaged ? 'is-damaged' : ''}`);
    const line = el('div', 'q-line');
    line.append(el('span', 'q-title', frigateLine(f)), el('span', 'q-num', statusText(view.fleet, f, view.now)));
    row.append(line, bar(f.xp, xpToNext(f.level)));
    if (f.damaged && i === view.sel) row.append(el('div', 'q-text mis-timer', `Perbaiki (Enter): ${costText(repairCost(f))}`));
    return row;
  }

  typeRows(view, f) {
    const box = el('div', 'fleet-types');
    const dur = el('div', 'q-line');
    dur.append(el('span', 'q-goal', 'Durasi'), el('span', 'q-num', DURATIONS.map((m) => (m === view.minutes ? `[${m} mnt]` : `${m}`)).join(' ')));
    box.append(dur);
    TYPES.forEach((t, i) => {
      const line = el('div', 'q-line fleet-type');
      const pct = Math.round(successChance(f, t, view.minutes) * 100);
      line.append(el('span', 'q-goal', `${i + 1} · ${t.label}`), el('span', 'q-num', `sukses ${pct}% · ±${Math.round(t.nanit * durationScale(view.minutes))} Nanit`));
      box.append(line);
    });
    return box;
  }

  buyRow(fleet) {
    const line = el('div', 'q-line fleet-buy');
    line.append(el('span', 'q-goal', '5 · Beli fregat'), el('span', 'q-num', fleet.full ? 'armada penuh' : costText(fleet.nextCost())));
    return line;
  }
}
