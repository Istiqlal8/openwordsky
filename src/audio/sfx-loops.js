// Continuous toggled sounds (mining beam, alarm), mixed into Sfx.prototype.
import { lfo, stopAll } from './synth.js';

const RELEASE = 0.12;

// Fade a loop out, then stop and disconnect its nodes.
function release(ctx, loop) {
  loop.gain.gain.setTargetAtTime(0, ctx.currentTime, RELEASE / 3);
  setTimeout(() => stopAll(loop.nodes), RELEASE * 1000 + 150);
}

function osc(ctx, type, freq, dest) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.connect(dest);
  o.start();
  return o;
}

// Buzzing beam: detuned saw + square through a wobbling bandpass.
function buildBeam(ctx, dest) {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 900;
  filter.Q.value = 4;
  filter.connect(gain).connect(dest);
  const a = osc(ctx, 'sawtooth', 110, filter);
  const b = osc(ctx, 'square', 221, filter);
  const [w, wg] = lfo(ctx, filter.frequency, 7, 350);
  const [tr, tg] = lfo(ctx, gain.gain, 23, 0.02);
  gain.gain.setTargetAtTime(0.07, ctx.currentTime, 0.04);
  return { gain, nodes: [a, b, w, wg, tr, tg, filter, gain] };
}

// Two-tone siren: square LFO flips pitch between ~560 and ~760 Hz.
function buildAlarm(ctx, dest) {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2400;
  filter.connect(gain).connect(dest);
  const tone = osc(ctx, 'square', 660, filter);
  const [flip, fg] = lfo(ctx, tone.frequency, 1.6, 100);
  flip.type = 'square';
  gain.gain.setTargetAtTime(0.035, ctx.currentTime, 0.03);
  return { gain, nodes: [tone, flip, fg, filter, gain] };
}

export const LoopSfx = {
  // Idempotent: safe to call every frame with the current state.
  mineBeam(on) { this.toggleLoop('beamLoop', on, buildBeam); },
  alarm(on) { this.toggleLoop('alarmLoop', on, buildAlarm); },

  toggleLoop(key, on, build) {
    if (on && !this[key] && this.live) this[key] = build(this.ctx, this.fx);
    else if (!on && this[key]) {
      release(this.ctx, this[key]);
      this[key] = null;
    }
  },
};
