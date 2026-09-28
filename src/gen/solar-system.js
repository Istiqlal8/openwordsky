// Our Solar System ("Tata Surya") as the special system at galaxy index 0.
// Planet sizes are to real relative scale (Earth = 32); the Sun and all
// distances are compressed — see solar-data.js.
import { makePlanet } from './planet.js';
import { makeSpecies } from './species.js';
import { SUN, SOLAR_PLANETS } from './solar-data.js';
import { earthSpecies } from '../earth/earth-species.js';

export const SOLAR_SYSTEM_INDEX = 0;

export function isSolarSystem(index) {
  return index === SOLAR_SYSTEM_INDEX;
}

// Keeps the procedural galaxy position/seed; swaps name, star and planet count.
export function toSolarSystem(sys) {
  return { ...sys, name: 'Tata Surya', star: { ...SUN }, planetCount: SOLAR_PLANETS.length };
}

function lifeOf(base, life) {
  return {
    flora: { ...base.flora, density: life.flora, kind: life.floraKind ?? base.flora.kind },
    fauna: { ...base.fauna, count: life.fauna, kind: life.faunaKind ?? base.fauna.kind,
      dinos: life.dinos, dinoKind: life.dinoKind ?? base.fauna.dinoKind },
    sea: { ...base.sea, count: life.sea, kind: life.seaKind ?? base.sea.kind },
  };
}

function statsOf(d) {
  return {
    biome: { ...d.biome }, temperature: d.temperature, atmosphere: d.atmosphere,
    atmosphereDensity: d.atmosphereDensity, gravity: d.gravity, radiation: d.radiation,
    toxicity: d.toxicity, weather: d.weather, hazard: d.hazard,
  };
}

function orbitOf(d) {
  const orbit = { radius: d.orbit, speed: d.speed ?? d.v / d.orbit, phase: d.phase, tilt: d.tilt };
  if (d.parent !== undefined) orbit.parent = d.parent;
  return orbit;
}

// Deterministic base from makePlanet, then real-world overrides.
export function solarPlanet(galaxySeed, system, index) {
  const d = SOLAR_PLANETS[index];
  const base = makePlanet(galaxySeed, system, index);
  const planet = {
    ...base, ...statsOf(d), ...lifeOf(base, d.life),
    name: d.name, radius: d.radius, sizeLabel: d.sizeLabel, shape: 'sphere',
    orbit: orbitOf(d),
    palette: { ...d.palette, sun: 0xffffff }, terrain: { ...d.terrain },
    resources: [...d.resources], moons: d.moons, rings: d.rings, gas: d.gas, style: d.style,
  };
  planet.species = d.style === 'earth' ? earthSpecies()
    : d.life.fauna || d.life.flora ? makeSpecies(planet) : { fauna: [], flora: [] };
  return planet;
}
