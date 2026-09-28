// Full-screen overlays: title screen and pause screen.
import { el, show, keyRow } from './dom.js';

const CONTROLS = [
  ['Mouse', 'Lihat'],
  ['W A S D', 'Gerak'],
  ['R / C', 'Naik / turun'],
  ['Space', 'Lompat'],
  ['Shift', 'Boost'],
  ['E', 'Mendarat / naik pesawat'],
  ['F', 'Pindai'],
  ['M', 'Peta galaksi'],
  ['Space', 'Pulse (angkasa)'],
  ['N', 'Zoom peta mini'],
  ['Klik\u00a0kiri', 'Laser / tambang'],
  ['Klik\u00a0kanan', 'Roket / blaster'],
  ['V', 'Kamera'],
  ['H', 'Hangar'],
  ['G', 'Isi suit / daya'],
  ['Tab', 'Inventori'],
  ['Esc', 'Lepas mouse'],
];

export class TitleScreen {
  constructor(parent) {
    this.root = el('div', 'screen screen-title is-hidden');
    this.onStart = null;
    this.root.append(this.buildHeader(), this.buildControls(), this.buildFooter());
    this.root.addEventListener('click', () => this.onStart && this.onStart());
    parent.append(this.root);
  }

  buildHeader() {
    const head = el('div', 'title-head');
    head.append(el('div', 'title-kicker', 'Galaksi prosedural'));
    head.append(el('h1', 'title-name', 'OPEN WORLD SKY'));
    head.append(el('div', 'title-tagline', '4.096 sistem bintang. Setiap planet berbeda.'));
    return head;
  }

  buildControls() {
    const box = el('div', 'panel title-controls');
    box.append(el('div', 'panel-label', 'Kontrol'));
    const grid = el('div', 'title-grid');
    for (const [k, label] of CONTROLS) grid.append(keyRow(k, label));
    box.append(grid);
    return box;
  }

  buildFooter() {
    const foot = el('div', 'title-foot');
    this.stats = el('div', 'title-stats');
    const btn = el('button', 'btn btn-primary', 'Mulai');
    btn.type = 'button';
    foot.append(this.stats, btn);
    return foot;
  }

  set(visible, info) {
    show(this.root, visible);
    if (!info) return;
    this.stats.textContent =
      `Penemuan ${info.discoveries ?? 0}  ·  Sistem dikunjungi ${info.visited ?? 0}`;
  }
}

export class PauseScreen {
  constructor(parent) {
    this.root = el('div', 'screen screen-pause is-hidden');
    const box = el('div', 'pause-box');
    box.append(el('div', 'pause-title', 'Jeda'), el('div', 'pause-hint', 'Klik untuk lanjut'));
    this.root.append(box);
    parent.append(this.root);
  }

  set(visible) {
    show(this.root, visible);
  }
}
