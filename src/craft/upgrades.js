// Persistent suit/tool upgrades crafted at the workbench (U). player.upgrades = { key: tier }.
// Gameplay modules read their multiplier with upgradeMul(player, key).

// Multiplier per tier (index 0 = no upgrade).
export const UPGRADES = {
  thermal: { name: 'Pelapis Termal', effect: 'Kuras bahaya panas/dingin', mul: [1, 0.7, 0.45, 0.25] },
  filter: { name: 'Filter Suit', effect: 'Kuras bahaya racun/radiasi', mul: [1, 0.7, 0.45, 0.25] },
  oxygen: { name: 'Tangki Oksigen', effect: 'Kuras penunjang hidup', mul: [1, 0.75, 0.55, 0.4] },
  beamRange: { name: 'Jangkauan Sinar', effect: 'Jarak sinar tambang', mul: [1, 1.35, 1.7, 2] },
  beamSpeed: { name: 'Laju Tambang', effect: 'Waktu menambang', mul: [1, 0.75, 0.55, 0.4] },
  blaster: { name: 'Laju Blaster', effect: 'Jeda tembakan blaster', mul: [1, 0.8, 0.62, 0.48] },
};

export function tierOf(player, key) {
  return player?.upgrades?.[key] ?? 0;
}

export function upgradeMul(player, key) {
  const u = UPGRADES[key];
  return u.mul[Math.min(tierOf(player, key), u.mul.length - 1)];
}

export function maxTier(key) {
  return UPGRADES[key].mul.length - 1;
}
