// One built mech at a time: rebuilding only happens when the player changes ship, or once the
// Gundam model finishes downloading. Until then — and forever if the file cannot be fetched —
// the procedural frame from mech-model.js stands in, so the game never breaks on a bad network.
import { mechDesign } from './mech-design.js';
import { buildMech } from './mech-model.js';
import { preloadMechSkin, readyMechSkin, fitDesign } from './mech-glb.js';
import { attachSkin } from './mech-skin.js';

let cached = null;

preloadMechSkin();

// Returns the mech rig for a ship design, building it on first use.
export function mechFor(design) {
  const tpl = readyMechSkin();
  const m = mechDesign(design);
  if (tpl) fitDesign(m, tpl);
  const key = `${m.key}:${tpl ? 'glb' : 'proc'}`;
  if (cached && cached.key === key) return cached.mech;
  releaseMech();
  const mech = buildMech(m);
  if (tpl) attachSkin(mech, tpl);
  cached = { key, mech };
  if (typeof window !== 'undefined') window.__mech = mech;   // debug hook, like window.__game
  return mech;
}

export function releaseMech() {
  if (!cached) return;
  cached.mech.group.removeFromParent();
  cached.mech.dispose();
  cached = null;
}
