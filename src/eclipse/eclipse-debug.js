// Console handle for the Gerhana event, same shape as __raid / __duel:
//   __eclipse.start()  -> true when an eclipse began here (skips the rarity roll)
//   __eclipse.phase()  -> 'masuk' | 'puncak' | 'keluar' | null
//   __eclipse.cover()  -> 0..1 of the star currently hidden
//   __eclipse.skip()   -> end the running eclipse on the next frame
// It reaches the event through globalThis.__game rather than an import, so this module stays
// clear of src/gameplay and src/events.
import { eclipseLink } from './eclipse-link.js';

// The world addon that owns the random planet events (src/gameplay/wild-extras.js).
function planetEvents() {
  const addons = globalThis.__game?.surfaceMode?.gameplay?.addons;
  return addons?.find((a) => a.events)?.events ?? null;
}

export function installEclipseDebug() {
  if (globalThis.__eclipse) return;
  globalThis.__eclipse = {
    start() {
      eclipseLink.forced = true;
      const ok = Boolean(planetEvents()?.force('gerhana'));
      eclipseLink.forced = false;
      return ok;
    },
    phase: () => eclipseLink.event?.phase ?? null,
    cover: () => eclipseLink.event?.cover ?? 0,
    skip() {
      if (!eclipseLink.event) return false;
      eclipseLink.event.skip();
      return true;
    },
  };
}
