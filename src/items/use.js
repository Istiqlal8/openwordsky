// Using one inventory item: spends 1 unit and applies its effect. Returns a toast text.
const GAIN = { oxygen: 25, hazard: 25, heal: 20, energy: 20, hull: 15 };

function target(player, action) {
  if (action === 'oxygen') return [player.suit, 'lifeSupport'];
  if (action === 'hazard') return [player.suit, 'hazard'];
  if (action === 'heal') return [player.suit, 'health'];
  if (action === 'energy') return [player.ship, 'energy'];
  return [player.ship, 'hull'];
}

export function useItem(player, name, action) {
  const [obj, key] = target(player, action);
  if (obj[key] >= 100) return 'Sudah penuh';
  if (!player.removeItem(name, 1)) return `${name} habis`;
  obj[key] = Math.min(100, obj[key] + GAIN[action]);
  return `+${GAIN[action]} (−1 ${name})`;
}
