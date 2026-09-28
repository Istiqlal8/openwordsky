// Weapon fire: ship guns, enemy guns, sentinel drones and the seven hand weapons.
// Each sound is a transient + body + tail so the classes stay apart by timbre, not just pitch.
// Mixed into Sfx.prototype; `this.kit` carries the buses, the voice cap and the distance model.
import { layer, vary } from './dsp.js';
import { place } from './voices.js';

// --- ship primary weapons -------------------------------------------------------------------

// Bright snappy pulse: hard click, falling square body, short hiss tail with a slap echo.
function shipLaser(k, P) {
  const p = vary(0.07);
  layer(k, { noise: 1, filter: 'highpass', ff0: 5200, dur: 0.022, gain: 0.13 * P.g, attack: 0.001, lp: P.lp });
  layer(k, { type: 'square', f0: 2400 * p, f1: 300, dur: 0.10, gain: 0.115 * P.g, attack: 0.0015, wet: P.wet });
  layer(k, { type: 'sawtooth', f0: 3600 * p, f1: 1400, dur: 0.05, gain: 0.045 * P.g, attack: 0.001 });
  layer(k, { type: 'sine', f0: 230, f1: 90, dur: 0.07, gain: 0.075 * P.g, attack: 0.002 });
  layer(k, { noise: 1, filter: 'bandpass', ff0: 3200 * p, ff1: 900, q: 2, dur: 0.14, gain: 0.06 * P.g,
    attack: 0.002, wet: P.wet * 1.4, echo: 0.2, lp: P.lp });
}

// Heavy wet slug: FM grit over a deep sub drop.
function plasma(k, P) {
  const p = vary(0.06);
  layer(k, { noise: 1, filter: 'lowpass', ff0: 1200, dur: 0.02, gain: 0.12 * P.g, attack: 0.001, lp: P.lp });
  layer(k, { type: 'sawtooth', f0: 210 * p, f1: 88, fm: 104 * p, index: 700, indexDur: 0.18, dur: 0.34,
    gain: 0.15 * P.g, attack: 0.004, grit: 1 });
  layer(k, { type: 'sine', f0: 340 * p, f1: 46, dur: 0.42, gain: 0.32 * P.g, attack: 0.004, wet: P.wet });
  layer(k, { noise: 1, filter: 'lowpass', ff0: 2600, ff1: 140, dur: 0.3, gain: 0.16 * P.g, attack: 0.002,
    rate: 0.8, wet: P.wet * 2, lp: P.lp });
}

// Shotgun crack: broadband burst, low punch, three shell-rattle taps.
function flak(k, P) {
  const p = vary(0.08);
  layer(k, { noise: 1, filter: 'highpass', ff0: 7000, dur: 0.008, gain: 0.16 * P.g, attack: 0.0008, lp: P.lp });
  layer(k, { noise: 1, filter: 'lowpass', ff0: 6800 * p, ff1: 320, dur: 0.17, gain: 0.32 * P.g, attack: 0.001,
    grit: 1, wet: P.wet, lp: P.lp });
  layer(k, { type: 'triangle', f0: 210 * p, f1: 42, dur: 0.15, gain: 0.22 * P.g, attack: 0.001 });
  for (let i = 0; i < 3; i++) {
    layer(k, { noise: 1, filter: 'highpass', ff0: 4000, dur: 0.02, gain: 0.05 * P.g, attack: 0.001,
      delay: 0.03 + i * 0.035 + Math.random() * 0.02, lp: P.lp });
  }
}

// Missile launch: tube pop, sub thump, long hiss, a motor whine that falls away (doppler).
function homing(k, P) {
  const p = vary(0.05);
  layer(k, { noise: 1, filter: 'lowpass', ff0: 220, ff1: 1700, dur: 0.1, gain: 0.22 * P.g, attack: 0.004, lp: P.lp });
  layer(k, { type: 'sine', f0: 95, f1: 36, dur: 0.22, gain: 0.3 * P.g, attack: 0.003 });
  layer(k, { noise: 1, filter: 'bandpass', ff0: 700, ff1: 3000, q: 1.6, dur: 0.65, gain: 0.2 * P.g,
    attack: 0.05, rate: 0.75, wet: P.wet * 2.5, lp: P.lp });
  layer(k, { type: 'sawtooth', f0: 520 * p, f1: 150, dur: 0.8, gain: 0.045 * P.g, attack: 0.03, wet: P.wet * 2 });
  layer(k, { type: 'square', f0: 1100, f1: 2100, dur: 0.07, gain: 0.035 * P.g, attack: 0.002, delay: 0.02 });
}

// Micro-missile ripple: five staggered little launches climbing in pitch.
function swarm(k, P) {
  for (let i = 0; i < 5; i++) {
    const d = i * 0.045;
    layer(k, { noise: 1, filter: 'bandpass', ff0: 1400, ff1: 3600, q: 3, dur: 0.12, gain: 0.24 * P.g,
      attack: 0.004, delay: d, wet: P.wet * 2, lp: P.lp });
    layer(k, { type: 'triangle', f0: (1500 + i * 190) * vary(0.04), f1: 2700, dur: 0.06, gain: 0.08 * P.g,
      attack: 0.002, delay: d });
  }
}

// --- enemy and drone fire -------------------------------------------------------------------

// Lower, dirtier, detuned: never mistakable for the player's own gun.
function enemyLaser(k, P) {
  const p = vary(0.09);
  layer(k, { noise: 1, filter: 'highpass', ff0: 3000, dur: 0.018, gain: 0.08 * P.g, attack: 0.001, lp: P.lp });
  layer(k, { type: 'sawtooth', f0: 900 * p, f1: 105, dur: 0.22, gain: 0.10 * P.g, attack: 0.002, grit: 1 });
  layer(k, { type: 'square', f0: 600 * p, f1: 70, detune: 35, dur: 0.18, gain: 0.055 * P.g, attack: 0.002 });
  layer(k, { noise: 1, filter: 'bandpass', ff0: 1600, ff1: 260, q: 3, dur: 0.16, gain: 0.09 * P.g,
    attack: 0.002, wet: P.wet * 1.6, lp: P.lp });
}

// Sentinel drone: two clipped digital pulses with a metallic FM ring.
function sentinel(k, P) {
  const p = vary(0.05);
  layer(k, { noise: 1, filter: 'highpass', ff0: 7000, dur: 0.012, gain: 0.09 * P.g, attack: 0.001, lp: P.lp });
  for (let i = 0; i < 2; i++) {
    layer(k, { type: 'sine', f0: 1500 * p, f1: 900, fm: 2350 * p, index: 900, indexDur: 0.05, dur: 0.07,
      gain: 0.12 * P.g, attack: 0.001, delay: i * 0.055 });
  }
  layer(k, { noise: 1, filter: 'bandpass', ff0: 4200, ff1: 2400, q: 6, dur: 0.12, gain: 0.07 * P.g,
    attack: 0.002, delay: 0.02, wet: P.wet * 3, lp: P.lp });
}

// --- hand weapons ---------------------------------------------------------------------------

const HAND = {
  // Crisp sidearm snap.
  pistol(k, P) {
    const p = vary(0.08);
    layer(k, { noise: 1, filter: 'highpass', ff0: 6000, dur: 0.01, gain: 0.09 * P.g, attack: 0.0008, lp: P.lp });
    layer(k, { type: 'square', f0: 2600 * p, f1: 520, dur: 0.06, gain: 0.07 * P.g, attack: 0.001 });
    layer(k, { type: 'sine', f0: 700 * p, f1: 160, dur: 0.09, gain: 0.09 * P.g, attack: 0.001 });
    layer(k, { noise: 1, filter: 'bandpass', ff0: 2200, ff1: 700, q: 2, dur: 0.1, gain: 0.05 * P.g,
      attack: 0.002, wet: P.wet * 1.5, echo: 0.12, lp: P.lp });
  },
  // Big chest-hitting boom with a mechanical pump afterwards.
  shotgun(k, P) {
    const p = vary(0.07);
    layer(k, { noise: 1, filter: 'highpass', ff0: 8000, dur: 0.006, gain: 0.18 * P.g, attack: 0.0006, lp: P.lp });
    layer(k, { noise: 1, filter: 'lowpass', ff0: 7000 * p, ff1: 260, dur: 0.26, gain: 0.38 * P.g,
      attack: 0.001, grit: 1, wet: P.wet * 1.4, lp: P.lp });
    layer(k, { type: 'sine', f0: 170 * p, f1: 40, dur: 0.24, gain: 0.4 * P.g, attack: 0.002 });
    layer(k, { noise: 1, filter: 'bandpass', ff0: 3000, q: 4, dur: 0.04, gain: 0.05 * P.g, attack: 0.001,
      delay: 0.19, lp: P.lp });
  },
  // Crystalline: bell partials plus a glassy shimmer tail.
  ice(k, P) {
    const p = vary(0.05);
    layer(k, { type: 'triangle', f0: 3400 * p, f1: 2000, dur: 0.13, gain: 0.10 * P.g, attack: 0.001 });
    layer(k, { type: 'sine', f0: 5400 * p, f1: 4300, dur: 0.2, gain: 0.055 * P.g, attack: 0.002, delay: 0.02 });
    layer(k, { noise: 1, filter: 'highpass', ff0: 7000, ff1: 4000, dur: 0.11, gain: 0.08 * P.g, attack: 0.001, lp: P.lp });
    layer(k, { type: 'sine', f0: 4200 * p, fm: 6300, index: 300, dur: 0.18, gain: 0.05 * P.g,
      attack: 0.004, wet: P.wet * 4 });
  },
  // Launcher thunk: hollow, low, no crack.
  grenade(k, P) {
    const p = vary(0.06);
    layer(k, { type: 'sine', f0: 240 * p, f1: 70, dur: 0.18, gain: 0.32 * P.g, attack: 0.002 });
    layer(k, { noise: 1, filter: 'bandpass', ff0: 900, ff1: 280, q: 2, dur: 0.2, gain: 0.2 * P.g,
      attack: 0.002, wet: P.wet * 1.5, lp: P.lp });
    layer(k, { noise: 1, filter: 'highpass', ff0: 4500, dur: 0.012, gain: 0.05 * P.g, attack: 0.001, lp: P.lp });
  },
  // Railgun: hard snap, a long falling saw and a sub that keeps rolling.
  rail(k, P) {
    const p = vary(0.04);
    layer(k, { noise: 1, filter: 'highpass', ff0: 9000, dur: 0.005, gain: 0.18 * P.g, attack: 0.0005, lp: P.lp });
    layer(k, { type: 'sawtooth', f0: 3400 * p, f1: 130, dur: 0.4, gain: 0.08 * P.g, attack: 0.001, grit: 1 });
    layer(k, { type: 'sine', f0: 120 * p, f1: 32, dur: 0.55, gain: 0.42 * P.g, attack: 0.002, wet: P.wet });
    layer(k, { noise: 1, filter: 'highpass', ff0: 3600, ff1: 700, dur: 0.32, gain: 0.14 * P.g, attack: 0.001,
      wet: P.wet * 2.5, echo: 0.4, lp: P.lp });
  },
  // Rising charge tick; `amount` is the charge level 0..1.
  charge(k, P, amount = 0) {
    const f = 300 + amount * 1700;
    layer(k, { type: 'sine', f0: f, f1: f * 1.08, dur: 0.07, gain: 0.03 * P.g, attack: 0.012 });
    layer(k, { noise: 1, filter: 'bandpass', ff0: f * 2, ff1: f * 2.4, q: 9, dur: 0.07, gain: 0.02 * P.g, attack: 0.012, lp: P.lp });
  },
  // Venting steam and a strained tone.
  overheat(k, P) {
    layer(k, { noise: 1, filter: 'highpass', ff0: 2800, ff1: 800, dur: 0.6, gain: 0.13 * P.g, attack: 0.02,
      wet: P.wet * 2, lp: P.lp });
    layer(k, { type: 'square', f0: 540, f1: 360, dur: 0.2, gain: 0.035 * P.g, attack: 0.003 });
    layer(k, { noise: 1, filter: 'bandpass', ff0: 5200, q: 2, dur: 0.35, gain: 0.06 * P.g, attack: 0.08, delay: 0.1, lp: P.lp });
  },
  // Dead trigger: a dry mechanical click, nothing else.
  empty(k, P) {
    layer(k, { noise: 1, filter: 'highpass', ff0: 2500, dur: 0.012, gain: 0.05 * P.g, attack: 0.001, lp: P.lp });
    layer(k, { type: 'square', f0: 190, f1: 150, dur: 0.03, gain: 0.03 * P.g, attack: 0.001 });
  },
  // Weapon swap: servo whirr into a latch clack.
  equip(k, P) {
    layer(k, { type: 'triangle', f0: 620, f1: 1250, dur: 0.08, gain: 0.05 * P.g, attack: 0.002 });
    layer(k, { noise: 1, filter: 'bandpass', ff0: 1900, q: 3, dur: 0.05, gain: 0.05 * P.g, attack: 0.001, delay: 0.07, lp: P.lp });
  },
  // Freezing hiss that crystallises.
  freeze(k, P) {
    layer(k, { noise: 1, filter: 'bandpass', ff0: 5200, ff1: 1800, q: 4, dur: 0.38, gain: 0.15 * P.g,
      attack: 0.002, wet: P.wet * 4, lp: P.lp });
    layer(k, { type: 'sine', f0: 900, f1: 420, dur: 0.3, gain: 0.05 * P.g, attack: 0.01 });
  },
};

const SHIP = { laser: shipLaser, plasma, flak, homing, swarm };
// [voice key, priority, minimum gap between retriggers in ms]
const GATE = { laser: ['gun', 1, 22], plasma: ['gun', 1, 40], flak: ['gun', 1, 45], homing: ['seek', 2, 60],
  swarm: ['seek', 2, 90], enemy: ['enemy', 1, 28], sentinel: ['drone', 1, 35], hand: ['hand', 2, 18] };

export const GunSfx = {
  // Ship primary weapon by id; 'beam' is a sustained loop, handled in sfx-loops.js.
  gun(id, at) {
    if (!this.live) return;
    if (id === 'beam') { this.gunBeam(true, 'ship'); return; }
    const fn = SHIP[id] ?? shipLaser;
    const [key, prio, gap] = GATE[id] ?? GATE.laser;
    if (!this.voices.take(key, prio, gap)) return;
    fn(this.kit, place(this.kit, at));
  },

  laser(at) { this.gun('laser', at); },
  rocket(at) { this.gun('homing', at); },

  enemyLaser(at) {
    if (!this.live || !this.voices.take(...GATE.enemy)) return;
    enemyLaser(this.kit, place(this.kit, at));
  },

  sentinelLaser(at) {
    if (!this.live || !this.voices.take(...GATE.sentinel)) return;
    sentinel(this.kit, place(this.kit, at));
  },

  // Hand weapons; 'beam' is a sustained loop. `arg` is the charge level for 'charge'.
  hand(name, arg, at) {
    if (!this.live) return;
    if (name === 'beam') { this.gunBeam(true, 'hand'); return; }
    const fn = HAND[name];
    if (!fn || !this.voices.take(...GATE.hand)) return;
    fn(this.kit, place(this.kit, at), arg);
  },

  // Trigger pulled with no energy / no ammo.
  dryFire() {
    if (!this.live || !this.voices.take('dry', 1, 120)) return;
    const P = place(this.kit);
    HAND.empty(this.kit, P);
    layer(this.kit, { type: 'sine', f0: 120, f1: 80, dur: 0.09, gain: 0.05, attack: 0.002 });
  },
};
