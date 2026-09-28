// Bridge between the Gerhana planet event (src/eclipse/eclipse-event.js) and the console debug
// handle (src/eclipse/eclipse-debug.js), so neither module has to import the other's owner.
// `event` is the running eclipse, or null. `forced` is a one-shot flag the debug handle raises
// so the next Eclipse skips its rarity roll.
export const eclipseLink = { event: null, forced: false };
