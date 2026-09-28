// G in space: repair hull with Ferit, then top up energy with Karbon or Protein Fauna.
const HULL_COST = { item: 'Ferit', n: 5, gain: 20 };
const ENERGY_SOURCES = [
  { item: 'Karbon', n: 3, gain: 25 },
  { item: 'Protein Fauna', n: 1, gain: 30 },
  { item: 'Nanit', n: 10, gain: 20 },
];

function repairHull(player) {
  const s = player.ship;
  if (s.hull >= 100 || !player.removeItem(HULL_COST.item, HULL_COST.n)) return null;
  s.hull = Math.min(100, s.hull + HULL_COST.gain);
  return `Lambung +${HULL_COST.gain} (−${HULL_COST.n} ${HULL_COST.item})`;
}

function chargeEnergy(player) {
  const s = player.ship;
  if (s.energy >= 100) return null;
  for (const src of ENERGY_SOURCES) {
    if (!player.removeItem(src.item, src.n)) continue;
    s.energy = Math.min(100, s.energy + src.gain);
    return `Energi +${src.gain} (−${src.n} ${src.item})`;
  }
  return null;
}

// Returns the notice text for the HUD.
export function rechargeShip(player) {
  const hullLow = player.ship.hull < 100;
  const done = (hullLow && repairHull(player)) || chargeEnergy(player);
  if (done) return done;
  if (hullLow || player.ship.energy < 100) return 'Butuh Ferit (lambung) atau Karbon (energi)';
  return 'Pesawat sudah penuh';
}
