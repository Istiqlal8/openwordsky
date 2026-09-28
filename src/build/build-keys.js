// Build-mode key capture. While build mode is on, these keys, the wheel and a locked-mouse
// left click are caught before the game's Input sees them, so they pick/rotate/paint/place
// pieces instead of switching weapons, gathering or firing the mining beam.
import { hub } from './hub.js';

const OPS = {
  KeyR: 'rotate', KeyX: 'remove', KeyC: 'paint', KeyZ: 'undo', KeyQ: 'prevCat', KeyE: 'nextCat',
  Enter: 'place', NumpadEnter: 'place', Escape: 'exit',
};

export class BuildKeys {
  constructor() {
    this.queue = []; // { op: 'pick'|'cycle'|'rotate'|'place'|'remove'|'paint'|'undo'|'cat'|'exit', n? }
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
    const op = /^Digit[0-9]$/.test(c) ? { op: 'pick', n: (Number(c[5]) + 9) % 10 }
      : OPS[c] === 'prevCat' ? { op: 'cat', n: -1 }
        : OPS[c] === 'nextCat' ? { op: 'cat', n: 1 }
          : OPS[c] ? { op: OPS[c] } : null;
    if (!op) return;
    this.queue.push(op);
    e.stopPropagation();
    if (c !== 'Escape') e.preventDefault();
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
