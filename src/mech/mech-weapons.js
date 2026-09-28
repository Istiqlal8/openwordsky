// Mech weapon catalog. One entry per firing mode, holding three things: the space stats (fed
// straight into GunBattery, src/ship-systems/gun-battery.js), the surface stats (resolved through
// WeaponHits) and how the body should hold, brace and recoil while firing it. Pure data.

export const RIFLE = 'rifle';
export const BAZOOKA = 'bazooka';
export const GATLING = 'gatling';
export const CANNON = 'cannon';
export const POD = 'pod';
export const SABER = 'saber';

// hold: which firing pose mech-aim.js drives. recoil: impulse fed to the recoil spring.
// cam: { shake, fov } per shot (per second for the sustained beam).
export const MODES = [
  {
    id: RIFLE, name: 'Senapan Sinar', short: 'SENAPAN', hold: 'rifle', gauge: 'heat',
    recoil: 0.55, flashSize: 0.2, cam: { shake: 0.1, fov: 0.6 }, heat: 0.075, cool: 0.5, color: 0x9fd4ff, flash: 0xe4f4ff,
    space: { id: 'mechRifle', mode: 'bolt', gap: 0.16, cost: 1.1, speed: 620, damage: 26, life: 1.7,
      color: 0x9fd4ff, flash: 0xe4f4ff, length: 11, width: 0.55, pellets: 1, spread: 0, splash: 0, shake: 0 },
    ground: { gap: 0.15, cost: 0.85, damage: 3.2, spread: 0, range: 420, splash: 0 },
  },
  {
    id: BAZOOKA, name: 'Basoka', short: 'BASOKA', hold: 'shoulder', gauge: 'ammo', ammo: 6, reload: 2.6,
    recoil: 2.4, flashSize: 0.44, cam: { shake: 0.75, fov: 5.5 }, heat: 0, cool: 0, color: 0xff9a3c, flash: 0xffd9a0,
    backblast: true,
    space: { id: 'mechBazooka', mode: 'seeker', gap: 1.2, cost: 9, speed: 110, maxSpeed: 230, turn: 0.75,
      damage: 130, radius: 26, life: 5, volley: 1, scale: 2.3, flame: 0xffb050, capacity: 8, cone: 22, shake: 0 },
    ground: { gap: 1.35, cost: 11, damage: 16, radius: 16, speed: 95, turn: 0.5, volley: 1, scale: 1.5 },
  },
  {
    id: GATLING, name: 'Gatling Vulcan', short: 'VULCAN', hold: 'braced', gauge: 'heat',
    recoil: 0.3, flashSize: 0.15, cam: { shake: 0.05, fov: 0.25 }, heat: 0.028, cool: 0.32, color: 0xffe07a, flash: 0xfff2c0,
    spinUp: 0.55, spinDown: 1.5, casings: true,
    space: { id: 'mechGatling', mode: 'bolt', gap: 0.055, cost: 0.42, speed: 800, damage: 7, life: 1.1,
      color: 0xffe07a, flash: 0xfff2c0, length: 7, width: 0.3, pellets: 1, spread: 0.026, splash: 0, shake: 0 },
    ground: { gap: 0.05, cost: 0.34, damage: 0.85, spread: 0.022, range: 300, splash: 0 },
  },
  {
    id: CANNON, name: 'Meriam Partikel', short: 'MERIAM', hold: 'charge', gauge: 'charge',
    recoil: 0.18, flashSize: 0.46, cam: { shake: 0.2, fov: 7 }, heat: 0.34, cool: 0.22, color: 0xb98cff, flash: 0xe8d4ff,
    charge: 1.1,
    space: { id: 'mechCannon', mode: 'beam', cost: 16, damage: 210, tick: 0.12, range: 340,
      width: 1.1, color: 0xb98cff, core: 0xffffff },
    ground: { cost: 15, damage: 26, tick: 0.1, range: 260, width: 3.0, radius: 3.4,
      color: 0xb98cff, core: 0xffffff },
  },
  {
    id: POD, name: 'Misil Pod', short: 'MISIL', hold: 'rifle', gauge: 'ammo', ammo: 8, reload: 3.4,
    recoil: 0.35, flashSize: 0.2, cam: { shake: 0.32, fov: 2 }, heat: 0, cool: 0, color: 0xffc070, flash: 0xffe0b0,
    shoulderPads: true,
    space: { id: 'mechPod', mode: 'seeker', gap: 1.9, cost: 11, speed: 80, maxSpeed: 270, turn: 4.8,
      damage: 38, radius: 14, life: 4.6, volley: 4, scale: 1.15, flame: 0xffc070, capacity: 18, cone: 58, shake: 0 },
    ground: { gap: 2.1, cost: 12, damage: 7, radius: 12, speed: 70, turn: 3.2, volley: 4, scale: 0.9 },
  },
  {
    id: SABER, name: 'Pedang Sinar', short: 'PEDANG', hold: 'melee', gauge: 'combo',
    recoil: 0, flashSize: 0.22, cam: { shake: 0.3, fov: 3 }, heat: 0, cool: 0, color: 0xff7ae0, flash: 0xffd0f4,
    space: { cost: 6, damage: [120, 140, 220], reach: 46, lunge: 130 },
    ground: { cost: 6, damage: [10, 12, 20], radius: [7, 8.5, 6.5], reach: 16 },
  },
];

export const MODE_COUNT = MODES.length;
const BY_ID = Object.fromEntries(MODES.map((m) => [m.id, m]));

export function modeById(id) { return BY_ID[id] ?? MODES[0]; }
export function modeIndex(id) { return MODES.findIndex((m) => m.id === id); }

// Wrapped step through the cycle.
export function cycleMode(id, step) {
  const i = modeIndex(id);
  return MODES[(i + step + MODE_COUNT * 2) % MODE_COUNT].id;
}

// The RMB quick-launch always uses the missile pod, whatever the selected mode is.
export const QUICK_POD = BY_ID[POD];
export const SABER_MODE = BY_ID[SABER];
