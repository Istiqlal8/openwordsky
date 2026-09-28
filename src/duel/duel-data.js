// Rival mobile suits for the duel event ("Gundam lawan Gundam"): one named hostile frame that
// challenges the player in space and on planet surfaces. A duel is a fight between two machines,
// so a rival is a single health pool with a guard window, not a boss with dismountable parts.
//
// Hit points are in the units the existing damage paths already use:
//   space   - weapon damage per bolt (laser 10, plasma 30, rocket 45)
//   surface - one Wildlife.damage() call = 25 hp
import { rngOf } from '../core/rng.js';

export const PHASES = ['Pembuka', 'Adu Pedang', 'Amuk'];

export const RIVALS = {
  'sabre-merah': {
    id: 'sabre-merah', name: 'Sabre Merah', short: 'Sabre', cls: 'fighter', seed: 0x51a7c3,
    palette: { hull: 0x7e1420, trim: 0xd8402c, glow: 0xff7a48 },
    color: 0xff4a2a, glow: 0xff7a48,
    hp: { space: 820, ground: 620 },
    speed: { space: 62, ground: 13 },
    gun: { gap: 1.6, burst: 3, damage: 8, speed: 215, range: 420 },
    blade: { gap: 3.2, damage: 30, reach: 1.5 },
    guard: { gap: 15, time: 3.4, soak: 0.82 },
    reward: { nanit: 4200, xp: 420, items: [['Lencana Sabre Merah', 1], ['Pelat Rangka', 6]] },
    hail: 'Sabre Merah memotong lintasanmu — "tunjukkan rangkamu."',
    taunt: 'Sabre Merah menutup jarak!',
    lore: 'Rangka petarung merah yang hidup dari jarak dekat. Pedangnya lebih sering bicara daripada senapannya.',
  },
  'vayu-biru': {
    id: 'vayu-biru', name: 'Vayu Biru', short: 'Vayu', cls: 'explorer', seed: 0x2b90ff,
    palette: { hull: 0x1c3f7e, trim: 0x4aa8ff, glow: 0x7fd8ff },
    color: 0x4aa8ff, glow: 0x7fd8ff,
    hp: { space: 700, ground: 520 },
    speed: { space: 78, ground: 16 },
    gun: { gap: 1.0, burst: 2, damage: 11, speed: 265, range: 540 },
    blade: { gap: 5.0, damage: 22, reach: 1.3 },
    guard: { gap: 12, time: 2.6, soak: 0.7 },
    reward: { nanit: 3800, xp: 380, items: [['Lencana Vayu Biru', 1], ['Lensa Bidik', 4]] },
    hail: 'Vayu Biru mengunci dari jauh — "jangan berdiri diam."',
    taunt: 'Vayu Biru membuka jarak!',
    lore: 'Rangka penjelajah yang bertempur dari jauh, cepat, dan tidak pernah membiarkanmu mendekat.',
  },
  'golem-hitam': {
    id: 'golem-hitam', name: 'Golem Hitam', short: 'Golem', cls: 'hauler', seed: 0x0c0c18,
    palette: { hull: 0x23262e, trim: 0x6a7280, glow: 0xffc14a },
    color: 0xffc14a, glow: 0xffd88a,
    hp: { space: 1150, ground: 880 },
    speed: { space: 44, ground: 9.5 },
    gun: { gap: 2.2, burst: 5, damage: 10, speed: 190, range: 380 },
    blade: { gap: 4.2, damage: 40, reach: 1.7 },
    guard: { gap: 10, time: 4.5, soak: 0.88 },
    reward: { nanit: 5200, xp: 520, items: [['Lencana Golem Hitam', 1], ['Baja Berat', 10]] },
    hail: 'Golem Hitam berhenti di depanmu — "lewati aku."',
    taunt: 'Golem Hitam menaikkan perisai!',
    lore: 'Rangka pengangkut yang dijadikan dinding: lambat, tebal, dan pukulannya menghabisi sekali tebas.',
  },
  'nyx-ungu': {
    id: 'nyx-ungu', name: 'Nyx Ungu', short: 'Nyx', cls: 'exotic', seed: 0x9a2bff,
    palette: { hull: 0x2e1a52, trim: 0x9a7aff, glow: 0xd8a8ff },
    color: 0x9a7aff, glow: 0xd8a8ff,
    hp: { space: 760, ground: 560 },
    speed: { space: 70, ground: 15 },
    gun: { gap: 1.3, burst: 4, damage: 9, speed: 240, range: 480 },
    blade: { gap: 2.6, damage: 26, reach: 1.6 },
    guard: { gap: 9, time: 2.2, soak: 0.75 },
    reward: { nanit: 4600, xp: 460, items: [['Lencana Nyx Ungu', 1], ['Kromatik', 3]] },
    hail: 'Nyx Ungu muncul tanpa sinyal — "kau terlambat melihatku."',
    taunt: 'Nyx Ungu menghilang dan muncul lagi!',
    lore: 'Rangka eksotis yang berpindah lebih cepat daripada radarmu membacanya.',
  },
};

export const RIVAL_IDS = Object.keys(RIVALS);

// Deterministic pick, so the same star system or planet always sends the same rival.
export const rivalOf = (...seedParts) => RIVALS[rngOf(...seedParts).pick(RIVAL_IDS)];

export const badgeOf = (def) => `Lencana ${def.name}`;

// 0..2, from the share of health left: the HUD pips and the aggression both read this.
export function stageOf(now, max) {
  const k = max > 0 ? now / max : 1;
  return k > 0.6 ? 0 : k > 0.25 ? 1 : 2;
}
