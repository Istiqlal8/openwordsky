// Death overlay: title, cause, lost items, respawn button with auto countdown.
import { el, clear, show } from './dom.js';

const AUTO_S = 6;
const FADE_MS = 500;

export class DeathScreen {
  constructor(root) {
    this.root = root;
    this.onRespawn = null;
    this.overlay = el('div', 'screen death is-hidden');
    this.box = el('div', 'death-box');
    this.button = el('button', 'btn btn-primary death-btn');
    this.button.type = 'button';
    this.button.addEventListener('click', () => this.respawn());
    this.onKey = (e) => { if (e.code === 'Enter' || e.code === 'NumpadEnter') this.respawn(); };
    this.overlay.append(this.box);
    root.append(this.overlay);
  }

  get isOpen() { return !!this.onRespawn; }

  show({ title = 'Kamu Tewas', cause = '', lost = [] } = {}, onRespawn = () => {}) {
    clearTimeout(this.hideTimer);
    this.onRespawn = onRespawn;
    this.build(title, cause, lost);
    show(this.overlay, true);
    void this.overlay.offsetWidth;
    this.overlay.classList.add('is-on');
    this.startCountdown();
    addEventListener('keydown', this.onKey);
  }

  build(title, cause, lost) {
    clear(this.box);
    this.box.append(el('div', 'death-title', title));
    if (cause) this.box.append(el('div', 'death-cause', cause));
    if (lost.length) {
      const list = el('ul', 'death-lost');
      for (const item of lost) list.append(el('li', null, item));
      this.box.append(el('div', 'panel-label death-lost-label', 'Barang hilang'), list);
    }
    this.box.append(this.button);
  }

  startCountdown() {
    this.left = AUTO_S;
    this.renderButton();
    clearInterval(this.tick);
    this.tick = setInterval(() => {
      this.left -= 1;
      if (this.left <= 0) this.respawn();
      else this.renderButton();
    }, 1000);
  }

  renderButton() {
    this.button.textContent = `Bangkit ${this.left}`;
  }

  // Fire the callback once, then fade out.
  respawn() {
    const cb = this.onRespawn;
    if (!cb) return;
    this.hide();
    cb();
  }

  hide() {
    this.onRespawn = null;
    clearInterval(this.tick);
    removeEventListener('keydown', this.onKey);
    this.overlay.classList.remove('is-on');
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => show(this.overlay, false), FADE_MS);
  }
}
