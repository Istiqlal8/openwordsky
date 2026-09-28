// Which stars are allowed to die, and which already did.
//
// The pool is decided once from (galaxySeed, systemIndex) so a star reads the same for this
// player forever — never Math.random(). Short-lived giants are far likelier to be on the list
// than a quiet yellow dwarf, which is why the star type feeds the rate.
//
// The dead set itself is loaded from the save by the meta addon, exactly like
// devourer/husk.js takes its eaten keys: one module-level Set that generation reads.
import { hash32 } from '../core/rng.js';

const BASE_RATE = 0.012;                              // a quiet star almost never goes
const UNSTABLE = { B: 0.1, X: 0.07, F: 0.03 };        // blue/violet/white giants burn out fast
export const HOME_SYSTEM = 0;                         // Tata Surya is never on the list
const SALT = 0x0de1;

let DEAD = new Set();
let ORDER = [];   // the same indices as a list, so the map layer never walks all 4096 systems

// Called by the addon while the save is loading and after every nova.
export function setDeadSystems(list) {
  ORDER = [...new Set(list ?? [])];
  DEAD = new Set(ORDER);
}

export function isDeadSystem(index) {
  return DEAD.has(index);
}

export function deadIndices() {
  return ORDER;
}

// True when this star *can* go nova one day. Black holes are already finished, and a star that
// has gone is no longer a candidate for the next one.
export function isFated(galaxySeed, system) {
  if (!system || system.index === HOME_SYSTEM || system.star?.blackHole) return false;
  const rate = UNSTABLE[system.star.type] ?? BASE_RATE;
  return (hash32(galaxySeed, system.index, SALT) >>> 8) / 0x1000000 < rate;
}

export function isDoomed(galaxySeed, system) {
  return isFated(galaxySeed, system) && !DEAD.has(system.index);
}
