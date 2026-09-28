// Mech reactor switch. While UNLIMITED is true the mech costs nothing: no transform fee, no drain
// while deployed and no energy per shot, so it never folds itself away mid-fight. Flip the one
// constant below to put the reactor economy back exactly as it was.
export const UNLIMITED = true;

export const ENTER_COST = 8;     // ship energy needed to transform
export const RESTORE_COST = 25;  // needed to redeploy on load
export const DRAIN_SPACE = 5;    // energy per second while deployed (the hull regenerates 2.5/s)
export const DRAIN_GROUND = 4.2;

// Can the pilot afford to transform right now?
export function canAfford(ship, cost) {
  return UNLIMITED || ship.energy >= cost;
}

// Weapon shot / beam cost. Returns false only when the reactor really is empty.
export function spend(player, cost) {
  return UNLIMITED || player.useEnergy(cost);
}

// Per-second drain while deployed. Returns false when the reactor runs dry.
export function drain(ship, rate, dt) {
  if (UNLIMITED) return true;
  ship.energy = Math.max(0, ship.energy - rate * dt);
  return ship.energy > 0;
}
