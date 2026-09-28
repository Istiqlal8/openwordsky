// Legendary monsters: one named giant per biome, living on ~15% of that biome's planets.
// Pure data + deterministic helpers (no three.js) so the journal can search the galaxy cheaply.
import { rngOf } from '../core/rng.js';

export const LEGEND_CHANCE = 0.15;

// id = biome id. scale: model size multiplier; hp: in wildlife hit points (25 per blaster hit).
export const LEGENDS = {
  lush: { name: 'Raja Rimba', where: 'subur', primary: 0x3f8a3a, secondary: 0xd8ff6a, glow: 0x9cff4a, scale: 7, hp: 1500, body: 'lonjong' },
  desert: { name: 'Naga Pasir', where: 'gurun', primary: 0xc79a55, secondary: 0xff7a2a, glow: 0xffb040, scale: 8, hp: 1700, body: 'segmen' },
  frozen: { name: 'Raja Salju', where: 'beku', primary: 0xe8f4ff, secondary: 0x6fc8ff, glow: 0x9fe8ff, scale: 8, hp: 1800, body: 'bulat' },
  toxic: { name: 'Ratu Racun', where: 'toksik', primary: 0x6a9a2a, secondary: 0xd4ff3a, glow: 0xb6ff2a, scale: 7, hp: 1500, body: 'pipih' },
  irradiated: { name: 'Titan Radiasi', where: 'radioaktif', primary: 0x8a8a3a, secondary: 0xf0ff4a, glow: 0xeaff3a, scale: 8, hp: 1800, body: 'tong' },
  volcanic: { name: 'Behemot Magma', where: 'vulkanik', primary: 0x3a2622, secondary: 0xff5a1a, glow: 0xff6a2a, scale: 9, hp: 2000, body: 'kubus' },
  barren: { name: 'Penjaga Batu', where: 'gersang', primary: 0x8a8580, secondary: 0xd8c8a8, glow: 0xffe0a0, scale: 8, hp: 1900, body: 'kubus' },
  ocean: { name: 'Leviatan Karang', where: 'samudra', primary: 0x2a6a8a, secondary: 0xff8a7a, glow: 0x5ae8ff, scale: 8, hp: 1700, body: 'lonjong' },
  exotic: { name: 'Anomali Purba', where: 'eksotis', primary: 0x5a2a8a, secondary: 0x2affd8, glow: 0xd06aff, scale: 7, hp: 1600, body: 'bola-ganda' },
  crystal: { name: 'Golem Prisma', where: 'kristal', primary: 0xb8a8ff, secondary: 0xffffff, glow: 0xd8c8ff, scale: 8, hp: 1900, body: 'kubus' },
  fungal: { name: 'Induk Spora', where: 'jamur', primary: 0x7a4a8a, secondary: 0xffd06a, glow: 0xff9aff, scale: 7, hp: 1500, body: 'bulat' },
  swamp: { name: 'Siluman Rawa', where: 'rawa', primary: 0x4a5a32, secondary: 0xa8c86a, glow: 0x8aff9a, scale: 7, hp: 1600, body: 'pipih' },
  glass: { name: 'Kolosus Kaca', where: 'kaca', primary: 0x3a3a5a, secondary: 0x8ad8ff, glow: 0xa8a8ff, scale: 8, hp: 1800, body: 'segmen' },
  candy: { name: 'Raksasa Gula', where: 'permen', primary: 0xff9ad8, secondary: 0xfff0a8, glow: 0xff6ad0, scale: 7, hp: 1400, body: 'bola-ganda' },
};

export const LEGEND_IDS = Object.keys(LEGENDS);

export const trophyOf = (def) => `Trofi Legendaris ${def.name}`;

// -> legend definition (with id) for this planet, or null. Deterministic by planet seed.
export function legendOf(planet) {
  const id = planet?.biome?.id;
  if (!id || !LEGENDS[id] || planet.gas || planet.style === 'earth') return null;
  if (!planet.species?.fauna?.length) return null;
  if (rngOf(planet.seed ?? 0, 0x1e6e).next() >= LEGEND_CHANCE) return null;
  return { id, ...LEGENDS[id] };
}

// Lair 200..400 units from the landing spot, deterministic per planet.
export function lairOf(planet, spawn) {
  const rng = rngOf(planet.seed ?? 0, 0x1e6f);
  const a = rng.range(0, Math.PI * 2), r = rng.range(200, 400);
  return { x: spawn.x + Math.cos(a) * r, z: spawn.z + Math.sin(a) * r };
}

// Giant body plan for creature-builder: horned, spiked, glowing, club-tailed walker.
export function legendGenes(def, seed) {
  const rng = rngOf(seed ?? 1, 0x1e70);
  return {
    move: 'jalan', body: def.body, legs: rng.pick([4, 4, 6]), size: 1,
    eyes: 2 + rng.int(3), eyeStalks: false, horns: 2 + rng.int(2), antennae: rng.chance(0.4),
    tail: 'club', spikes: true, wings: false, glow: true,
    primary: def.primary, secondary: def.secondary,
    speed: 5, stretch: rng.range(1.1, 1.5),
    features: ['gading', 'jambul', 'bintik'], heads: 1,
    pattern: rng.pick(['belang', 'totol', 'dua-warna']), seed: rng.int(0x7fffffff),
  };
}
