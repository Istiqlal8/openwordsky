// The third-person player model. The figure itself now lives in src/character/, driven by a `look`
// object, so the player can be a human or any alien race. This module keeps the old name working:
// `new Astronaut()` builds the default human look; pass a look to build the saved character.
export { Avatar as Astronaut } from '../character/avatar.js';
