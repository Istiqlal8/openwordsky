// Extra synthesis the mech's weapons need on top of the game's Sfx bus: a shared echo send that
// gives the big guns a tail, a weighted sub-thump, and the three sounds that have to run
// continuously — the gatling's brap, the particle beam's roar and the lit saber's hum.
// Built on src/audio/synth.js and the Sfx loop machinery; nothing is allocated per frame.
import { tone, noiseBurst, noiseLoop, lfo } from '../audio/synth.js';

// Slight detune per shot, so a burst never sounds like the same sample twice.
export const vary = (a = 0.08) => 1 + (Math.random() * 2 - 1) * a;

// Feedback delay shared by every mech weapon, built once per audio context.
function bus(sfx) {
  if (!sfx?.live) return null;
  if (sfx.mechBus?.ctx === sfx.ctx) return sfx.mechBus;
  const ctx = sfx.ctx;
  const send = ctx.createGain();
  const delay = ctx.createDelay(0.6);
  const fb = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  const out = ctx.createGain();
  send.gain.value = 0.5;
  delay.delayTime.value = 0.135;
  fb.gain.value = 0.32;
  lp.type = 'lowpass';
  lp.frequency.value = 2000;
  out.gain.value = 0.55;
  send.connect(delay).connect(lp).connect(fb).connect(delay);
  lp.connect(out).connect(sfx.fx);
  sfx.mechBus = { ctx, send };
  return sfx.mechBus;
}

// The same burst thrown into the echo send instead of dry: a room behind the shot.
export function tail(sfx, o, kind = 'n') {
  const b = bus(sfx);
  if (!b) return;
  if (kind === 't') tone(sfx.ctx, b.send, o);
  else noiseBurst(sfx.ctx, sfx.noise, b.send, o);
}

// Low-end weight: a sine drop with a triangle sub-octave under it.
export function thump(sfx, f, gain, dur = 0.4) {
  sfx.t({ type: 'sine', f0: f, f1: f * 0.26, dur, gain, attack: 0.003 });
  sfx.t({ type: 'triangle', f0: f * 0.5, f1: f * 0.24, dur: dur * 0.7, gain: gain * 0.35, attack: 0.004 });
}

function osc(ctx, type, freq, dest, detune = 0) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  o.connect(dest);
  o.start();
  return o;
}

function filtered(ctx, dest, type, freq, q) {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  f.connect(gain).connect(dest);
  return { gain, filter: f };
}

// Gatling: a rhythmic gate over a buzzing band, so holding the trigger reads as one burst.
function buildBrap(ctx, dest, noise) {
  const { gain, filter } = filtered(ctx, dest, 'bandpass', 1500, 1.3);
  const a = osc(ctx, 'sawtooth', 94, filter);
  const b = osc(ctx, 'square', 47, filter);
  const hiss = noiseLoop(ctx, noise);
  const hg = ctx.createGain();
  hg.gain.value = 0.7;
  hiss.connect(hg).connect(filter);
  const [beat, bg] = lfo(ctx, gain.gain, 19, 0.09);
  beat.type = 'square';
  const [sweep, sg] = lfo(ctx, filter.frequency, 6.5, 420);
  gain.gain.setTargetAtTime(0.09, ctx.currentTime, 0.02);
  return { gain, nodes: [a, b, hiss, hg, beat, bg, sweep, sg, filter, gain] };
}

// Particle beam: a roaring low band with a bass bed under it.
function buildRoar(ctx, dest, noise) {
  const { gain, filter } = filtered(ctx, dest, 'lowpass', 950, 3.2);
  const sub = osc(ctx, 'sine', 52, filter);
  const a = osc(ctx, 'sawtooth', 104, filter, -7);
  const b = osc(ctx, 'sawtooth', 104, filter, 9);
  const roar = noiseLoop(ctx, noise);
  const rg = ctx.createGain();
  rg.gain.value = 1.3;
  roar.connect(rg).connect(filter);
  const [w, wg] = lfo(ctx, filter.frequency, 5.5, 280);
  const [tr, tg] = lfo(ctx, gain.gain, 31, 0.012);
  gain.gain.setTargetAtTime(0.12, ctx.currentTime, 0.05);
  return { gain, nodes: [sub, a, b, roar, rg, w, wg, tr, tg, filter, gain] };
}

// Lit saber: two nearly detuned saws through a narrow band, breathing slowly.
function buildHum(ctx, dest) {
  const { gain, filter } = filtered(ctx, dest, 'bandpass', 520, 6);
  const a = osc(ctx, 'sawtooth', 118, filter);
  const b = osc(ctx, 'sawtooth', 118, filter, 13);
  const c = osc(ctx, 'square', 236, filter, -6);
  const [w, wg] = lfo(ctx, filter.frequency, 0.7, 70);
  const [tr, tg] = lfo(ctx, gain.gain, 5.5, 0.014);
  gain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.04);
  return { gain, nodes: [a, b, c, w, wg, tr, tg, filter, gain] };
}

const loop = (sfx, key, on, build) => sfx?.toggleLoop?.(key, on, (ctx, dest) => build(ctx, dest, sfx.noise));

export const brapLoop = (sfx, on) => loop(sfx, 'mechBrap', on, buildBrap);
export const roarLoop = (sfx, on) => loop(sfx, 'mechRoar', on, buildRoar);
export const humLoop = (sfx, on) => loop(sfx, 'mechHum', on, buildHum);

export function stopMechLoops(sfx) {
  brapLoop(sfx, false);
  roarLoop(sfx, false);
  humLoop(sfx, false);
}
