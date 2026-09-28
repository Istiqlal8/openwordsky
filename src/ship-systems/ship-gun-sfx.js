// Distinct one-shot sounds per ship weapon, built from the Sfx synth helpers (sfx.t tone, sfx.n noise).
// Falls back to the stock laser/rocket sounds when the synth helpers are missing.

const SOUNDS = {
  laser(s) { s.laser?.(); },
  // Heavy wet thump with a low sub-drop.
  plasma(s) {
    s.t({ type: 'sine', f0: 420, f1: 70, dur: 0.32, gain: 0.16, attack: 0.003 });
    s.t({ type: 'square', f0: 180, f1: 60, dur: 0.22, gain: 0.05, attack: 0.002 });
    s.n({ filter: 'lowpass', f0: 1800, f1: 200, dur: 0.25, gain: 0.14, attack: 0.002 });
  },
  // Shotgun crack: broadband burst + short low punch.
  flak(s) {
    s.n({ filter: 'lowpass', f0: 5200, f1: 400, dur: 0.18, gain: 0.3, attack: 0.001 });
    s.t({ type: 'triangle', f0: 220, f1: 50, dur: 0.16, gain: 0.18, attack: 0.001 });
    s.n({ filter: 'highpass', f0: 3000, dur: 0.05, gain: 0.08, attack: 0.001, delay: 0.03 });
  },
  // Launch whoosh with a rising lock chirp.
  homing(s) {
    s.n({ filter: 'bandpass', f0: 500, f1: 2400, q: 2, dur: 0.45, gain: 0.2, attack: 0.02 });
    s.t({ type: 'square', f0: 900, f1: 1800, dur: 0.09, gain: 0.04, attack: 0.002 });
    s.t({ type: 'square', f0: 1200, f1: 2400, dur: 0.09, gain: 0.035, attack: 0.002, delay: 0.1 });
  },
  // Rapid ripple of tiny launches.
  swarm(s) {
    for (let i = 0; i < 5; i++) {
      s.n({ filter: 'bandpass', f0: 1400, f1: 3600, q: 3, dur: 0.12, gain: 0.09, attack: 0.004, delay: i * 0.05 });
      s.t({ type: 'triangle', f0: 1600 + i * 180, f1: 2600, dur: 0.06, gain: 0.025, attack: 0.002, delay: i * 0.05 });
    }
  },
  // Buzzing hum tick; called every beam damage tick so it reads as continuous.
  beam(s) {
    s.t({ type: 'sawtooth', f0: 150, f1: 140, dur: 0.14, gain: 0.05, attack: 0.01 });
    s.t({ type: 'sine', f0: 1180, f1: 1240, dur: 0.12, gain: 0.02, attack: 0.01 });
  },
};

export function gunSound(sfx, id) {
  if (!sfx) return;
  if (!sfx.t || !sfx.n) { (id === 'homing' || id === 'swarm' ? sfx.rocket : sfx.laser)?.call(sfx); return; }
  if (sfx.live === false) return;
  SOUNDS[id]?.(sfx);
}
