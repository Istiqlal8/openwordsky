// The raid meta addon runs inside QuestWiring, which only knows about the player, the save and
// the UI. A space raid also needs the live SpaceView and its SpaceCombat. This module is the one
// seam that hands those over, so nothing in src/game/ or src/combat/ has to change.
//
// attach({ spaceMode, space }) can be called by the host at boot; until then resolve() picks the
// objects up from the debug handle main.js already publishes.
export const raidLink = { spaceMode: null, space: null };

export function attachRaidLink(parts) {
  Object.assign(raidLink, parts);
}

// -> { space, combat } while a star system is mounted, else null.
export function resolveSpace() {
  const mode = raidLink.spaceMode ?? globalThis.__game?.spaceMode ?? null;
  const space = raidLink.space ?? mode?.space ?? globalThis.__game?.space ?? null;
  const combat = mode?.combat ?? null;
  if (!space || !combat?.fx || !combat.system) return null;
  return { space, combat };
}
