// Procedural game audio: engine hum, ambience and one-shot effects (WebAudio only).
import { makeNoiseBuffer, tone, noiseBurst, noiseLoop } from './synth.js';
import { buildPlanetAmbient, buildSpaceAmbient } from './ambient.js';
import { CombatSfx } from './sfx-combat.js';
import { LoopSfx } from './sfx-loops.js';
import { GunSfx } from './sfx-guns.js';
import { makeKit } from './voices.js';

const MASTER = 0.55;
const AMBIENT = 0.45;
const FADE = 2;

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engine = null;
    this.scene = null;
    this.kit = null;
    this.wantAmbient = undefined; // last setAmbient() request, replayed on unlock
  }

  // `offline` lets a test render the whole graph into an OfflineAudioContext.
  unlock(offline = null) {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!offline && !AC) return;
    const ctx = offline || new AC();
    this.ctx = ctx;
    this.noise = makeNoiseBuffer(ctx, 2);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER;
    this.master.connect(comp).connect(ctx.destination);
    this.fx = ctx.createGain();
    this.fx.connect(this.master);
    this.ambientBus = ctx.createGain();
    this.ambientBus.gain.value = AMBIENT;
    this.ambientBus.connect(this.master);
    this.kit = makeKit(ctx, this.noise, this.fx);
    if (this.wantAmbient !== undefined) this.setAmbient(this.wantAmbient);
  }

  // Voice budget for combat one-shots; a silent stub before the context exists.
  get voices() { return this.kit?.voices ?? NO_VOICES; }

  // Where the player is hearing from: combat sounds carrying a world position are placed against it.
  // `ref` is the distance (in that view's units) at which a sound is still about half as loud.
  listen(camera, ref = 80) {
    if (!this.kit) return;
    this.kit.listener = camera;
    this.kit.ref = ref;
  }

  // Stop every continuous sound (engine, alarm, mining beam, weapon beam), e.g. on pause.
  silenceLoops() {
    this.setEngine(0);
    this.alarm?.(false);
    this.mineBeam?.(false);
    this.stopGunBeam?.();
  }

  setMuted(muted) {
    this.muted = !!muted;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : MASTER, this.ctx.currentTime, 0.05);
  }

  // True when sound can be made right now.
  get live() { return !!this.ctx && !this.muted; }

  setEngine(level) {
    if (!this.live) return;
    const l = Math.max(0, Math.min(1, level || 0));
    const e = this.engine || this.buildEngine();
    const t = this.ctx.currentTime;
    e.osc.forEach((o, i) => o.frequency.setTargetAtTime((40 + l * 75) * (i ? 1.505 : 1), t, 0.15));
    e.filter.frequency.setTargetAtTime(180 + l * 1600, t, 0.15);
    e.gain.gain.setTargetAtTime(0.012 + l * 0.14, t, 0.15);
  }

  // Two detuned saws + a sub-octave square + rumble noise through one lowpass.
  buildEngine() {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    filter.Q.value = 2;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    filter.connect(gain).connect(this.master);
    const osc = [0, 1].map((i) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.detune.value = i ? 9 : -9;
      o.connect(filter);
      o.start();
      return o;
    });
    const rumble = noiseLoop(ctx, this.noise);
    rumble.playbackRate.value = 0.35;
    const rg = ctx.createGain();
    rg.gain.value = 0.6;
    rumble.connect(rg).connect(filter);
    this.engine = { osc, filter, gain, rumble };
    return this.engine;
  }

  setAmbient(planet) {
    this.wantAmbient = planet || null;
    // Thin air carries less sound; vacuum in space keeps the cinematic mix.
    if (this.kit) this.kit.air = planet ? Math.min(1, 0.25 + (planet.atmosphereDensity ?? 1) * 1.5) : 1;
    if (!this.ctx) return;
    const next = planet
      ? buildPlanetAmbient(this.ctx, this.noise, this.ambientBus, planet)
      : buildSpaceAmbient(this.ctx, this.noise, this.ambientBus);
    if (this.scene) this.scene.stop(FADE);
    next.fadeIn(FADE);
    this.scene = next;
  }

  // Shorthand one-shots routed through the effects bus.
  t(o) { tone(this.ctx, this.fx, o); }
  n(o) { noiseBurst(this.ctx, this.noise, this.fx, o); }

  warp() {
    if (!this.live) return;
    this.n({ filter: 'bandpass', f0: 180, f1: 5000, q: 2, dur: 1.9, gain: 0.5, attack: 1.5 });
    this.t({ type: 'sawtooth', f0: 70, f1: 900, dur: 1.8, gain: 0.08, attack: 1.4 });
    this.t({ type: 'sine', f0: 90, f1: 28, dur: 1.2, gain: 0.7, delay: 1.6, attack: 0.02 });
    this.n({ filter: 'lowpass', f0: 600, f1: 60, dur: 1.0, gain: 0.4, delay: 1.6, attack: 0.01 });
  }

  land() {
    if (!this.live) return;
    this.n({ filter: 'lowpass', f0: 500, f1: 90, q: 3, dur: 1.6, gain: 0.45, attack: 0.3, rate: 0.5 });
    this.t({ type: 'sine', f0: 95, f1: 38, dur: 0.5, gain: 0.6, delay: 1.3, attack: 0.005 });
    this.n({ filter: 'lowpass', f0: 300, f1: 80, dur: 0.35, gain: 0.35, delay: 1.3, attack: 0.005 });
  }

  takeoff() {
    if (!this.live) return;
    this.n({ filter: 'lowpass', f0: 150, f1: 2200, q: 2, dur: 2.2, gain: 0.45, attack: 1.2, rate: 0.6 });
    this.t({ type: 'sawtooth', f0: 45, f1: 180, dur: 2.0, gain: 0.07, attack: 1.0 });
  }

  scan() {
    if (!this.live) return;
    this.t({ type: 'sine', f0: 500, f1: 2400, dur: 0.7, gain: 0.12, attack: 0.05 });
    this.t({ type: 'square', f0: 1800, dur: 0.06, gain: 0.04, delay: 0.75 });
    this.t({ type: 'square', f0: 2400, dur: 0.08, gain: 0.04, delay: 0.87 });
  }

  discover() {
    if (!this.live) return;
    [72, 76, 79, 84, 88].forEach((m, i) => {
      const f = 440 * Math.pow(2, (m - 69) / 12);
      this.t({ type: 'triangle', f0: f, dur: 0.5, gain: 0.14, delay: i * 0.09, attack: 0.01 });
      this.t({ type: 'sine', f0: f * 2, dur: 0.3, gain: 0.03, delay: i * 0.09, attack: 0.01 });
    });
  }

  step() {
    if (!this.live) return;
    const f = 280 + Math.random() * 320;
    this.n({ filter: 'lowpass', f0: f, f1: f * 0.6, q: 1.5, dur: 0.09, gain: 0.18, attack: 0.004 });
  }

  jump() {
    if (!this.live) return;
    this.n({ filter: 'bandpass', f0: 300, f1: 1400, q: 1.2, dur: 0.28, gain: 0.16, attack: 0.03 });
  }

  click() {
    if (!this.live) return;
    this.t({ type: 'sine', f0: 1300, f1: 1000, dur: 0.05, gain: 0.08, attack: 0.002 });
  }
}

// A stub voice budget so combat calls before unlock() are simply refused.
const NO_VOICES = { take: () => false, reset() {} };

// Weapon fire, impacts and toggled loops live in their own modules.
Object.assign(Sfx.prototype, CombatSfx, LoopSfx, GunSfx);
