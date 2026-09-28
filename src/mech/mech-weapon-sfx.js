// What each of the six mech weapons sounds like. Every shot is layered — a bright transient, a
// body, a low-end thump and a tail thrown into the echo send — and every layer is detuned a little
// per shot so a held trigger never sounds like the same sample repeating.
import { RIFLE, BAZOOKA, GATLING, CANNON, POD } from './mech-weapons.js';
import { vary, tail, thump } from './mech-audio.js';

// Beam rifle: a hard bright crack, a zap down through the body, and a short slapback.
export function rifleSfx(sfx) {
  if (!sfx?.live) return;
  const k = vary(0.09);
  sfx.t({ type: 'square', f0: 4400 * k, f1: 950 * k, dur: 0.05, gain: 0.05, attack: 0.0008 });
  sfx.t({ type: 'sawtooth', f0: 1550 * k, f1: 190, dur: 0.13, gain: 0.085, attack: 0.001 });
  sfx.n({ filter: 'bandpass', f0: 5200 * k, f1: 900, q: 1.6, dur: 0.09, gain: 0.13, attack: 0.001 });
  thump(sfx, 280 * k, 0.17, 0.19);
  tail(sfx, { filter: 'bandpass', f0: 2900 * k, f1: 700, q: 3, dur: 0.2, gain: 0.05, attack: 0.004, delay: 0.02 });
}

// Bazooka: the launch whump, the pressure wave, then the motor running away downrange.
export function bazookaSfx(sfx) {
  if (!sfx?.live) return;
  const k = vary(0.05);
  thump(sfx, 132 * k, 0.85, 0.58);
  sfx.n({ filter: 'lowpass', f0: 2400, f1: 120, q: 1.2, dur: 0.5, gain: 0.45, attack: 0.002, rate: 0.62 });
  sfx.n({ filter: 'bandpass', f0: 520, f1: 2500, q: 1.5, dur: 0.85, gain: 0.17, attack: 0.2, delay: 0.05 });
  sfx.t({ type: 'sawtooth', f0: 210 * k, f1: 74, dur: 0.55, gain: 0.05, attack: 0.05, delay: 0.04 });
  tail(sfx, { filter: 'lowpass', f0: 1100, f1: 180, q: 1, dur: 0.7, gain: 0.16, attack: 0.05, delay: 0.03 });
}

// The warhead going off somewhere out there: no transient, all body and a long room tail.
export function bazookaHitSfx(sfx, near = 1) {
  if (!sfx?.live) return;
  const k = vary(0.12);
  thump(sfx, 96 * k, 0.6 * near, 0.95);
  sfx.n({ filter: 'lowpass', f0: 1500, f1: 70, q: 1, dur: 0.8, gain: 0.38 * near, attack: 0.006, rate: 0.5 });
  sfx.n({ filter: 'highpass', f0: 1800, f1: 420, q: 1.2, dur: 0.3, gain: 0.14 * near, attack: 0.004 });
  tail(sfx, { filter: 'lowpass', f0: 800, f1: 120, q: 1, dur: 1.2, gain: 0.2 * near, attack: 0.22, delay: 0.04 });
}

// Gatling: one dry round. It plays twenty times a second, so it stays two cheap layers.
export function gatlingSfx(sfx) {
  if (!sfx?.live) return;
  const k = vary(0.16);
  sfx.n({ filter: 'bandpass', f0: 2700 * k, f1: 620, q: 2.1, dur: 0.055, gain: 0.15, attack: 0.0008 });
  sfx.t({ type: 'square', f0: 300 * k, f1: 105, dur: 0.05, gain: 0.08, attack: 0.001 });
  sfx.t({ type: 'sine', f0: 140 * k, f1: 52, dur: 0.09, gain: 0.12, attack: 0.002 });
}

// Barrels winding up to speed, and coasting back down.
export function spinUpSfx(sfx) {
  if (!sfx?.live) return;
  sfx.t({ type: 'sawtooth', f0: 52, f1: 300, dur: 0.6, gain: 0.055, attack: 0.12 });
  sfx.n({ filter: 'bandpass', f0: 340, f1: 1700, q: 5, dur: 0.6, gain: 0.11, attack: 0.18 });
  sfx.n({ filter: 'bandpass', f0: 2600, f1: 1200, q: 7, dur: 0.18, gain: 0.07, attack: 0.004 });
}

export function spinDownSfx(sfx) {
  if (!sfx?.live) return;
  sfx.t({ type: 'sawtooth', f0: 300, f1: 46, dur: 0.75, gain: 0.05, attack: 0.02 });
  sfx.n({ filter: 'bandpass', f0: 1500, f1: 260, q: 5, dur: 0.8, gain: 0.09, attack: 0.03 });
  sfx.n({ filter: 'bandpass', f0: 1200, f1: 500, q: 8, dur: 0.12, gain: 0.05, attack: 0.004, delay: 0.7 });
}

// Particle cannon spooling up: a whine climbing over a swelling hiss, with a shimmer on top.
export function chargeSfx(sfx, time = 1.1) {
  if (!sfx?.live) return;
  sfx.t({ type: 'sawtooth', f0: 84, f1: 820, dur: time, gain: 0.07, attack: time * 0.85 });
  sfx.t({ type: 'sine', f0: 380, f1: 2800, dur: time, gain: 0.05, attack: time * 0.8 });
  sfx.t({ type: 'triangle', f0: 1300, f1: 5200, dur: time * 0.7, gain: 0.022, attack: time * 0.6, delay: time * 0.3 });
  sfx.n({ filter: 'bandpass', f0: 280, f1: 3600, q: 6, dur: time, gain: 0.14, attack: time * 0.9 });
}

// The beam breaking out of the emitter; the roar loop carries it from here.
export function cannonSfx(sfx) {
  if (!sfx?.live) return;
  thump(sfx, 230, 0.8, 0.75);
  sfx.n({ filter: 'lowpass', f0: 5200, f1: 200, q: 1, dur: 0.5, gain: 0.4, attack: 0.002 });
  sfx.t({ type: 'square', f0: 2600, f1: 620, dur: 0.07, gain: 0.05, attack: 0.001 });
  tail(sfx, { filter: 'lowpass', f0: 1600, f1: 200, q: 1, dur: 0.9, gain: 0.18, attack: 0.03 });
}

// Emitter venting as the beam cuts out.
export function cannonEndSfx(sfx) {
  if (!sfx?.live) return;
  thump(sfx, 120, 0.4, 0.4);
  sfx.n({ filter: 'lowpass', f0: 3000, f1: 300, q: 1.2, dur: 0.45, gain: 0.2, attack: 0.008, rate: 0.7 });
  sfx.t({ type: 'sine', f0: 900, f1: 170, dur: 0.22, gain: 0.04, attack: 0.004 });
}

// Missile pod: a ripple of launches, each one sliding away from the listener.
export function podSfx(sfx, n = 4) {
  if (!sfx?.live) return;
  for (let i = 0; i < n; i++) {
    const t = i * 0.065, k = vary(0.1);
    sfx.n({ filter: 'bandpass', f0: 800 * k, f1: 3200, q: 2.2, dur: 0.34, gain: 0.13, attack: 0.012, delay: t });
    sfx.t({ type: 'triangle', f0: 860 * k, f1: 330, dur: 0.4, gain: 0.05, attack: 0.008, delay: t }); // doppler away
    sfx.t({ type: 'sine', f0: 170 * k, f1: 60, dur: 0.16, gain: 0.14, attack: 0.002, delay: t });
  }
  tail(sfx, { filter: 'bandpass', f0: 1400, f1: 500, q: 2, dur: 0.6, gain: 0.08, attack: 0.1, delay: 0.1 });
}

// Saber swing: air tearing along the blade, pitched up through the combo.
export function saberSfx(sfx, step = 0) {
  if (!sfx?.live) return;
  const k = (1 + step * 0.22) * vary(0.05);
  sfx.t({ type: 'sawtooth', f0: 210 * k, f1: 760 * k, dur: 0.4, gain: 0.07, attack: 0.08 });
  sfx.n({ filter: 'bandpass', f0: 600 * k, f1: 3600 * k, q: 2.4, dur: 0.36, gain: 0.2, attack: 0.05 });
  sfx.n({ filter: 'highpass', f0: 2600, f1: 5600, q: 1.2, dur: 0.16, gain: 0.07, attack: 0.03, delay: 0.14 });
}

// Ignition: the hilt snapping, then the blade hissing out to full length.
export function ignightSfx(sfx) {
  if (!sfx?.live) return;
  sfx.n({ filter: 'bandpass', f0: 3400, f1: 1100, q: 3, dur: 0.06, gain: 0.22, attack: 0.001 });
  sfx.n({ filter: 'highpass', f0: 520, f1: 4600, q: 1.5, dur: 0.34, gain: 0.22, attack: 0.03 });
  sfx.t({ type: 'sawtooth', f0: 105, f1: 360, dur: 0.38, gain: 0.07, attack: 0.05 });
  thump(sfx, 150, 0.22, 0.26);
}

// Blade biting into something solid: a crunch, a metallic ring and a lot of weight.
export function saberHitSfx(sfx) {
  if (!sfx?.live) return;
  const k = vary(0.1);
  sfx.n({ filter: 'bandpass', f0: 4600 * k, f1: 700, q: 1.1, dur: 0.24, gain: 0.3, attack: 0.001 });
  sfx.n({ filter: 'lowpass', f0: 900, f1: 130, q: 1.4, dur: 0.3, gain: 0.24, attack: 0.002, rate: 0.6 });
  sfx.t({ type: 'square', f0: 1900 * k, f1: 640, dur: 0.12, gain: 0.05, attack: 0.001 });
  thump(sfx, 250 * k, 0.4, 0.3);
  tail(sfx, { filter: 'bandpass', f0: 2200, f1: 600, q: 2.5, dur: 0.5, gain: 0.09, attack: 0.02, delay: 0.02 });
}

const BY_ID = { [RIFLE]: rifleSfx, [BAZOOKA]: bazookaSfx, [GATLING]: gatlingSfx, [CANNON]: cannonSfx, [POD]: podSfx };

// One shot of the given weapon left the barrel.
export function weaponSfx(sfx, id) {
  BY_ID[id]?.(sfx);
}
