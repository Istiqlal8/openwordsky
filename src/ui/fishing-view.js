// Fishing HUD: status line + reel meter while fishing, and the fish log card in the journal (J).
import { el, show } from './dom.js';
import { bar } from './quest-panel.js';
import { TIER } from '../fishing/fish-species.js';

const STATUS = {
  cast: 'Melempar kail…', wait: 'Menunggu gigitan… (X gulung)', bite: 'Tarik! Tekan X', reel: 'Tahan X · jaga di zona',
};

export class FishingReel {
  constructor(root) {
    this.node = el('div', 'panel fish-reel is-hidden');
    this.status = el('div', 'fish-status');
    this.track = el('div', 'fish-track');
    this.zone = el('i', 'fish-zone');
    this.marker = el('i', 'fish-marker');
    this.track.append(this.zone, this.marker);
    this.meter = el('div', 'fish-meter');
    this.fill = el('i', 'fish-fill');
    this.meter.append(this.fill);
    this.node.append(this.status, this.track, this.meter);
    root.append(this.node);
  }

  hide() { show(this.node, false); }

  // session: FishSession (state, zone, half, marker, progress)
  draw(session) {
    show(this.node, session.active);
    if (!session.active) return;
    const st = session.state, reel = st === 'reel';
    this.status.textContent = STATUS[st] ?? '';
    this.node.classList.toggle('is-bite', st === 'bite');
    show(this.track, reel);
    show(this.meter, reel);
    if (!reel) return;
    this.zone.style.left = `${(session.zone - session.half) * 100}%`;
    this.zone.style.width = `${session.half * 200}%`;
    this.marker.style.left = `${session.marker * 100}%`;
    this.track.classList.toggle('is-in', session.inZone);
    this.fill.style.width = `${Math.max(0, Math.min(1, session.progress)) * 100}%`;
  }
}

// Journal card: totals, then every logged species with its best size.
export function fishCard(s, rows, planetFish) {
  const c = el('div', 'q-card is-fish');
  c.append(el('div', 'q-tag', 'Log Ikan · X di tepi air'), el('div', 'q-title', `${s.caught} ikan ditangkap`));
  if (planetFish) {
    const here = planetFish.filter((f) => s.species[f.name]).length;
    const line = el('div', 'q-line');
    line.append(el('span', 'q-goal', 'Spesies di planet ini'), el('span', 'q-num', `${here}/${planetFish.length}`));
    c.append(line, bar(here, planetFish.length));
  }
  for (const r of rows.slice(0, 8)) {
    const line = el('div', `q-line fish-row is-${r.tier}`);
    line.append(el('span', 'q-goal', `${r.name} · ${TIER[r.tier]?.label ?? r.tier}`), el('span', 'q-num', `${r.best} cm ×${r.n}`));
    c.append(line);
  }
  if (rows.length > 8) c.append(el('div', 'q-text', `+${rows.length - 8} spesies lain`));
  return c;
}
