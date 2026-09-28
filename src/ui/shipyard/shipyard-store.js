// Pure save helpers for player-built ships. The caller persists with writeSave(save) from state.js.
// save.customShips: up to SLOT_COUNT specs (null = empty slot); save.shipSpec: the spec in use.
import { normalizeSpec } from '../../view/ship/ship-custom-spec.js';

export const SLOT_COUNT = 6;

// Always SLOT_COUNT entries: a normalized spec or null.
export function loadCustom(save) {
  const list = Array.isArray(save?.customShips) ? save.customShips : [];
  return Array.from({ length: SLOT_COUNT }, (_, i) => (list[i] ? normalizeSpec(list[i]) : null));
}

// Stores `spec` in `slot` (0..5) and marks it as the ship in use. Returns the stored spec.
export function saveCustom(save, spec, slot = 0) {
  const i = Math.min(SLOT_COUNT - 1, Math.max(0, Math.floor(Number(slot) || 0)));
  const clean = normalizeSpec(spec);
  const list = loadCustom(save);
  list[i] = clean;
  save.customShips = list;
  save.shipSpec = structuredClone(clean);
  return clean;
}

// The spec in use, or null when the player flies a procedural ship.
export function activeSpec(save) {
  return save?.shipSpec ? normalizeSpec(save.shipSpec) : null;
}

// Call when the player switches back to a procedural ship (e.g. picked in the hangar).
export function clearActiveSpec(save) {
  delete save.shipSpec;
}
