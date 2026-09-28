// One built mech at a time: rebuilding only happens when the player changes ship.
import { mechDesign } from './mech-design.js';
import { buildMech } from './mech-model.js';

let cached = null;

// Returns the mech rig for a ship design, building it on first use.
export function mechFor(design) {
  const m = mechDesign(design);
  if (cached && cached.key === m.key) return cached.mech;
  releaseMech();
  cached = { key: m.key, mech: buildMech(m) };
  return cached.mech;
}

export function releaseMech() {
  if (!cached) return;
  cached.mech.group.removeFromParent();
  cached.mech.dispose();
  cached = null;
}
