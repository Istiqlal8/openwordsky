// Small fishing sounds built from the shared synth one-shots (sfx.t tone, sfx.n noise).
export function castSound(sfx) {
  if (!sfx?.live) return;
  sfx.n({ filter: 'bandpass', f0: 2400, f1: 600, q: 1.5, dur: 0.35, gain: 0.12, attack: 0.01 });
}

export function splashSound(sfx) {
  if (!sfx?.live) return;
  sfx.n({ filter: 'lowpass', f0: 1800, f1: 200, q: 1, dur: 0.3, gain: 0.18, attack: 0.005 });
}

export function biteSound(sfx) {
  if (!sfx?.live) return;
  sfx.n({ filter: 'lowpass', f0: 900, f1: 150, q: 2, dur: 0.22, gain: 0.3, attack: 0.004 });
  sfx.t({ type: 'square', f0: 880, f1: 660, dur: 0.12, gain: 0.05, delay: 0.05, attack: 0.004 });
}

export function catchSound(sfx) {
  if (!sfx?.live) return;
  [67, 72, 76].forEach((m, i) => {
    sfx.t({ type: 'triangle', f0: 440 * Math.pow(2, (m - 69) / 12), dur: 0.3, gain: 0.12, delay: i * 0.08, attack: 0.01 });
  });
}

export function snapSound(sfx) {
  if (!sfx?.live) return;
  sfx.t({ type: 'sawtooth', f0: 520, f1: 120, dur: 0.25, gain: 0.06, attack: 0.004 });
}
