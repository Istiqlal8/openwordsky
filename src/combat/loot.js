// Resource drops from broken asteroids and destroyed pirates.
export function rockLoot(player, radius) {
  const roll = Math.random();
  const scale = 0.6 + radius / 4;
  const drop = (name, lo, hi) => player.addItem(name, Math.max(1, Math.round((lo + Math.random() * (hi - lo)) * scale)));
  if (roll < 0.04) drop('Emas', 1, 2);
  else if (roll < 0.18) drop('Kobalt', 2, 4);
  else if (roll < 0.45) drop('Karbon', 3, 6);
  else drop('Ferit', 3, 8);
}

export function pirateLoot(player) {
  player.addItem('Nanit', 15 + Math.floor(Math.random() * 26));
}
