// Ship primary weapon catalog (pure data, no three.js). Every design carries a `weapon` id:
// procedural ships roll one from their class + seed, custom ships pick one in the shipyard.
// Rockets on RMB stay the secondary weapon for every ship.
import { hash32 } from '../core/rng.js';

// mode: 'bolt' (straight projectiles), 'seeker' (homing missiles), 'beam' (continuous hitscan).
// damage is per bolt / missile / beam-second before the design's damage multiplier.
export const SHIP_WEAPONS = {
  laser: { id: 'laser', label: 'Laser Pulsa', mode: 'bolt', gap: 0.125, cost: 0.6, speed: 420, damage: 10, life: 1.4,
    color: 0x44ccff, flash: 0x9fe8ff, length: 7, width: 0.32, pellets: 1, spread: 0, splash: 0, shake: 0.05 },
  plasma: { id: 'plasma', label: 'Meriam Plasma', mode: 'bolt', gap: 0.5, cost: 2.4, speed: 210, damage: 30, life: 2.4,
    color: 0x8dff3a, flash: 0xd4ff9a, length: 2.4, width: 1.1, shape: 'ball', pellets: 1, spread: 0, splash: 10, shake: 0.18 },
  flak: { id: 'flak', label: 'Senapan Flak', mode: 'bolt', gap: 0.55, cost: 2.2, speed: 360, damage: 5, life: 0.5,
    color: 0xffa030, flash: 0xffd080, length: 2.2, width: 0.26, pellets: 9, spread: 0.07, splash: 0, shake: 0.14 },
  homing: { id: 'homing', label: 'Rudal Pemburu', mode: 'seeker', gap: 0.7, cost: 3.5, speed: 70, maxSpeed: 230, turn: 3.2,
    damage: 32, radius: 9, life: 4.5, volley: 1, scale: 1.6, flame: 0xffb050, capacity: 12, cone: 40 },
  swarm: { id: 'swarm', label: 'Kawanan Mikro-Rudal', mode: 'seeker', gap: 1.1, cost: 5, speed: 60, maxSpeed: 260, turn: 5.5,
    damage: 9, radius: 4, life: 3.2, volley: 5, scale: 0.55, flame: 0xd070ff, capacity: 40, cone: 55 },
  beam: { id: 'beam', label: 'Sinar Kontinu', mode: 'beam', cost: 6, damage: 60, range: 520, tick: 0.1,
    color: 0xff4de8, core: 0xffd8fa, width: 0.32 },
};

export const WEAPON_IDS = Object.keys(SHIP_WEAPONS);

// Shipyard / HUD names in Indonesian.
export const WEAPON_OPTIONS = WEAPON_IDS.map((id) => [id, SHIP_WEAPONS[id].label]);

// Weighted-by-repetition pools: each class leans toward a fighting style.
const CLASS_POOL = {
  fighter: ['laser', 'laser', 'flak', 'plasma', 'swarm'],
  explorer: ['laser', 'beam', 'beam', 'homing'],
  hauler: ['flak', 'plasma', 'homing', 'swarm'],
  exotic: ['beam', 'swarm', 'plasma', 'homing'],
};

// Deterministic weapon for a procedural design (own hash, so existing ship rolls stay unchanged).
export function rollWeapon(seed, cls) {
  const pool = CLASS_POOL[cls] ?? CLASS_POOL.fighter;
  return pool[hash32(seed >>> 0, 0x6e4) % pool.length];
}

// Weapon id of any design (old saves without `weapon` fall back to the class roll).
export function weaponId(design) {
  if (design?.weapon && SHIP_WEAPONS[design.weapon]) return design.weapon;
  return design ? rollWeapon(design.seed ?? 1, design.cls) : 'laser';
}

export function weaponOf(design) {
  return SHIP_WEAPONS[weaponId(design)];
}

// HUD label, e.g. "Rudal Pemburu".
export function shipWeaponLabel(design) {
  return weaponOf(design).label;
}
