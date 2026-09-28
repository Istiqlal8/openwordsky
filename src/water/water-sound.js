// Water audio built on the Sfx public helpers (sfx.n / sfx.t), plus a lowpass the whole
// effects and ambience path is routed through so everything goes muffled under the surface.
// Nothing in src/audio is modified: the filter is spliced in at runtime and removed on dispose.
const DRY = 20000, WET = 620; // lowpass corner above and below the surface

export class WaterSound {
  constructor(sfx) {
    this.sfx = sfx;
    this.filter = null;
    this.target = DRY;
    this.blipT = 0;
  }

  get ctx() { return this.sfx?.ctx ?? null; }

  // Splices our lowpass between the effect/ambience buses and the master gain.
  install() {
    const ctx = this.ctx, s = this.sfx;
    if (this.filter || !ctx || !s.master || !s.fx || !s.ambientBus) return false;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 0.8;
    f.frequency.value = DRY;
    f.connect(s.master);
    try {
      s.fx.disconnect();
      s.fx.connect(f);
      s.ambientBus.disconnect();
      s.ambientBus.connect(f);
    } catch (e) { return false; }
    this.filter = f;
    return true;
  }

  // k: 0 = head out of the water, 1 = fully under.
  setMuffle(k) {
    if (!this.filter && !this.install()) return;
    const next = DRY * Math.pow(WET / DRY, Math.min(1, Math.max(0, k)));
    if (Math.abs(next - this.target) < next * 0.02) return;
    this.target = next;
    this.filter.frequency.setTargetAtTime(next, this.ctx.currentTime, 0.12);
  }

  // power: impact speed in units/s. A step in is a soft plop, a long fall is a boom.
  splash(power) {
    const s = this.sfx;
    if (!s?.live) return;
    const p = Math.min(1, Math.max(0, (power - 0.5) / 15));
    s.n({ filter: 'lowpass', f0: 2400 + 4200 * p, f1: 260, q: 1.1, dur: 0.3 + 0.55 * p, gain: 0.18 + 0.38 * p, attack: 0.006 });
    s.n({ filter: 'bandpass', f0: 800 + 2200 * p, f1: 190, q: 3, dur: 0.2 + 0.3 * p, gain: 0.1 + 0.22 * p, attack: 0.004 });
    s.t({ type: 'sine', f0: 300 + 280 * p, f1: 68, dur: 0.16 + 0.24 * p, gain: 0.09 + 0.15 * p, attack: 0.004 });
    if (p > 0.35) s.n({ filter: 'lowpass', f0: 900, f1: 140, q: 1, dur: 0.6, gain: 0.16 * p, attack: 0.12, delay: 0.1 });
  }

  // Head breaking back through the surface: a gulp of air and water running off.
  gasp() {
    const s = this.sfx;
    if (!s?.live) return;
    s.n({ filter: 'bandpass', f0: 420, f1: 1700, q: 1.4, dur: 0.36, gain: 0.2, attack: 0.09 });
    s.n({ filter: 'highpass', f0: 1800, f1: 4200, q: 0.8, dur: 0.5, gain: 0.07, attack: 0.02, delay: 0.1 });
  }

  // Stroke-by-stroke swimming noise; called with the stroke phase from the pose.
  stroke(power = 1) {
    const s = this.sfx;
    if (!s?.live) return;
    s.n({ filter: 'bandpass', f0: 700 + Math.random() * 700, f1: 240, q: 1.8, dur: 0.22, gain: 0.07 * power, attack: 0.02 });
  }

  // Suit bubbles while submerged: a sparse stream of little rising blips.
  bubbles(dt) {
    const s = this.sfx;
    if (!s?.live) return;
    if ((this.blipT -= dt) > 0) return;
    this.blipT = 0.35 + Math.random() * 0.75;
    const f = 420 + Math.random() * 700;
    s.t({ type: 'sine', f0: f, f1: f * 2.6, dur: 0.09, gain: 0.05, attack: 0.004 });
  }

  dispose() {
    const s = this.sfx;
    if (!this.filter) return;
    try {
      s.fx.disconnect();
      s.fx.connect(s.master);
      s.ambientBus.disconnect();
      s.ambientBus.connect(s.master);
      this.filter.disconnect();
    } catch (e) { /* the audio context went away with the page */ }
    this.filter = null;
  }
}
