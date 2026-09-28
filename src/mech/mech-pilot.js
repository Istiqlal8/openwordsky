// Is the player standing inside their own mech right now? Written once per frame by the mech
// meta addon, read by anything that should treat a frame differently from a pilot on foot or a
// ship — the duel rivals hold back against a pilot and commit against another mech.
// Same seam as src/mech/mech-link.js: a plain shared flag, no imports back into the mech.
export const mechPilot = { active: false, where: null };
