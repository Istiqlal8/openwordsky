// Mech one-shots, synthesised through the game's own Sfx bus (sfx.t tone / sfx.n noise).
// Every call is a no-op before the audio context is unlocked. No audio files anywhere in the game.
import { RIFLE, BAZOOKA, GATLING, CANNON, POD } from './mech-weapons.js';

export function transformSfx(sfx, toMech) {
  if (!sfx?.live) return;
  const up = toMech;
  sfx.n({ filter: 'bandpass', f0: up ? 400 : 2400, f1: up ? 2600 : 380, q: 3, dur: 1.1, gain: 0.35, attack: 0.25, rate: 0.8 });
  for (let i = 0; i < 6; i++) {
    sfx.n({ filter: 'highpass', f0: 900 + i * 260, f1: 600, q: 2, dur: 0.11, gain: 0.16, attack: 0.004, delay: 0.1 + i * 0.13 });
  }
  sfx.t({ type: 'sawtooth', f0: up ? 60 : 170, f1: up ? 170 : 55, dur: 1.2, gain: 0.07, attack: 0.5 });
  sfx.t({ type: 'sine', f0: up ? 120 : 90, f1: up ? 46 : 36, dur: 0.6, gain: 0.55, delay: 1.05, attack: 0.006 });
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

// Beam rifle: a tight electric crack with a short tail.
export function rifleSfx(sfx) {
  if (!sfx?.live) return;
  sfx.t({ type: 'square', f0: 1700, f1: 220, dur: 0.17, gain: 0.1, attack: 0.001 });
  sfx.t({ type: 'sine', f0: 320, f1: 90, dur: 0.14, gain: 0.12, attack: 0.001 });
  sfx.n({ filter: 'bandpass', f0: 3000, f1: 480, q: 1.4, dur: 0.16, gain: 0.15, attack: 0.002 });
}

// Bazooka: the launch whump, the pressure wave, then the rocket motor running away.
export function bazookaSfx(sfx) {
  if (!sfx?.live) return;
  sfx.t({ type: 'sine', f0: 150, f1: 34, dur: 0.5, gain: 0.7, attack: 0.004 });
  sfx.t({ type: 'square', f0: 90, f1: 40, dur: 0.3, gain: 0.12, attack: 0.002 });
  sfx.n({ filter: 'lowpass', f0: 2600, f1: 160, q: 1.2, dur: 0.45, gain: 0.42, attack: 0.002, rate: 0.7 });
  sfx.n({ filter: 'bandpass', f0: 700, f1: 2000, q: 1.6, dur: 0.7, gain: 0.14, attack: 0.12, delay: 0.08 });
}

// Gatling: one dry crack per round — cheap, because it plays twenty times a second.
export function gatlingSfx(sfx) {
  if (!sfx?.live) return;
  sfx.n({ filter: 'bandpass', f0: 2400 + Math.random() * 900, f1: 600, q: 2.2, dur: 0.06, gain: 0.16, attack: 0.001 });
  sfx.t({ type: 'square', f0: 260, f1: 110, dur: 0.05, gain: 0.07, attack: 0.001 });
}

// Barrels winding up to speed.
export function spinUpSfx(sfx) {
  if (!sfx?.live) return;
  sfx.t({ type: 'sawtooth', f0: 60, f1: 280, dur: 0.55, gain: 0.05, attack: 0.1 });
  sfx.n({ filter: 'bandpass', f0: 400, f1: 1500, q: 5, dur: 0.55, gain: 0.1, attack: 0.15 });
}

// Particle cannon spooling up to the shot.
export function chargeSfx(sfx, time = 1.1) {
  if (!sfx?.live) return;
  sfx.t({ type: 'sawtooth', f0: 90, f1: 760, dur: time, gain: 0.07, attack: time * 0.85 });
  sfx.t({ type: 'sine', f0: 400, f1: 2600, dur: time, gain: 0.05, attack: time * 0.8 });
  sfx.n({ filter: 'bandpass', f0: 300, f1: 3400, q: 6, dur: time, gain: 0.14, attack: time * 0.9 });
}

// The moment the beam breaks out of the emitter.
export function cannonSfx(sfx) {
  if (!sfx?.live) return;
  sfx.t({ type: 'sine', f0: 220, f1: 40, dur: 0.7, gain: 0.75, attack: 0.004 });
  sfx.n({ filter: 'lowpass', f0: 5000, f1: 220, q: 1, dur: 0.5, gain: 0.4, attack: 0.002 });
}

// Missile pod: a stuttered ripple of launches.
export function podSfx(sfx, n = 4) {
  if (!sfx?.live) return;
  for (let i = 0; i < n; i++) {
    sfx.n({ filter: 'bandpass', f0: 900, f1: 2800, q: 2.4, dur: 0.3, gain: 0.13, attack: 0.02, delay: i * 0.07 });
    sfx.t({ type: 'triangle', f0: 620 + i * 90, f1: 1500, dur: 0.12, gain: 0.05, attack: 0.003, delay: i * 0.07 });
  }
}

// Saber: the hum of the blade cutting air, pitched per combo step.
export function saberSfx(sfx, step = 0) {
  if (!sfx?.live) return;
  const k = 1 + step * 0.22;
  sfx.t({ type: 'sawtooth', f0: 220 * k, f1: 700 * k, dur: 0.4, gain: 0.07, attack: 0.07 });
  sfx.n({ filter: 'bandpass', f0: 650 * k, f1: 3300 * k, q: 2.5, dur: 0.36, gain: 0.2, attack: 0.04 });
}

// Blade igniting out of the hilt.
export function ignightSfx(sfx) {
  if (!sfx?.live) return;
  sfx.n({ filter: 'highpass', f0: 600, f1: 4200, q: 1.5, dur: 0.3, gain: 0.22, attack: 0.02 });
  sfx.t({ type: 'sawtooth', f0: 120, f1: 330, dur: 0.35, gain: 0.06, attack: 0.05 });
}

// Blade biting into something solid.
export function saberHitSfx(sfx) {
  if (!sfx?.live) return;
  sfx.n({ filter: 'bandpass', f0: 4200, f1: 700, q: 1.2, dur: 0.22, gain: 0.3, attack: 0.001 });
  sfx.t({ type: 'sine', f0: 260, f1: 60, dur: 0.24, gain: 0.35, attack: 0.002 });
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

const BY_ID = { [RIFLE]: rifleSfx, [BAZOOKA]: bazookaSfx, [GATLING]: gatlingSfx, [CANNON]: cannonSfx, [POD]: podSfx };

// One shot of the given weapon left the barrel.
export function weaponSfx(sfx, id) {
  BY_ID[id]?.(sfx);
}
