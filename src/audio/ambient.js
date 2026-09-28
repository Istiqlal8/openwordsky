// Ambient soundscapes: planet-specific (seeded) or deep space.
import { Rng } from '../core/rng.js';
import { noiseLoop, lfo, tone, stopAll, midiHz } from './synth.js';

const SCALES = [
  [0, 4, 7, 11, 14], // major 9
  [0, 3, 7, 10, 14], // minor 9
  [0, 2, 7, 9, 14],  // sus / pentatonic
  [0, 4, 6, 11, 18], // lydian
  [0, 3, 6, 10, 13], // dark, half-diminished
];

class Scene {
  constructor(ctx, dest) {
    this.ctx = ctx;
    this.nodes = [];
    this.timers = [];
    this.gain = ctx.createGain();
    this.gain.gain.value = 0.0001;
    this.gain.connect(dest);
    this.nodes.push(this.gain);
  }

  add(...nodes) { this.nodes.push(...nodes); return nodes[0]; }

  fadeIn(sec) {
    const g = this.gain.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(1, t + sec);
  }

  // Fade out, then stop and disconnect everything.
  stop(sec) {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.stopped = true;
    const g = this.gain.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0.0001, t + sec);
    setTimeout(() => stopAll(this.nodes), (sec + 0.3) * 1000);
  }
}

// Detuned oscillator pair per chord note, through a breathing lowpass.
function addPad(scene, notes, level, type = 'triangle') {
  const { ctx } = scene;
  const filter = scene.add(ctx.createBiquadFilter());
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.Q.value = 0.7;
  const g = scene.add(ctx.createGain());
  g.gain.value = level;
  filter.connect(g).connect(scene.gain);
  scene.add(...lfo(ctx, filter.frequency, 0.05, 450));
  scene.add(...lfo(ctx, g.gain, 0.07, level * 0.4));
  for (const m of notes) {
    for (const cents of [-7, 7]) {
      const osc = scene.add(ctx.createOscillator());
      osc.type = type;
      osc.frequency.value = midiHz(m);
      osc.detune.value = cents;
      osc.connect(filter);
      osc.start();
    }
  }
}

// Filtered looping noise, e.g. wind or rain.
function addNoise(scene, noise, type, freq, q, level, sweep) {
  const { ctx } = scene;
  const src = scene.add(noiseLoop(ctx, noise));
  const f = scene.add(ctx.createBiquadFilter());
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = scene.add(ctx.createGain());
  g.gain.value = level;
  src.connect(f).connect(g).connect(scene.gain);
  if (sweep) {
    scene.add(...lfo(ctx, f.frequency, 0.09, freq * 0.5));
    scene.add(...lfo(ctx, g.gain, 0.13, level * 0.6));
  }
}

// Seeded creature call: a short burst of pitch-swept blips.
function chirpVoice(rng) {
  return {
    base: rng.range(500, 2600), ratio: rng.range(0.5, 2.2), notes: 1 + rng.int(4),
    gap: rng.range(0.06, 0.18), dur: rng.range(0.05, 0.16), type: rng.pick(['sine', 'triangle', 'square']),
  };
}

function scheduleChirps(scene, voices) {
  if (scene.stopped) return;
  const wait = 1500 + Math.random() * 5000;
  scene.timers.push(setTimeout(() => {
    if (scene.stopped) return;
    const v = voices[Math.floor(Math.random() * voices.length)];
    const pitch = 0.9 + Math.random() * 0.2;
    for (let i = 0; i < v.notes; i++) {
      tone(scene.ctx, scene.gain, { type: v.type, f0: v.base * pitch, f1: v.base * pitch * v.ratio,
        dur: v.dur, delay: i * v.gap, gain: v.type === 'square' ? 0.012 : 0.03, attack: 0.005 });
    }
    scheduleChirps(scene, voices);
  }, wait));
}

export function buildPlanetAmbient(ctx, noise, dest, planet) {
  const scene = new Scene(ctx, dest);
  const rng = new Rng(planet.seed ^ 0x5a17);
  const root = 38 + rng.int(10);
  const scale = rng.pick(SCALES);
  const notes = [root, root + 12].concat(rng.take(scale.slice(1), 2).map((i) => root + 12 + i));
  addPad(scene, notes, 0.05, rng.pick(['triangle', 'sine']));
  const weather = planet.weather || '';
  const airless = planet.atmosphereDensity === 0;
  const windy = /Badai|Angin/.test(weather);
  const wind = airless ? 0.01 : windy ? 0.35 : 0.08;
  addNoise(scene, noise, 'bandpass', windy ? 700 : 450, 0.8, wind, true);
  if (/Hujan|Gerimis/.test(weather)) addNoise(scene, noise, 'highpass', 2500, 0.5, 0.1, false);
  if (planet.fauna && planet.fauna.count > 0) {
    const voices = Array.from({ length: 1 + rng.int(3) }, () => chirpVoice(rng));
    scheduleChirps(scene, voices);
  }
  return scene;
}

export function buildSpaceAmbient(ctx, noise, dest) {
  const scene = new Scene(ctx, dest);
  addPad(scene, [31, 38, 43], 0.06, 'sine');
  addNoise(scene, noise, 'bandpass', 6500, 6, 0.03, true);
  return scene;
}
