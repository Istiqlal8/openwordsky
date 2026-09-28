// Link between the build meta addon (save, HUD, input, journal) and the build world addon
// (scene, player on a planet). The meta addon fills it once; the world addon reads it.
export const hub = {
  wiring: null, // QuestWiring: player, hud, sfx, log (bases live in log.s.bases)
  input: null,  // game Input, refreshed every frame by the meta addon
  active: false, // build mode on (the key capture in build-keys.js only acts then)
};

// planet.key -> { planet, name, pieces: [{ type, x, y, z, rot, data }] }; pieces[0] is the beacon.
export function bases() {
  return (hub.wiring.log.s.bases ??= {});
}

export function changed() {
  hub.wiring.log.version++;
}
