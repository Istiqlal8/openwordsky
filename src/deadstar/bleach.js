// The sky washing out while the star tears itself apart. A single fixed overlay with inline
// styles: style.css is shared with every other feature, and one div costs nothing.
const BASE = 'position:fixed;inset:0;pointer-events:none;z-index:70;opacity:0;'
  + 'background:radial-gradient(circle at 50% 45%, #fff 0%, #ffe9d2 38%, rgba(255,214,180,0) 78%);';

export class Bleach {
  constructor() {
    this.el = null;
    this.level = -1;
  }

  // level 0..1. Cheap enough to call every frame: the DOM write is skipped unless it moved.
  set(level) {
    const v = level < 0 ? 0 : level > 1 ? 1 : level;
    if (Math.abs(v - this.level) < 0.004) return;
    this.level = v;
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.style.cssText = BASE;
      document.body.append(this.el);
    }
    this.el.style.opacity = v.toFixed(3);
  }

  dispose() {
    this.el?.remove();
    this.el = null;
    this.level = -1;
  }
}
