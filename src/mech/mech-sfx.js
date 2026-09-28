// Sounds the mech frame itself makes: the transformation, servos, footfalls, hardpoint latches and
// the overheat lockout. The six weapons live in mech-weapon-sfx.js and are re-exported here, so
// every caller still imports its sounds from one place.
// Every call is a no-op before the audio context is unlocked. No audio files anywhere in the game.
export { rifleSfx, bazookaSfx, bazookaHitSfx, gatlingSfx, spinUpSfx, spinDownSfx, chargeSfx,
  cannonSfx, cannonEndSfx, podSfx, saberSfx, ignightSfx, saberHitSfx, weaponSfx } from './mech-weapon-sfx.js';
export { brapLoop, roarLoop, humLoop, stopMechLoops } from './mech-audio.js';

// The full 2.3 s transformation, in four layers timed to mech-transform.js: a power-up whine and
// charging hiss, mechanical locks clunking over, the burst at the swap, then servos and the final
// locks as the frame settles. `toMech` flips the sweeps for the fold back into the ship.
const BURST_AT = 0.88;

export function transformSfx(sfx, toMech) {
  if (!sfx?.live) return;
  const up = toMech;
  chargeLayer(sfx, up);
  lockLayer(sfx, [0.14, 0.36, 0.6], 0.13);
  burstLayer(sfx, up);
  servoLayer(sfx);
  lockLayer(sfx, [1.88, 2.06], 0.2);
  sfx.t({ type: 'sine', f0: up ? 96 : 76, f1: 34, dur: 0.5, gain: 0.45, attack: 0.006, delay: 2.0 });
}

function chargeLayer(sfx, up) {
  sfx.t({ type: 'sawtooth', f0: up ? 62 : 250, f1: up ? 265 : 58, dur: BURST_AT, gain: 0.075, attack: BURST_AT * 0.8 });
  sfx.t({ type: 'sine', f0: up ? 300 : 1900, f1: up ? 1900 : 280, dur: BURST_AT, gain: 0.05, attack: BURST_AT * 0.75 });
  sfx.n({ filter: 'bandpass', f0: up ? 380 : 2600, f1: up ? 2800 : 360, q: 4, dur: BURST_AT, gain: 0.3, attack: BURST_AT * 0.82, rate: 0.85 });
}

// Armour plates latching over: a short metallic knock each.
function lockLayer(sfx, times, gain) {
  for (const t of times) {
    sfx.n({ filter: 'bandpass', f0: 1500 + Math.random() * 700, f1: 420, q: 6, dur: 0.1, gain, attack: 0.002, delay: t });
    sfx.t({ type: 'square', f0: 260, f1: 110, dur: 0.07, gain: gain * 0.35, attack: 0.002, delay: t });
  }
}

function burstLayer(sfx, up) {
  sfx.t({ type: 'sine', f0: up ? 190 : 150, f1: 30, dur: 0.75, gain: 0.8, attack: 0.004, delay: BURST_AT });
  sfx.n({ filter: 'lowpass', f0: 6000, f1: 200, q: 1, dur: 0.6, gain: 0.45, attack: 0.002, delay: BURST_AT });
  sfx.n({ filter: 'highpass', f0: 2600, f1: 5200, q: 1.5, dur: 0.35, gain: 0.2, attack: 0.01, delay: BURST_AT });
}

// Limbs swinging out, one whir per joint.
function servoLayer(sfx) {
  for (let i = 0; i < 7; i++) {
    const t = 0.98 + i * 0.12;
    sfx.n({ filter: 'bandpass', f0: 900 + i * 240, f1: 560, q: 5, dur: 0.12, gain: 0.11, attack: 0.006, delay: t });
    sfx.t({ type: 'sawtooth', f0: 140 + i * 30, f1: 90, dur: 0.1, gain: 0.03, attack: 0.008, delay: t });
  }
}

export function servoSfx(sfx) {
  if (!sfx?.live) return;
  sfx.n({ filter: 'bandpass', f0: 1400, f1: 700, q: 4, dur: 0.14, gain: 0.1, attack: 0.005 });
}

// Heavy footfall: a deep thud plus gravel.
export function stompSfx(sfx, weight = 1) {
  if (!sfx?.live) return;
  sfx.t({ type: 'sine', f0: 78 * weight, f1: 30, dur: 0.34, gain: 0.5, attack: 0.004 });
  sfx.n({ filter: 'lowpass', f0: 420, f1: 90, q: 1.4, dur: 0.24, gain: 0.22, attack: 0.005, rate: 0.6 });
}

// Weapon swapped: hardpoint latches clacking over.
export function swapSfx(sfx) {
  if (!sfx?.live) return;
  sfx.n({ filter: 'bandpass', f0: 1800, f1: 620, q: 5, dur: 0.1, gain: 0.16, attack: 0.002 });
  sfx.n({ filter: 'bandpass', f0: 900, f1: 380, q: 4, dur: 0.12, gain: 0.12, attack: 0.002, delay: 0.07 });
  sfx.t({ type: 'square', f0: 520, f1: 260, dur: 0.06, gain: 0.04, attack: 0.002, delay: 0.07 });
}

// Barrels locked out by heat.
export function overheatSfx(sfx) {
  if (!sfx?.live) return;
  sfx.n({ filter: 'lowpass', f0: 2600, f1: 200, q: 1, dur: 0.7, gain: 0.26, attack: 0.01, rate: 0.5 });
  sfx.t({ type: 'square', f0: 340, f1: 120, dur: 0.2, gain: 0.05, attack: 0.004 });
}
