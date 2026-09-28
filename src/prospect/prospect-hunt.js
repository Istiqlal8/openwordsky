// The material the player is currently hunting: one shared object the galaxy map, its search pane
// and the on-foot markers all read. Same seam as src/mech/mech-link.js — a plain flag, no imports
// back into the things that read it.
import { nearestSource } from './prospect-finder.js';

export const hunt = { item: null, hit: null };

// Starts (or re-aims) the hunt from the system the player is in now. -> the hit, or null.
export function setHunt(item, seed, from) {
  if (!item) { clearHunt(); return null; }
  hunt.item = item;
  hunt.hit = nearestSource(seed, from, item);
  return hunt.hit;
}

export function clearHunt() {
  hunt.item = null;
  hunt.hit = null;
}

// True while the player is standing on the very planet the hunt points at.
export const huntedHere = (planet) => Boolean(hunt.item && planet && hunt.hit?.planet.key === planet.key);
