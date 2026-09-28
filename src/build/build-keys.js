// Build-mode key capture. While build mode is on, number keys, R, X, Enter, the wheel and a
// locked-mouse left click are caught before the game's Input sees them, so they pick/rotate/
// place pieces instead of switching weapons or firing the mining beam.
import { hub } from './hub.js';

export class BuildKeys {
  constructor() {
    this.queue = []; // { op: 'pick'|'cycle'|'rotate'|'place'|'remove'|'exit', n? }
    this.onKey = (e) => this.key(e);
    this.onMouse = (e) => this.mouse(e);
    this.onWheel = (e) => this.wheel(e);
    addEventListener('keydown', this.onKey, true);
    addEventListener('mousedown', this.onMouse, true);
    addEventListener('wheel', this.onWheel, { capture: true, passive: true });
  }

  key(e) {
    if (!hub.active || e.repeat) return;
    const c = e.code;
    let op = null;
    if (/^Digit[0-9]$/.test(c)) op = { op: 'pick', n: (Number(c[5]) + 9) % 10 };
    else if (c === 'KeyR') op = { op: 'rotate' };
    else if (c === 'KeyX') op = { op: 'remove' };
    else if (c === 'Enter' || c === 'NumpadEnter') op = { op: 'place' };
    else if (c === 'Escape') op = { op: 'exit' };
    if (!op) return;
    this.queue.push(op);
    e.stopPropagation();
  }

  mouse(e) {
    if (!hub.active || e.button !== 0 || !document.pointerLockElement) return;
    this.queue.push({ op: 'place' });
    e.stopPropagation();
  }

  wheel(e) {
    if (!hub.active || !document.pointerLockElement) return;
    this.queue.push({ op: 'cycle', n: Math.sign(e.deltaY) });
    e.stopPropagation();
  }

  // Ops since the last call.
  take() {
    const q = this.queue;
    this.queue = [];
    return q;
  }

  dispose() {
    removeEventListener('keydown', this.onKey, true);
    removeEventListener('mousedown', this.onMouse, true);
    removeEventListener('wheel', this.onWheel, true);
  }
}
