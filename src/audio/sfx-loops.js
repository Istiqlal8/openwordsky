// Continuous toggled sounds (mining beam, alarm, weapon beam), mixed into Sfx.prototype.
import { lfo, stopAll, noiseLoop } from './synth.js';

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

// Cutting beam weapon: two detuned saws through the grit bus and a wobbling bandpass, a whistling
// partial and a hiss. 'ship' is the heavy version, 'hand' the lighter rifle.
const BEAM = { ship: { a: 78, b: 117, band: 520, whistle: 1220, hiss: 3200, level: 0.075 },
  hand: { a: 150, b: 226, band: 900, whistle: 1850, hiss: 4600, level: 0.05 } };

function buildGunBeam(kit, kind) {
  const ctx = kit.ctx, cfg = BEAM[kind] ?? BEAM.ship;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(kit.dry);
  const send = ctx.createGain();
  send.gain.value = 0.35;
  gain.connect(send).connect(kit.verb);
  const bite = ctx.createGain();   // grit sits behind the same envelope, never straight off the filter
  bite.gain.value = 0.5;
  gain.connect(bite).connect(kit.grit);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = cfg.band;
  filter.Q.value = 1.1;
  filter.connect(gain);
  const a = osc(ctx, 'sawtooth', cfg.a, filter);
  const b = osc(ctx, 'sawtooth', cfg.b, filter);
  b.detune.value = 11;
  const wg = ctx.createGain();
  wg.gain.value = 0.12;
  wg.connect(gain);
  const whistle = osc(ctx, 'sine', cfg.whistle, wg);
  const hiss = noiseLoop(ctx, kit.noise);
  const hf = ctx.createBiquadFilter();
  hf.type = 'highpass';
  hf.frequency.value = cfg.hiss;
  const hg = ctx.createGain();
  hg.gain.value = 0.045;
  hiss.connect(hf).connect(hg).connect(gain);
  const mods = [...lfo(ctx, filter.frequency, 9, 280), ...lfo(ctx, gain.gain, 27, 0.018),
    ...lfo(ctx, whistle.frequency, 6.3, 70)];
  gain.gain.setTargetAtTime(cfg.level, ctx.currentTime, 0.02);
  return { gain, nodes: [a, b, whistle, wg, hiss, hf, hg, ...mods, filter, send, bite, gain] };
}

export const LoopSfx = {
  // Idempotent: safe to call every frame with the current state.
  mineBeam(on) { this.toggleLoop('beamLoop', on, buildBeam); },
  alarm(on) { this.toggleLoop('alarmLoop', on, buildAlarm); },

  // Retriggered by each beam damage tick; a watchdog fades it out shortly after the last one.
  gunBeam(on, kind = 'ship') {
    if (!on || !this.live) { this.stopGunBeam(); return; }
    if (this.gunBeamKind && this.gunBeamKind !== kind) this.stopGunBeam();
    this.gunBeamKind = kind;
    this.gunBeamLoop ??= buildGunBeam(this.kit, kind);
    clearTimeout(this.gunBeamTimer);
    this.gunBeamTimer = setTimeout(() => this.stopGunBeam(), 220);
  },

  stopGunBeam() {
    clearTimeout(this.gunBeamTimer);
    this.gunBeamTimer = null;
    if (!this.gunBeamLoop) return;
    release(this.ctx, this.gunBeamLoop);
    this.gunBeamLoop = null;
    this.gunBeamKind = null;
  },

  toggleLoop(key, on, build) {
    if (on && !this[key] && this.live) this[key] = build(this.ctx, this.fx);
    else if (!on && this[key]) {
      release(this.ctx, this[key]);
      this[key] = null;
    }
  },
};
