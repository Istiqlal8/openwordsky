// Galaxy layout: a spiral of star systems, each with 1..6 planets.
// System 0 is our Solar System (see solar-system.js).
import { Rng, hash32 } from '../core/rng.js';
import { systemName } from './names.js';
import { makePlanet } from './planet.js';
import { isGolden, goldenTouch } from '../surprise/golden.js';
import { isSolarSystem, toSolarSystem, solarPlanet } from './solar-system.js';
import { husk } from '../devourer/husk.js';

export { isSolarSystem } from './solar-system.js';

export const SYSTEM_COUNT = 4096;

const STARS = [
  { w: 30, type: 'G', label: 'Kuning', color: 0xffe9a8, size: 200 },
  { w: 25, type: 'M', label: 'Merah', color: 0xff7a4a, size: 140 },
  { w: 15, type: 'K', label: 'Jingga', color: 0xffb066, size: 170 },
  { w: 12, type: 'F', label: 'Putih', color: 0xfff6ee, size: 220 },
  { w: 10, type: 'B', label: 'Biru', color: 0x9ecbff, size: 280 },
  { w: 5, type: 'E', label: 'Hijau', color: 0x9fffb0, size: 180 },
  { w: 3, type: 'X', label: 'Ungu', color: 0xd29bff, size: 240 },
  // Black hole: `size` is the event horizon; `color` tints the accretion disk.
  { w: 2.5, type: 'BH', label: 'Lubang Hitam', color: 0xffa860, size: 160, blackHole: true },
];

const cache = new Map();

export function systemAt(galaxySeed, index) {
  const key = `${galaxySeed}:${index}`;
  if (cache.has(key)) return cache.get(key);
  const seed = hash32(galaxySeed, index, 0x5157);
  const rng = new Rng(seed);
  const arms = 4;
  const t = rng.next();
  const r = 30 + Math.pow(t, 0.8) * 900;
  const angle = (index % arms) * (Math.PI * 2 / arms) + r * 0.0065 + rng.range(-0.28, 0.28);
  const sys = {
    index, seed, name: systemName(rng),
    pos: { x: Math.cos(angle) * r + rng.range(-22, 22), y: rng.range(-25, 25) * (1 - t * 0.6),
      z: Math.sin(angle) * r + rng.range(-22, 22) },
    star: rng.weighted(STARS),
    planetCount: 1 + rng.int(6),
  };
  const out = isSolarSystem(index) ? toSolarSystem(sys) : sys;
  cache.set(key, out);
  return out;
}

export function allSystems(galaxySeed) {
  const list = [];
  for (let i = 0; i < SYSTEM_COUNT; i++) list.push(systemAt(galaxySeed, i));
  return list;
}

// Rare easter egg: a few planets are pure gold (see surprise/golden.js).
function withGold(planet) {
  planet.golden = isGolden(planet);
  if (!planet.golden) return planet;
  planet.palette = goldenTouch(planet);
  planet.atmosphereDensity = Math.max(planet.atmosphereDensity, 0.67);
  return planet;
}

export function planetsOf(galaxySeed, system) {
  const planets = [];
  const solar = isSolarSystem(system.index);
  for (let i = 0; i < system.planetCount; i++) {
    planets.push(husk(solar ? solarPlanet(galaxySeed, system, i) : withGold({ ...makePlanet(galaxySeed, system, i), style: null })));
  }
  return planets;
}
