// Planet descriptor: everything about a planet, derived from its seed.
import { Rng, hash32 } from '../core/rng.js';
import { hsl, shiftHex, mixHex } from '../core/color.js';
import { planetName } from './names.js';
import { makeSpecies } from './species.js';
import { BIOMES, COMMON_RESOURCES, FLORA_KINDS, FAUNA_KINDS, pickTerrainStyle, waterChanceOf } from './biomes.js';

const ATMOS = ['Tanpa atmosfer', 'Tipis', 'Sedang', 'Padat'];

function exoticBase(rng, base) {
  const h = rng.next();
  return { ...base,
    sky: hsl(h + 0.5, 0.6, 0.72), fog: hsl(h + 0.5, 0.5, 0.78),
    g1: hsl(h, 0.55, 0.45), g2: hsl(h + 0.08, 0.5, 0.28),
    rock: hsl(h - 0.1, 0.25, 0.4), water: hsl(h + 0.33, 0.7, 0.45) };
}

function jitter(rng, hex, amt = 1) {
  return shiftHex(hex, rng.range(-0.05, 0.05) * amt, rng.range(-0.12, 0.12) * amt, rng.range(-0.07, 0.07) * amt);
}

function makePalette(rng, b) {
  const floraHue = rng.next();
  return {
    ground1: jitter(rng, b.g1), ground2: jitter(rng, b.g2), rock: jitter(rng, b.rock),
    water: jitter(rng, b.water, 0.6), sky: jitter(rng, b.sky, 0.8), fog: jitter(rng, b.fog, 0.8),
    flora: rng.chance(0.55) ? jitter(rng, mixHex(b.g1, 0x2f8f2f, 0.4), 1.6) : hsl(floraHue, 0.6, 0.45),
    floraAlt: hsl(floraHue + rng.range(0.2, 0.6), 0.7, 0.55),
    fauna: hsl(rng.next(), rng.range(0.4, 0.8), rng.range(0.4, 0.6)),
    sun: 0xffffff,
  };
}

function makeTerrain(rng, b) {
  const t = pickTerrainStyle(rng, b.id);
  const amp = rng.range(t.amp[0], t.amp[1]);
  const hasWater = rng.chance(waterChanceOf(b, t));
  const waterFrac = b.id === 'ocean' ? rng.range(0.05, 0.25) : rng.range(-0.35, 0.05);
  return {
    style: t.style, amp, freq: rng.range(t.freq[0], t.freq[1]), gain: rng.range(0.42, 0.58),
    hasWater, waterY: amp * waterFrac,
    spaceWater: hasWater ? (b.id === 'ocean' ? rng.range(0.55, 0.62) : rng.range(0.4, 0.5)) : 0,
  };
}

const DINO_BIOMES = ['lush', 'toxic', 'irradiated', 'exotic', 'ocean', 'fungal', 'swamp'];

function makeLife(rng, b, hasWater) {
  const density = rng.range(b.flora[0], b.flora[1]);
  const faunaCount = density < 0.05 ? 0 : Math.round(rng.range(0, 6) * Math.min(1, density + 0.3));
  const dinos = DINO_BIOMES.includes(b.id) && faunaCount > 0 && rng.chance(0.45);
  const seaCount = hasWater && b.id !== 'volcanic' && density > 0.1 ? 3 + rng.int(8) : 0;
  return {
    flora: { density, kind: rng.pick(FLORA_KINDS), scale: rng.range(0.6, 2.2) },
    fauna: { count: faunaCount, kind: rng.pick(FAUNA_KINDS), size: rng.range(0.5, 2.4),
      dinos: dinos ? 1 + rng.int(3) : 0, dinoKind: rng.pick(['rex', 'raptor', 'longneck']) },
    sea: { count: seaCount, kind: rng.pick(['fish', 'jelly', 'whale']) },
  };
}

function makeStats(rng, b) {
  const temperature = Math.round(rng.range(b.temp[0], b.temp[1]));
  const atmosIndex = b.id === 'barren' ? rng.int(2) : 1 + rng.int(3);
  return {
    temperature, atmosphere: ATMOS[atmosIndex], atmosphereDensity: atmosIndex / 3,
    gravity: +rng.range(4, 16).toFixed(1),
    radiation: b.id === 'irradiated' ? 3 + rng.int(3) : rng.int(2),
    toxicity: b.id === 'toxic' ? 3 + rng.int(3) : rng.int(2),
    weather: rng.pick(b.weather), hazard: b.hazard,
  };
}

const SIZE_CLASSES = [
  { w: 25, r: [15, 35], label: 'Kerdil' }, { w: 35, r: [35, 70], label: 'Kecil' },
  { w: 28, r: [70, 120], label: 'Sedang' }, { w: 12, r: [120, 190], label: 'Raksasa' },
];
const ODD_SHAPES = ['potato', 'twin', 'donut', 'shattered', 'cube'];

// Size, shape, orbit and gravity use their own stream so other traits keep their seeds.
function makeBody(seed, system, index) {
  const rng = new Rng(hash32(seed, 0xb0d1));
  const cls = rng.weighted(SIZE_CLASSES);
  const radius = rng.range(cls.r[0], cls.r[1]);
  const orbitRadius = system.star.size * 3 + 900 + index * rng.range(2200, 3200) + rng.range(0, 600);
  return {
    radius, sizeLabel: cls.label,
    shape: rng.chance(0.12) ? rng.pick(ODD_SHAPES) : 'sphere',
    orbit: { radius: orbitRadius, speed: rng.range(2, 8) / orbitRadius,
      phase: rng.range(0, Math.PI * 2), tilt: rng.range(-0.08, 0.08) },
    gravity: +(3 + ((radius - 15) / 175) * 14 + rng.range(-1.5, 1.5)).toFixed(1),
  };
}

function withLife(rng, b, terrain) {
  return { terrain, ...makeLife(rng, b, terrain.hasWater) };
}

export function makePlanet(galaxySeed, system, index) {
  const seed = hash32(galaxySeed, system.index * 131 + 7, index * 17 + 3);
  const rng = new Rng(seed);
  const picked = rng.weighted(BIOMES);
  const b2 = picked.id === 'exotic' ? exoticBase(rng, picked) : picked;
  const resources = [...rng.take(b2.resources, 2 + rng.int(2)), rng.pick(COMMON_RESOURCES)];
  const planet = {
    key: `${system.index}-${index}`, seed, index, systemIndex: system.index,
    name: planetName(rng, system.name, index),
    biome: { id: b2.id, label: b2.label },
    palette: makePalette(rng, b2),
    ...withLife(rng, b2, makeTerrain(rng, b2)),
    ...makeStats(rng, b2),
    ...makeBody(seed, system, index),
    gas: false,
    resources: [...new Set(resources)],
    moons: rng.int(4), rings: rng.chance(0.22),
  };
  planet.species = makeSpecies(planet);
  return planet;
}
