// Combat, loot and death one-shots, mixed into Sfx.prototype (uses this.t / this.n).
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export const CombatSfx = {
  // Short zappy pew.
  laser() {
    if (!this.live) return;
    this.t({ type: 'square', f0: 1900, f1: 280, dur: 0.12, gain: 0.07, attack: 0.002 });
    this.t({ type: 'sawtooth', f0: 3200, f1: 900, dur: 0.06, gain: 0.03, attack: 0.001 });
    this.n({ filter: 'highpass', f0: 4000, dur: 0.04, gain: 0.05, attack: 0.001 });
  },

  // Lower, harsher enemy fire.
  enemyLaser() {
    if (!this.live) return;
    this.t({ type: 'sawtooth', f0: 760, f1: 110, dur: 0.2, gain: 0.08, attack: 0.002 });
    this.t({ type: 'square', f0: 520, f1: 80, dur: 0.18, gain: 0.05, attack: 0.002, detune: 35 });
    this.n({ filter: 'bandpass', f0: 1400, f1: 300, q: 3, dur: 0.12, gain: 0.08, attack: 0.002 });
  },

  // Whoosh launch.
  rocket() {
    if (!this.live) return;
    this.n({ filter: 'bandpass', f0: 350, f1: 2600, q: 1.5, dur: 0.7, gain: 0.3, attack: 0.03, rate: 0.8 });
    this.t({ type: 'sawtooth', f0: 80, f1: 240, dur: 0.5, gain: 0.05, attack: 0.02 });
    this.n({ filter: 'lowpass', f0: 500, f1: 120, dur: 0.25, gain: 0.25, attack: 0.002 });
  },

  // Noise burst + low boom; size 0..1 scales length and volume.
  explosion(size = 0.5) {
    if (!this.live) return;
    const s = clamp01(size);
    const dur = 0.5 + s * 1.6;
    this.n({ filter: 'lowpass', f0: 2600 + s * 2000, f1: 60, dur, gain: 0.25 + s * 0.35, attack: 0.004, rate: 0.7 });
    this.t({ type: 'sine', f0: 90, f1: 24, dur: 0.4 + s * 0.9, gain: 0.35 + s * 0.45, attack: 0.004 });
    this.n({ filter: 'highpass', f0: 2500, f1: 900, dur: 0.15 + s * 0.3, gain: 0.08 + s * 0.1, attack: 0.002 });
  },

  // Metallic tick.
  hit() {
    if (!this.live) return;
    this.t({ type: 'triangle', f0: 2300, f1: 1500, dur: 0.06, gain: 0.08, attack: 0.001 });
    this.t({ type: 'square', f0: 3700, dur: 0.03, gain: 0.025, attack: 0.001 });
    this.n({ filter: 'highpass', f0: 5000, dur: 0.04, gain: 0.06, attack: 0.001 });
  },

  // Electric crackle.
  shieldHit() {
    if (!this.live) return;
    this.n({ filter: 'bandpass', f0: 3200, f1: 1200, q: 8, dur: 0.18, gain: 0.18, attack: 0.002, rate: 2 });
    this.t({ type: 'sawtooth', f0: 1300, f1: 380, dur: 0.16, gain: 0.04, attack: 0.002, detune: 20 });
    for (let i = 0; i < 3; i++) {
      this.n({ filter: 'highpass', f0: 6000, dur: 0.02, gain: 0.07, attack: 0.001, delay: 0.03 + Math.random() * 0.12 });
    }
  },

  // Bright blip.
  pickup() {
    if (!this.live) return;
    this.t({ type: 'triangle', f0: 880, f1: 1760, dur: 0.12, gain: 0.1, attack: 0.004 });
    this.t({ type: 'sine', f0: 1320, dur: 0.16, gain: 0.06, attack: 0.004, delay: 0.06 });
  },

  // Dramatic descending fall.
  death() {
    if (!this.live) return;
    this.t({ type: 'sawtooth', f0: 420, f1: 38, dur: 2.4, gain: 0.08, attack: 0.02 });
    this.t({ type: 'sine', f0: 120, f1: 28, dur: 2.2, gain: 0.5, attack: 0.01 });
    this.n({ filter: 'lowpass', f0: 2200, f1: 70, dur: 2.6, gain: 0.3, attack: 0.01, rate: 0.6 });
    [67, 63, 60, 55].forEach((m, i) => {
      const f = 440 * Math.pow(2, (m - 69) / 12);
      this.t({ type: 'triangle', f0: f, f1: f * 0.97, dur: 0.9, gain: 0.09, delay: 0.3 + i * 0.35, attack: 0.02 });
    });
  },

  // Rising shimmer.
  respawn() {
    if (!this.live) return;
    this.n({ filter: 'highpass', f0: 800, f1: 7000, q: 1, dur: 1.4, gain: 0.12, attack: 1.0 });
    [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => {
      const f = 440 * Math.pow(2, (m - 69) / 12);
      this.t({ type: 'triangle', f0: f, dur: 0.6, gain: 0.07, delay: i * 0.08, attack: 0.02 });
      this.t({ type: 'sine', f0: f * 2, dur: 0.4, gain: 0.02, delay: i * 0.08 + 0.02, attack: 0.02 });
    });
  },
};
