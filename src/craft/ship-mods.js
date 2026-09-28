// Persistent ship modules (Pesawat tab), fitted to the player so they work on any ship.
// Tiers live in player.upgrades under the SHIP_MODS keys. Hooks read shipMod(key, field).
import { owner } from './owner.js';
import { item, pay } from './recipes.js';
import { tierOf } from './upgrades.js';

const [FERIT, KOBALT, EMAS, LOGAM, KRISTAL, NANIT] =
  ['Ferit', 'Kobalt', 'Emas', 'Logam Penjaga', 'Kristal Alien', 'Nanit'].map(item);

// Values per tier (index 0 = not fitted). tiers[i] is the cost of reaching tier i + 1.
export const SHIP_MODS = {
  shipCargo: { name: 'Slot Kargo', effect: 'Ruang kargo misi', val: [0, 2, 4, 6],
    desc: (t, m) => `+${m.val[t]} ruang kargo`,
    tiers: [[FERIT(30), NANIT(40)], [KOBALT(15), LOGAM(3), NANIT(100)], [EMAS(10), KRISTAL(2), NANIT(220)]] },
  shipThrust: { name: 'Pendorong', effect: 'Kecepatan terbang', val: [1, 1.1, 1.2, 1.3],
    desc: (t, m) => `kecepatan ×${m.val[t]}`,
    tiers: [[FERIT(25), KOBALT(5), NANIT(50)], [KOBALT(15), LOGAM(4), NANIT(120)], [EMAS(12), KRISTAL(3), NANIT(250)]] },
  shipShield: { name: 'Perisai', effect: 'Perisai pesawat', val: [1, 1.4, 1.8, 2.2], soak: [1, 0.85, 0.7, 0.55],
    desc: (t, m) => `isi perisai ×${m.val[t]} · rusak perisai −${Math.round((1 - m.soak[t]) * 100)}%`,
    tiers: [[FERIT(30), LOGAM(2), NANIT(50)], [KOBALT(15), LOGAM(5), NANIT(120)], [EMAS(12), KRISTAL(3), NANIT(250)]] },
  shipEnergy: { name: 'Sel Energi', effect: 'Energi pesawat', val: [1, 1.5, 2, 2.5], warp: [1, 0.85, 0.7, 0.55],
    desc: (t, m) => `isi energi ×${m.val[t]} · biaya warp −${Math.round((1 - m.warp[t]) * 100)}%`,
    tiers: [[FERIT(20), KOBALT(5), NANIT(40)], [KOBALT(12), EMAS(4), NANIT(110)], [EMAS(10), KRISTAL(2), NANIT(230)]] },
};

export function shipMaxTier(key) {
  return SHIP_MODS[key].tiers.length;
}

// Value of a module field for the player (defaults to the craft owner).
export function shipMod(key, field = 'val', player = owner.player) {
  const arr = SHIP_MODS[key][field];
  return arr[Math.min(tierOf(player, key), arr.length - 1)];
}

// Extra cargo-mission hold slots (src/missions/ship-cargo.js).
export function cargoBonus(player = owner.player) {
  return shipMod('shipCargo', 'val', player);
}

// Caller checks affordability first. -> toast text.
export function installMod(player, key) {
  const t = tierOf(player, key);
  pay(player, SHIP_MODS[key].tiers[t]);
  player.upgrades[key] = t + 1;
  player.emit('act', { type: 'craft', item: key });
  return `${SHIP_MODS[key].name} ${['', 'I', 'II', 'III'][t + 1]} terpasang`;
}
