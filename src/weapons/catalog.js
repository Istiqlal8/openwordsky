// Weapon catalog: the default Multitool plus buyable surface weapons (prices in Nanit).
// Damage is in "hit units": 1 unit = one Multitool blaster hit (sentinel HP 4, creatures ~25 HP per unit).
// fire: 'tool' (mining + blaster) | 'bolt' | 'beam' | 'spread' | 'grenade' | 'ice' | 'rail'.
// heat: added per shot (per second for beams); cool: heat shed per second; overheat locks until heat < 0.3.

export const WEAPONS = [
  { id: 'multitool', short: 'Multi', name: 'Multitool', blurb: 'Tambang (kiri) dan blaster (kanan).', price: 0,
    fire: 'tool', damage: 1, rate: 2.9, range: 120, color: 0x6ff4ff, heat: 0, cool: 1 },
  { id: 'pistol', short: 'Pistol', name: 'Pistol Plasma', blurb: 'Peluru plasma cepat.', price: 150,
    fire: 'bolt', damage: 0.6, rate: 7, range: 90, speed: 110, color: 0xff4fd8, heat: 0.07, cool: 0.55 },
  { id: 'beam', short: 'Sinar', name: 'Senapan Sinar', blurb: 'Sinar laser terus-menerus.', price: 300,
    fire: 'beam', damage: 3, rate: 10, range: 45, color: 0xff3a2a, heat: 0.32, cool: 0.4 },
  { id: 'shotgun', short: 'Shotgun', name: 'Shotgun Pulsa', blurb: 'Semburan 8 pelet, jarak dekat.', price: 400,
    fire: 'spread', damage: 0.45, pellets: 8, spread: 0.075, rate: 1.4, range: 35, color: 0xffa13a, heat: 0.22, cool: 0.5 },
  { id: 'ice', short: 'Es', name: 'Senapan Es', blurb: 'Serpihan es yang membekukan target.', price: 500,
    fire: 'ice', damage: 0.8, rate: 2.5, range: 80, speed: 75, freeze: 1.6, color: 0x9fe8ff, heat: 0.12, cool: 0.45 },
  { id: 'grenade', short: 'Granat', name: 'Peluncur Granat', blurb: 'Granat melengkung, ledakan area.', price: 650,
    fire: 'grenade', damage: 3, radius: 7, rate: 0.9, range: 60, speed: 30, color: 0x8cff4a, heat: 0.3, cool: 0.35 },
  { id: 'rail', short: 'Rail', name: 'Railgun', blurb: 'Tahan untuk mengisi, tembus target.', price: 900,
    fire: 'rail', damage: 5, charge: 0.9, rate: 1, range: 220, color: 0xb48cff, heat: 0.45, cool: 0.3 },
];

const BY_ID = new Map(WEAPONS.map((w) => [w.id, w]));

export const DEFAULT_WEAPON = 'multitool';

export function weaponById(id) {
  return BY_ID.get(id) ?? null;
}

// 0..1 bars for the shop: damage per second, fire rate, range.
export function weaponStats(w) {
  const burst = w.fire === 'spread' ? w.damage * w.pellets : w.damage;
  return {
    damage: Math.min(1, burst / 5),
    rate: Math.min(1, w.fire === 'beam' ? 1 : w.rate / 7),
    range: Math.min(1, w.range / 220),
  };
}
