// Link between the build meta addon (save, HUD, input, journal, travel) and the build world
// addon (scene, player on a planet). The meta addon fills it once; the world addon reads it.
export const hub = {
  wiring: null,   // QuestWiring: player, hud, sfx, log (bases live in log.s.bases), app
  input: null,    // game Input, refreshed every frame by the meta addon
  active: false,  // build mode on (the key capture in build-keys.js only acts then)
  site: null,     // the BaseSite of the planet the player stands on
  travel: null,   // (planetKey) -> notice text; set by the meta addon (needs app.flow)
  openCraft: null, // () -> void: opens the workbench panel (the craft addon's U panel)
  arriveAt: null, // { key, x, z }: put the player on this pad right after the next landing
};

// planet.key -> { name, sys, pieces: [{ type, x, y, z, rot, data }] }; pieces[0] is the beacon.
export function bases() {
  return (hub.wiring.log.s.bases ??= {});
}

export function changed() {
  hub.wiring.log.version++;
}

// Radar landmark for the base on the planet the player is standing on (src/game/surface-mode.js).
export function basePlaces() {
  const b = hub.site?.pieces?.[0];
  return b ? [{ x: b.x, z: b.z, color: '#ffb347' }] : [];
}
