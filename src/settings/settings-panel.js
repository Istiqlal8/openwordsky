// Settings window (` or the gear on the pause screen): graphics, audio, controls, key bindings, tutorial.
import { el, clear, show } from '../ui/dom.js';
import { settings, ACTIONS, keyLabel } from './settings-store.js';
import { QUALITY } from './graphics.js';

function section(title) {
  const s = el('div', 'st-sec');
  s.append(el('div', 'st-sec-title', title));
  return s;
}

function row(label, control) {
  const r = el('label', 'st-row');
  r.append(el('span', 'st-label', label), control);
  return r;
}

function slider(value, min, max, step, onInput, fmt) {
  const box = el('span', 'st-slider');
  const input = el('input');
  Object.assign(input, { type: 'range', min, max, step, value });
  const out = el('span', 'st-val', fmt(value));
  input.addEventListener('input', () => { out.textContent = fmt(Number(input.value)); onInput(Number(input.value)); });
  box.append(input, out);
  return box;
}

function check(value, onChange) {
  const input = el('input');
  Object.assign(input, { type: 'checkbox', checked: value });
  input.addEventListener('change', () => onChange(input.checked));
  return input;
}

function button(text, onClick, cls = '') {
  const b = el('button', `st-btn ${cls}`.trim(), text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

const pct = (v) => `${Math.round(v * 100)}%`;

export class SettingsPanel {
  // h: { set(name, value), rebind(logical), resetKeys(), skipTutorial(), restartTutorial(), close() }
  constructor(root, h) {
    this.h = h;
    this.node = el('div', 'panel st-panel is-hidden');
    this.node.addEventListener('mousedown', (e) => e.stopPropagation());
    root.append(this.node);
  }

  get isOpen() { return !this.node.classList.contains('is-hidden'); }
  show(on) { show(this.node, on); }

  draw(view) {
    clear(this.node);
    const head = el('div', 'inv-head');
    head.append(el('div', 'panel-label', 'Pengaturan'), button('×', () => this.h.close(), 'st-x'));
    const body = el('div', 'st-body');
    body.append(this.graphics(view), this.audio(), this.controls(), this.keys(view), this.tutorial(view));
    this.node.append(head, body);
    if (view.note) this.node.append(el('div', 'st-note', view.note));
  }

  graphics() {
    const s = section('Grafis');
    const bar = el('span', 'st-choice');
    for (const [id, label] of QUALITY) bar.append(button(label, () => this.h.set('quality', id), id === settings.quality ? 'is-on' : ''));
    s.append(row('Kualitas', bar));
    return s;
  }

  audio() {
    const s = section('Suara');
    for (const [name, label] of [['master', 'Volume utama'], ['music', 'Musik & ambien'], ['sfx', 'Efek suara']]) {
      s.append(row(label, slider(settings[name], 0, 1, 0.05, (v) => this.h.set(name, v), pct)));
    }
    return s;
  }

  controls() {
    const s = section('Kontrol');
    s.append(row('Sensitivitas mouse', slider(settings.sens, 0.2, 3, 0.1, (v) => this.h.set('sens', v), (v) => `${v.toFixed(1)}×`)));
    s.append(row('Balik sumbu Y', check(settings.invertY, (v) => this.h.set('invertY', v))));
    s.append(row('Tampilkan petunjuk tombol', check(settings.hints, (v) => this.h.set('hints', v))));
    return s;
  }

  keys(view) {
    const s = section('Tombol');
    const grid = el('div', 'st-keys');
    for (const [code, label] of view.actions ?? ACTIONS) {
      const waiting = view.listening === code;
      const b = button(waiting ? 'Tekan tombol…' : keyLabel(code), () => this.h.rebind(code), waiting ? 'st-key is-wait' : 'st-key');
      const r = el('div', 'st-keyrow');
      r.append(el('span', 'st-label', label), b);
      grid.append(r);
    }
    s.append(grid, button('Kembalikan tombol awal', () => this.h.resetKeys()));
    return s;
  }

  tutorial(view) {
    const s = section('Tutorial');
    s.append(view.tutorialOn ? button('Lewati tutorial', () => this.h.skipTutorial()) : button('Ulangi tutorial', () => this.h.restartTutorial()));
    return s;
  }
}
