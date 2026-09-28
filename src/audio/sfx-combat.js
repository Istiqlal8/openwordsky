// Impacts, explosions and the death / reward stings. Mixed into Sfx.prototype.
// explosion(size) scales continuously from a rock cracking (0) to a capital ship going up (1):
// the big end gets real low-end weight, a delayed second rumble and a long reverberant tail.
import { layer, vary, clamp } from './dsp.js';
import { cue, place } from './voices.js';

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Scattered debris ticks after a big blast.
function debris(k, P, s) {
  const n = 3 + Math.round(s * 5);
  for (let i = 0; i < n; i++) {
    layer(k, { noise: 1, filter: 'highpass', ff0: 2200 + Math.random() * 2500, dur: 0.03,
      gain: 0.05 * P.g * (1 - i / (n + 2)), attack: 0.001, delay: 0.08 + Math.random() * (0.6 + s * 0.9), lp: P.lp });
  }
}

function boom(k, P, s) {
  const p = vary(0.08);
  const dur = 0.25 + s * 1.85;
  const wet = P.wet + 0.2 + s * 0.35;
  layer(k, { noise: 1, filter: 'highpass', ff0: 6000 * p, dur: 0.012, gain: (0.10 + s * 0.10) * P.g, attack: 0.001, lp: P.lp });
  layer(k, { noise: 1, filter: 'lowpass', ff0: (4200 - 2200 * s) * p, ff1: 300 - 260 * s, dur,
    gain: (0.28 + s * 0.34) * P.g, attack: 0.004, rate: 0.85 - s * 0.35, grit: s > 0.5 ? 1 : 0,
    wet, lp: P.lp });
  layer(k, { type: 'sine', f0: (150 - 95 * s) * p, f1: 30 - 14 * s, dur: 0.3 + s * 1.9,
    gain: (0.3 + s * 0.5) * P.g, attack: 0.004, wet: wet * 0.6 });
  if (s <= 0.45) {
    layer(k, { type: 'triangle', f0: 320 * p, f1: 95, dur: 0.14, gain: 0.12 * P.g, attack: 0.002 });
    return;
  }
  // Capital scale: a second sub layer, a delayed rumble and a long tail of falling debris.
  layer(k, { type: 'sine', f0: 44 * p, f1: 17, dur: 1.2 + s * 1.6, gain: 0.35 * s * P.g, attack: 0.08, wet });
  layer(k, { noise: 1, filter: 'lowpass', ff0: 500, ff1: 40, dur: 1.4 + s * 1.4, gain: 0.3 * s * P.g,
    attack: 0.12, rate: 0.5, delay: 0.18 + s * 0.1, wet, echo: 0.25, lp: P.lp });
  if (P.detail) debris(k, P, s);
}

export const CombatSfx = {
  // size 0..1: 0 a rock cracking, ~0.6 a pirate dying, 1 a capital ship going up.
  explosion(size = 0.5, at) {
    if (!this.live) return;
    const s = clamp(size, 0, 1);
    const big = s > 0.55;
    const P = cue(this, at, big ? 'boom' : 'pop', big ? 4 : 2, big ? 45 : 30, big ? 2600 : 700);
    if (P) boom(this.kit, P, s);
  },

  // Hull hit: a dull metallic clank with a little weight behind it.
  hit(at) {
    if (!this.live) return;
    const P = cue(this, at, 'hit', 2, 20, 200);
    if (!P) return;
    const k = this.kit, p = vary(0.14);
    layer(k, { noise: 1, filter: 'highpass', ff0: 5500, dur: 0.012, gain: 0.07 * P.g, attack: 0.001, lp: P.lp });
    layer(k, { type: 'sine', f0: 1700 * p, f1: 900, fm: 2500 * p, index: 600, indexDur: 0.04, dur: 0.07,
      gain: 0.085 * P.g, attack: 0.001 });
    layer(k, { type: 'triangle', f0: 2400 * p, f1: 1400, dur: 0.05, gain: 0.05 * P.g, attack: 0.001 });
    layer(k, { type: 'sine', f0: 180, f1: 70, dur: 0.08, gain: 0.07 * P.g, attack: 0.002, wet: P.wet });
  },

  // Shield hit: electric, ringing, nothing like the hull clank.
  shieldHit(at) {
    if (!this.live) return;
    const P = cue(this, at, 'shield', 2, 25, 300);
    if (!P) return;
    const k = this.kit, p = vary(0.1);
    layer(k, { noise: 1, filter: 'bandpass', ff0: 3400 * p, ff1: 1100, q: 9, dur: 0.2, gain: 0.2 * P.g,
      attack: 0.002, rate: 2, wet: P.wet * 3, lp: P.lp });
    layer(k, { type: 'sawtooth', f0: 1400 * p, f1: 400, detune: 20, dur: 0.17, gain: 0.05 * P.g,
      attack: 0.002, grit: 1 });
    layer(k, { type: 'sine', f0: 2600 * p, fm: 3900, index: 400, dur: 0.15, gain: 0.03 * P.g,
      attack: 0.004, wet: P.wet * 3 });
    if (!P.detail) return; // the sparkles never carry across a battlefield
    for (let i = 0; i < 3; i++) {
      layer(k, { noise: 1, filter: 'highpass', ff0: 7000, dur: 0.018, gain: 0.07 * P.g, attack: 0.001,
        delay: 0.02 + Math.random() * 0.13, lp: P.lp });
    }
  },

  // Confirmed kill: the blast plus a short falling sting so the payoff is unmistakable.
  kill(size = 0.6, at) {
    if (!this.live) return;
    this.explosion(size, at);
    const P = cue(this, at, 'kill', 3, 120, 900);
    if (!P) return;
    const k = this.kit;
    [88, 83].forEach((m, i) => {
      layer(k, { type: 'triangle', f0: midiHz(m), dur: 0.22, gain: 0.07 * P.g, attack: 0.005,
        delay: 0.06 + i * 0.1, wet: P.wet * 2.5 });
      layer(k, { type: 'sine', f0: midiHz(m) * 2, dur: 0.14, gain: 0.022 * P.g, attack: 0.005, delay: 0.06 + i * 0.1 });
    });
    layer(k, { type: 'sine', f0: 140, f1: 55, dur: 0.35, gain: 0.16 * P.g, attack: 0.006, delay: 0.05 });
  },

  // Bright pickup blip.
  pickup(at) {
    if (!this.live) return;
    const P = cue(this, at, 'pick', 2, 40, 300);
    if (!P) return;
    const k = this.kit;
    layer(k, { type: 'triangle', f0: 880, f1: 1760, dur: 0.12, gain: 0.1 * P.g, attack: 0.004 });
    layer(k, { type: 'sine', f0: 1320, f1: 1980, dur: 0.16, gain: 0.05 * P.g, attack: 0.004, delay: 0.06, wet: P.wet * 2 });
    layer(k, { noise: 1, filter: 'highpass', ff0: 6000, dur: 0.02, gain: 0.03 * P.g, attack: 0.001, lp: P.lp });
  },

  // The player's own ship breaking up: a long fall with the hull tearing underneath.
  death() {
    if (!this.live) return;
    const k = this.kit, P = place(k);
    this.voices.take('death', 4, 0, 3000);
    layer(k, { type: 'sawtooth', f0: 420, f1: 38, dur: 2.4, gain: 0.08, attack: 0.02, grit: 1 });
    layer(k, { type: 'sine', f0: 120, f1: 24, dur: 2.4, gain: 0.5, attack: 0.01, wet: 0.5 });
    layer(k, { type: 'sine', f0: 46, f1: 18, dur: 3.0, gain: 0.4, attack: 0.15, wet: 0.5 });
    layer(k, { noise: 1, filter: 'lowpass', ff0: 2200, ff1: 60, dur: 2.8, gain: 0.3, attack: 0.01,
      rate: 0.55, wet: 0.6, echo: 0.3, lp: P.lp });
    [67, 63, 60, 55].forEach((m, i) => {
      layer(k, { type: 'triangle', f0: midiHz(m), f1: midiHz(m) * 0.97, dur: 0.9, gain: 0.09,
        delay: 0.3 + i * 0.35, attack: 0.02, wet: 0.45 });
    });
  },

  // Rising shimmer back into the world.
  respawn() {
    if (!this.live) return;
    const k = this.kit;
    layer(k, { noise: 1, filter: 'highpass', ff0: 800, ff1: 7000, dur: 1.4, gain: 0.12, attack: 1.0, wet: 0.4 });
    [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => {
      layer(k, { type: 'triangle', f0: midiHz(m), dur: 0.6, gain: 0.07, delay: i * 0.08, attack: 0.02, wet: 0.35 });
      layer(k, { type: 'sine', f0: midiHz(m) * 2, dur: 0.4, gain: 0.02, delay: i * 0.08 + 0.02, attack: 0.02 });
    });
  },
};
