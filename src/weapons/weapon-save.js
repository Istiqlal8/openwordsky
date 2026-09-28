// Save-game helpers: save.weapons = owned ids (always includes the Multitool), save.equipped = id.
import { DEFAULT_WEAPON, weaponById } from './catalog.js';

export function loadOwned(save) {
  const list = Array.isArray(save?.weapons) ? save.weapons.filter((id) => weaponById(id)) : [];
  if (!list.includes(DEFAULT_WEAPON)) list.unshift(DEFAULT_WEAPON);
  return list;
}

export function saveOwned(save, owned) {
  if (save) save.weapons = [...owned];
}

export function loadEquipped(save, owned) {
  const id = save?.equipped;
  return owned.includes(id) ? id : DEFAULT_WEAPON;
}

export function saveEquipped(save, id) {
  if (save) save.equipped = id;
}
