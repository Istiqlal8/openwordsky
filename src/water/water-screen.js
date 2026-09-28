// Screen-space half of the water feel: a blue-green wash and vignette that deepens as the
// player sinks, and the beads of water left on the visor after surfacing or wading out.
// One DOM layer under the HUD (z-index 9); styling lives in src/ui/water.css.
const BEADS = 34;
const WET_TIME = 2.2;

// Water clings to the rim of a visor, not the middle of the view: every bead hugs one edge.
const rim = () => (Math.random() < 0.5 ? Math.random() * 19 : 81 + Math.random() * 19);
const beadSpot = () => (Math.random() < 0.5
  ? { left: Math.random() * 100, top: rim() }
  : { left: rim(), top: Math.random() * 100 });

function bead() {
  const b = document.createElement('i');
  const s = 5 + Math.random() * 14, at = beadSpot();
  b.style.left = `${at.left}%`;
  b.style.top = `${at.top}%`;
  b.style.width = `${s}px`;
  b.style.height = `${s * (0.7 + Math.random() * 0.7)}px`;
  b.style.animationDelay = `${(Math.random() * 0.9).toFixed(2)}s`;
  return b;
}

export class WaterScreen {
  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'wtr';
    this.tint = document.createElement('div');
    this.tint.className = 'wtr-tint';
    this.wet = document.createElement('div');
    this.wet.className = 'wtr-wet';
    for (let i = 0; i < BEADS; i++) this.wet.appendChild(bead());
    this.root.append(this.tint, this.wet);
    document.body.appendChild(this.root);
    this.deep = 0;
    this.wetT = 0;
    this.shownTint = -1;
    this.shownWet = -1;
  }

  // Water splashed over the visor: 0..1 strength. Restarts the run-off animation.
  splashed(strength = 1) {
    this.wetT = Math.max(this.wetT, WET_TIME * Math.min(1, strength));
    this.wet.classList.remove('is-run');
    void this.wet.offsetWidth; // one reflow per splash, so the beads replay from the top
    this.wet.classList.add('is-run');
  }

  // k: 0 = head out, 1 = well under. depth: metres below the surface, for the vignette.
  update(dt, k, depth) {
    this.wetT = Math.max(0, this.wetT - dt);
    const tint = Math.min(0.92, k * (0.42 + Math.min(0.5, depth * 0.045)));
    this.write(this.tint, 'shownTint', tint);
    this.root.classList.toggle('is-under', k > 0.5);
    const w = Math.min(1, this.wetT / WET_TIME) * 0.85 * (1 - k * 0.8);
    this.write(this.wet, 'shownWet', w);
  }

  // Only touch the DOM when the value actually moved (opacity writes force a repaint).
  write(el, key, value) {
    const v = Math.round(value * 100) / 100;
    if (v === this[key]) return;
    this[key] = v;
    el.style.opacity = v;
  }

  dispose() {
    this.root.remove();
  }
}
