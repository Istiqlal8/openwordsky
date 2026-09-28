// Keyboard + mouse state with pointer lock.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressed = new Set();
    this.mouse = { dx: 0, dy: 0, wheel: 0 };
    this.buttons = new Set();
    this.justClicked = new Set();
    this.locked = false;
    this.remap = {};        // settings: physical code -> logical code ('' = muted)
    this.sens = 1;          // settings: mouse sensitivity
    this.invertY = false;
    this.uiCapture = false; // true while a panel owns the number keys (no weapon switching)
    this.bind();
  }

  bind() {
    addEventListener('keydown', (e) => {
      const code = this.translate(e);
      if (code && !this.keys.has(code)) this.justPressed.add(code);
      if (code) this.keys.add(code);
      if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', (e) => { const code = this.translate(e); if (code) this.keys.delete(code); });
    addEventListener('blur', () => { this.keys.clear(); this.buttons.clear(); });
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouse.dx += e.movementX * this.sens;
      this.mouse.dy += e.movementY * this.sens * (this.invertY ? -1 : 1);
    });
    addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      this.buttons.add(e.button);
      this.justClicked.add(e.button);
    });
    addEventListener('mouseup', (e) => this.buttons.delete(e.button));
    addEventListener('contextmenu', (e) => { if (this.locked) e.preventDefault(); });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
    });
  }

  // Rebound keys: returns the logical code, and re-sends the event with it so panels that
  // listen to DOM keydown see the action key too. Echoed events are ignored here.
  translate(e) {
    if (e.remapped) return null;
    const code = this.remap[e.code];
    if (code === undefined) return e.code;
    if (!code) return null;
    const echo = new KeyboardEvent(e.type, { code, key: e.key, repeat: e.repeat, shiftKey: e.shiftKey, bubbles: true });
    echo.remapped = true;
    document.dispatchEvent(echo);
    return code;
  }

  lock() {
    if (!this.locked) this.canvas.requestPointerLock?.();
  }

  unlock() {
    if (this.locked) document.exitPointerLock?.();
  }

  down(code) { return this.keys.has(code); }
  pressed(code) { return this.justPressed.has(code); }
  // button: 0 = left, 2 = right
  mouseDown(button) { return this.buttons.has(button); }
  clicked(button) { return this.justClicked.has(button); }

  endFrame() {
    this.justPressed.clear();
    this.justClicked.clear();
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.mouse.wheel = 0;
  }
}
