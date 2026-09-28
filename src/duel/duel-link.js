// Bridge from the surface world addon (src/gameplay/world-addons.js) to the meta addon
// (src/game/addons.js), which owns the duel HUD and pays the rewards out. Same seam as
// src/raid/raid-world-link.js.
// `nemesis` is the scarred rival currently hunting the player, republished by the meta addon
// whenever the grudge changes, so a landing does not shake it off.
export const duelWorld = { duel: null, nemesis: null };
