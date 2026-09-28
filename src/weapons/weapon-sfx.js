// Synthesised weapon sounds, played through the game's Sfx tone/noise helpers (sfx.t / sfx.n).
const SOUNDS = {
  pistol(s) {
    s.t({ type: 'square', f0: 2400, f1: 700, dur: 0.07, gain: 0.05, attack: 0.001 });
    s.t({ type: 'sine', f0: 900, f1: 300, dur: 0.08, gain: 0.08, attack: 0.001 });
  },
  beam(s) {
    s.t({ type: 'sawtooth', f0: 180 + Math.random() * 30, dur: 0.09, gain: 0.03, attack: 0.01 });
    s.n({ filter: 'bandpass', f0: 2600, q: 6, dur: 0.08, gain: 0.04, attack: 0.01 });
  },
  shotgun(s) {
    s.n({ filter: 'lowpass', f0: 3800, f1: 300, dur: 0.28, gain: 0.35, attack: 0.002 });
    s.t({ type: 'sine', f0: 160, f1: 45, dur: 0.22, gain: 0.35, attack: 0.002 });
    s.t({ type: 'square', f0: 1400, f1: 200, dur: 0.1, gain: 0.04, attack: 0.001 });
  },
  ice(s) {
    s.t({ type: 'triangle', f0: 3200, f1: 1800, dur: 0.12, gain: 0.06, attack: 0.001 });
    s.t({ type: 'sine', f0: 5200, f1: 4200, dur: 0.18, gain: 0.03, attack: 0.002, delay: 0.02 });
    s.n({ filter: 'highpass', f0: 6000, dur: 0.1, gain: 0.05, attack: 0.001 });
  },
  grenade(s) {
    s.t({ type: 'sine', f0: 220, f1: 70, dur: 0.18, gain: 0.3, attack: 0.002 });
    s.n({ filter: 'bandpass', f0: 900, f1: 300, q: 2, dur: 0.2, gain: 0.2, attack: 0.002 });
  },
  rail(s) {
    s.t({ type: 'sawtooth', f0: 3000, f1: 120, dur: 0.45, gain: 0.07, attack: 0.001 });
    s.t({ type: 'sine', f0: 110, f1: 35, dur: 0.5, gain: 0.4, attack: 0.002 });
    s.n({ filter: 'highpass', f0: 3000, f1: 800, dur: 0.3, gain: 0.12, attack: 0.001 });
  },
  charge(s, k) {
    s.t({ type: 'sine', f0: 300 + k * 1500, dur: 0.07, gain: 0.025, attack: 0.01 });
  },
  overheat(s) {
    s.n({ filter: 'highpass', f0: 2500, f1: 900, dur: 0.6, gain: 0.12, attack: 0.02 });
    s.t({ type: 'square', f0: 520, f1: 380, dur: 0.18, gain: 0.03, attack: 0.002 });
  },
  empty(s) {
    s.t({ type: 'square', f0: 240, dur: 0.04, gain: 0.03, attack: 0.001 });
  },
  equip(s) {
    s.t({ type: 'triangle', f0: 600, f1: 1200, dur: 0.08, gain: 0.05, attack: 0.002 });
    s.n({ filter: 'bandpass', f0: 1800, q: 3, dur: 0.06, gain: 0.05, attack: 0.001, delay: 0.08 });
  },
  freeze(s) {
    s.n({ filter: 'bandpass', f0: 5000, f1: 2000, q: 4, dur: 0.35, gain: 0.08, attack: 0.002 });
  },
};

// Plays the named sound if audio is unlocked; silently ignores unknown names / missing audio.
// Prefers the layered synthesis in src/audio/sfx-guns.js, falling back to the sounds above.
export function playWeaponSfx(sfx, name, arg) {
  if (!sfx?.live) return;
  if (typeof sfx.hand === 'function') { sfx.hand(name, arg); return; }
  if (typeof sfx.t !== 'function') return;
  SOUNDS[name]?.(sfx, arg);
}
