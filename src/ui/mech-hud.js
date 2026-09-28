// Mech HUD: frame name, energy, the weapon row with the selected mode's gauge (heat, magazine
// or charge), lock-on and the mech key hints. Only visible while the pilot is inside the mech.
import { el, hexCss } from './dom.js';
import { MODES } from '../mech/mech-weapons.js';

const HINTS = [['Klik kiri', 'Tembak'], ['Klik kanan', 'Misil'], ['Klik tengah', 'Pedang'],
  ['Roda', 'Ganti senjata'], ['1–6', 'Pilih senjata'], ['Shift', 'Boost'],
  ['Space', 'Lompat jet'], ['.', 'Kembali ke pesawat']];

const GAUGE_CLASS = { heat: 'is-heat', ammo: 'is-ammo', charge: 'is-charge', combo: 'is-combo' };

export class MechHud {
  constructor(parent) {
    this.root = el('div', 'mk-hud panel is-hidden');
    this.name = el('div', 'mk-name', 'MECH');
    this.mode = el('span', 'mk-mode', '');
    const head = el('div', 'mk-head');
    head.append(this.name, this.mode);
    const track = el('div', 'mk-track');
    this.fill = el('div', 'mk-fill');
    track.append(this.fill);
    this.root.append(head, track, this.buildWeapons(), this.buildGauge());
    this.lock = el('div', 'mk-lock', 'TERKUNCI');
    this.root.append(this.lock, this.buildKeys());
    parent?.append(this.root);
    this.last = { pct: -1, weapon: '', lock: null, name: '', mode: '', index: -1, gauge: '', bar: -1, text: '' };
  }

  buildWeapons() {
    const row = el('div', 'mk-wpns');
    this.chips = MODES.map((m, i) => {
      const chip = el('span', 'mk-wp');
      chip.style.setProperty('--wp', hexCss(m.color));
      chip.append(el('b', null, String(i + 1)), el('span', null, m.short));
      row.append(chip);
      return chip;
    });
    return row;
  }

  buildGauge() {
    const wrap = el('div', 'mk-gauge');
    this.weapon = el('div', 'mk-weapon', '—');
    const bar = el('div', 'mk-bar');
    this.gaugeFill = el('div', 'mk-bar-fill');
    bar.append(this.gaugeFill);
    this.gauge = bar;
    this.state = el('div', 'mk-state', '');
    wrap.append(this.weapon, bar, this.state);
    return wrap;
  }

  buildKeys() {
    const keys = el('div', 'mk-keys');
    for (const [k, label] of HINTS) {
      const row = el('span', 'mk-key');
      row.append(el('b', null, k), el('span', null, label));
      keys.append(row);
    }
    return keys;
  }

  // state: { on, name, label, energy 0..1, weapon, lock, wp } — wp is Loadout.hud().
  update(state) {
    this.root.classList.toggle('is-hidden', !state.on);
    if (!state.on) return;
    const pct = Math.round(state.energy * 100);
    if (pct !== this.last.pct) { this.fill.style.width = `${pct}%`; this.fill.dataset.low = pct < 20 ? '1' : '0'; }
    if (state.unlimited !== this.last.free) { this.fill.dataset.free = state.unlimited ? '1' : '0'; this.last.free = state.unlimited; }
    if (state.name !== this.last.name) this.name.textContent = state.name;
    if (state.label !== this.last.mode) this.mode.textContent = state.label;
    const power = state.unlimited ? 'daya ∞' : `${pct}% energi`;
    if (state.weapon !== this.last.weapon || pct !== this.last.pct) this.weapon.textContent = `${state.weapon} · ${power}`;
    if (state.lock !== this.last.lock) this.lock.classList.toggle('is-on', Boolean(state.lock));
    this.drawWeapons(state.wp);
    this.last.pct = pct;
    this.last.weapon = state.weapon;
    this.last.lock = Boolean(state.lock);
    this.last.name = state.name;
    this.last.mode = state.label;
  }

  drawWeapons(wp) {
    if (!wp) return;
    if (wp.index !== this.last.index) {
      for (let i = 0; i < this.chips.length; i++) this.chips[i].classList.toggle('is-on', i === wp.index);
      this.last.index = wp.index;
    }
    this.chips[wp.index]?.classList.toggle('is-hot', wp.locked);
    const bar = Math.round((wp.reload > 0 ? 1 - wp.reload : wp.value) * 100);
    if (bar !== this.last.bar) { this.gaugeFill.style.width = `${Math.max(0, Math.min(100, bar))}%`; this.last.bar = bar; }
    const cls = GAUGE_CLASS[wp.gauge] ?? 'is-heat';
    if (cls !== this.last.gauge) { this.gauge.className = `mk-bar ${cls}`; this.last.gauge = cls; }
    this.gauge.dataset.alert = wp.locked || wp.reload > 0 ? '1' : '0';
    const text = gaugeText(wp);
    if (text !== this.last.text) { this.state.textContent = text; this.last.text = text; }
  }

  dispose() {
    this.root.remove();
  }
}

function gaugeText(wp) {
  if (wp.locked) return 'PANAS BERLEBIH';
  if (wp.reload > 0) return 'ISI ULANG';
  if (wp.gauge === 'ammo') return `AMUNISI ${wp.ammo}`;
  if (wp.gauge === 'charge') return wp.value >= 1 ? 'SIAP TEMBAK' : `ISI DAYA ${Math.round(wp.value * 100)}%`;
  if (wp.gauge === 'combo') return 'KOMBO 3 TEBASAN';
  if (wp.spin > 0.02 && wp.spin < 1) return `PUTARAN ${Math.round(wp.spin * 100)}%`;
  return `PANAS ${Math.round(wp.value * 100)}%`;
}
