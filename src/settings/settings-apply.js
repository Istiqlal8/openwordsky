// Pushes the stored settings into the running game: input, audio buses, HUD hints, renderer.
import { settings, remapTable } from './settings-store.js';
import { applyQuality } from './graphics.js';

const MASTER = 0.55; // sfx.js base levels
const AMBIENT = 0.45;

export function applyInput(input) {
  if (!input) return;
  input.remap = remapTable();
  input.sens = settings.sens;
  input.invertY = settings.invertY;
}

// sfx buses exist only after the first click (AudioContext unlock); returns true once applied.
export function applyAudio(sfx) {
  if (!sfx?.ctx || !sfx.master) return false;
  sfx.master.gain.value = sfx.muted ? 0 : MASTER * settings.master;
  sfx.fx.gain.value = settings.sfx;
  sfx.ambientBus.gain.value = AMBIENT * settings.music;
  return true;
}

export function applyHud(hud) {
  hud.root.classList.toggle('st-no-hints', !settings.hints);
}

export function applyAll(w, input, quality = true) {
  applyInput(input);
  applyHud(w.hud);
  if (quality) applyQuality(); // resizes the drawing buffer, so only when it changed
  return applyAudio(w.sfx);
}

// Any open addon panel that reads number keys (craft U, cargo O, book L, ...) blocks weapon switching.
export function panelOpen(addons, skip) {
  return addons.some((a) => a !== skip && [a.panel, a.board, a.codex].some((p) => p?.isOpen));
}
