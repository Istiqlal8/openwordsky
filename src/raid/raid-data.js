// Boss raid catalogue: five named bosses (three in space, two on foot), plus the deterministic
// rules that decide where each one lairs. Pure data + math, no three.js, so the journal and the
// contract board can search the galaxy cheaply.
//
// Hit points are in the units the existing damage paths already use:
//   space  - ship weapon damage per bolt (laser 10, plasma 30, rocket 45)
//   surface- one Wildlife.damage() call = 25 hp (a Multitool blaster hit)
import { hash32, rngOf } from '../core/rng.js';
import { SYSTEM_COUNT } from '../gen/galaxy.js';

export const RAIDS = {
  'kapal-induk': {
    id: 'kapal-induk', name: 'Kapal Induk Bajak Laut', kind: 'space', short: 'Kapal Induk',
    tag: 'Armada Bajak Laut', color: 0xff6a3a, glow: 0xffb070, radius: 120,
    // Phase order is the order of these groups; the core is only vulnerable once the rest is gone.
    groups: [
      { id: 'turret', label: 'Turet', n: 4, hp: 420 },
      { id: 'shield', label: 'Generator Perisai', n: 2, hp: 760 },
    ],
    core: { label: 'Inti Reaktor', hp: 2400 },
    phases: ['Turet', 'Generator', 'Inti', 'Amuk'],
    escorts: 'fighter',
    reward: { nanit: 12000, xp: 900, items: [['Trofi Kapal Induk', 1], ['Pelat Kapal Induk', 6], ['Inti Warp Bajak Laut', 1]] },
    lore: 'Kapal induk sepanjang dua kilometer. Turet dan generator perisainya harus jatuh sebelum inti terbuka.',
  },
  'mesin-purba': {
    id: 'mesin-purba', name: 'Mesin Purba', kind: 'space', short: 'Mesin Purba',
    tag: 'Konstruksi Kuno', color: 0x9a7aff, glow: 0xd8c8ff, radius: 95,
    groups: [
      { id: 'plate', label: 'Pelat Baja Purba', n: 6, hp: 380 },
      { id: 'weak', label: 'Titik Lemah', n: 3, hp: 520 },
    ],
    core: { label: 'Inti Singularitas', hp: 1900 },
    phases: ['Pelat', 'Titik Lemah', 'Inti', 'Amuk'],
    escorts: 'drone',
    reward: { nanit: 10000, xp: 800, items: [['Trofi Mesin Purba', 1], ['Logam Purba', 8], ['Lensa Singularitas', 1]] },
    lore: 'Cincin baja raksasa yang mengorbit sebuah planet. Pelatnya berputar dan sesekali membuka titik lemah.',
  },
  sarang: {
    id: 'sarang', name: 'Sarang', kind: 'space', short: 'Sarang',
    tag: 'Organik', color: 0x8aff5a, glow: 0xd8ff8a, radius: 105,
    groups: [
      { id: 'sac', label: 'Kantung Tetas', n: 5, hp: 440 },
    ],
    core: { label: 'Jantung Sarang', hp: 2200 },
    phases: ['Kantung', 'Jantung', 'Amuk'],
    escorts: 'drone',
    reward: { nanit: 9000, xp: 750, items: [['Trofi Sarang', 1], ['Kitin Sarang', 10], ['Kelenjar Ratu', 1]] },
    lore: 'Stasiun hidup yang terus menetaskan kawanan. Hancurkan semua kantung tetas sebelum jantungnya terbuka.',
  },
  'titan-penjaga': {
    id: 'titan-penjaga', name: 'Titan Penjaga', kind: 'surface', short: 'Titan',
    tag: 'Mesin Penjaga', color: 0xff3a2a, glow: 0xff9a6a, radius: 14,
    groups: [
      { id: 'leg', label: 'Kaki', n: 4, hp: 340 },
    ],
    core: { label: 'Inti Penjaga', hp: 1700 },
    phases: ['Kaki', 'Inti', 'Amuk'],
    reward: { nanit: 8000, xp: 700, items: [['Trofi Titan Penjaga', 1], ['Logam Penjaga', 20], ['Inti Titan', 1]] },
    lore: 'Mesin penjaga setinggi menara. Tembak kakinya sampai badannya menunduk, lalu hantam inti di bawah lambung.',
  },
  kolosus: {
    id: 'kolosus', name: 'Kolosus', kind: 'surface', short: 'Kolosus',
    tag: 'Golem Reruntuhan', color: 0xffc14a, glow: 0xffe6a8, radius: 13,
    groups: [
      { id: 'rune', label: 'Rune', n: 3, hp: 320 },
    ],
    core: { label: 'Jantung Batu', hp: 1900 },
    phases: ['Rune', 'Jantung', 'Amuk'],
    reward: { nanit: 8500, xp: 720, items: [['Trofi Kolosus', 1], ['Batu Rune', 12], ['Jantung Kolosus', 1]] },
    lore: 'Golem batu yang tidur di reruntuhan kuno. Rune di punggungnya harus padam sebelum jantungnya terlihat.',
  },
};

export const RAID_IDS = Object.keys(RAIDS);
export const SPACE_RAIDS = RAID_IDS.filter((id) => RAIDS[id].kind === 'space');
export const SURFACE_RAIDS = RAID_IDS.filter((id) => RAIDS[id].kind === 'surface');

export const trophyOf = (def) => `Trofi ${def.name}`;

// Total hit points across every part, used for the HUD bar and for tuning.
export function totalHp(def) {
  let n = def.core.hp;
  for (const g of def.groups) n += g.n * g.hp;
  return n;
}

// Every boss has one permanent home system in the galaxy, derived from the seed.
export function lairSystem(galaxySeed, id) {
  return hash32(galaxySeed, id.length, ...[...id].map((c) => c.charCodeAt(0))) % SYSTEM_COUNT;
}

// -> the space boss that lairs in this system, or null.
export function spaceRaidOf(galaxySeed, systemIndex) {
  for (const id of SPACE_RAIDS) if (lairSystem(galaxySeed, id) === systemIndex) return RAIDS[id];
  return null;
}

// -> the surface boss sleeping on this planet, or null. Kolosus wakes at ruins, the Titan at
// guarded planets; both are rare enough that finding one is an event.
export function surfaceRaidOf(planet) {
  if (!planet || planet.gas) return null;
  const rng = rngOf(planet.seed ?? 0, 0x2a1d);
  const r = rng.next();
  if (r < 0.05) return RAIDS.kolosus;
  if (r < 0.1) return RAIDS['titan-penjaga'];
  return null;
}

// Where the boss stands on the surface: far enough that you have to walk, close enough to find.
export function siteOf(planet, spawn) {
  const rng = rngOf(planet.seed ?? 0, 0x2a1e);
  const a = rng.range(0, Math.PI * 2), r = rng.range(170, 300);
  return { x: spawn.x + Math.cos(a) * r, z: spawn.z + Math.sin(a) * r };
}

// Contract pay scales with how many bosses the player has already put down.
export function contractReward(def, beaten) {
  const k = 1 + beaten * 0.15;
  return { nanit: Math.round(def.reward.nanit * 0.5 * k), xp: Math.round(def.reward.xp * 0.5),
    items: [['Nanit Terkompresi', 2 + beaten]] };
}
