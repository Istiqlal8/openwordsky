// Cargo hold rules derived from the ship in use (procedural or player-built).
import { shipDesign } from '../view/ship/ship-design.js';
import { customDesign } from '../view/ship/ship-custom.js';
import { activeSpec } from '../ui/shipyard/shipyard-store.js';
import { cargoBonus } from '../craft/ship-mods.js';

// Base hold per class; every cargo pod (parts.cargo) adds POD_SLOTS.
export const HOLD = { fighter: 4, explorer: 8, exotic: 8, hauler: 14 };
const POD_SLOTS = 2;
export const CLASS_NAME = { fighter: 'Petarung', explorer: 'Penjelajah', hauler: 'Pengangkut', exotic: 'Eksotis' };

// Same rule as app.js initialDesign(): the custom spec wins over the procedural seed.
export function currentDesign(save) {
  const spec = activeSpec(save);
  return spec ? customDesign(spec) : shipDesign(save.shipSeed ?? 1);
}

export function holdOf(design) {
  return (HOLD[design.cls] ?? 6) + (design.parts?.cargo ?? 0) * POD_SLOTS + cargoBonus();
}

export function usedHold(active) {
  return active.reduce((n, m) => n + m.size, 0);
}

// Why an offer cannot be loaded right now, or null when it can.
export function lockReason(offer, design, active) {
  if (offer.needs && design.cls !== offer.needs) return `butuh ${CLASS_NAME[offer.needs]}`;
  const free = holdOf(design) - usedHold(active);
  if (offer.size > free) return `ruang kurang (${offer.size}/${Math.max(0, free)})`;
  if (active.length >= 3) return 'maks 3 muatan';
  return null;
}
