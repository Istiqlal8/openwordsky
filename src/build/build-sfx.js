// Sound and dust for building: short synthesised clunks through the game's own one-shot
// helpers (sfx.t / sfx.n), plus a puff of dust from the surface FX system.
export function placeSound(sfx) {
  if (!sfx?.live) return;
  sfx.n({ filter: 'lowpass', f0: 900, f1: 180, q: 1.4, dur: 0.22, gain: 0.3, attack: 0.004 });
  sfx.t({ type: 'square', f0: 220, f1: 140, dur: 0.12, gain: 0.07, attack: 0.003 });
  sfx.t({ type: 'sine', f0: 880, f1: 1320, dur: 0.1, gain: 0.05, attack: 0.004, delay: 0.06 });
}

export function removeSound(sfx) {
  if (!sfx?.live) return;
  sfx.n({ filter: 'bandpass', f0: 1600, f1: 300, q: 1.1, dur: 0.3, gain: 0.26, attack: 0.005 });
  sfx.t({ type: 'sawtooth', f0: 180, f1: 70, dur: 0.18, gain: 0.05, attack: 0.004 });
}

export function teleportSound(sfx) {
  if (!sfx?.live) return;
  sfx.t({ type: 'sine', f0: 320, f1: 2200, dur: 0.7, gain: 0.12, attack: 0.15 });
  sfx.n({ filter: 'bandpass', f0: 400, f1: 4000, q: 2, dur: 0.8, gain: 0.3, attack: 0.5 });
}

// Dust ring where a piece lands.
export function placeDust(fx, x, y, z, color = 0xb9c4d0) {
  if (!fx) return;
  fx.puff({ x, y: y + 0.2, z }, color, 1.6, 0.7);
  fx.sparks({ x, y: y + 0.4, z }, color, 8, 0.5);
}
