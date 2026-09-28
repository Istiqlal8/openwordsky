// Planets that were orbiting a star when it went nova.
//
// Same trick as devourer/husk.js: gen/galaxy.js runs every generated planet through scorch(),
// so a dead system's worlds come back burnt on every later visit while their indices, orbits and
// save keys stay exactly where they were. Nothing is deleted, so nothing downstream breaks.
import { mixHex } from '../core/color.js';
import { isDeadSystem } from './dead-registry.js';

const ASH = 0x1b1512;
// Only a crust that has been through a nova carries this — the reason to come back to a corpse.
const CRUST = ['Debu Bintang', 'Ferit', 'Uranium'];

const char = (hex) => mixHex(hex, ASH, 0.8);

function burntPalette(p) {
  return { ...p,
    ground1: char(p.ground1), ground2: char(p.ground2), rock: char(p.rock), water: char(p.water),
    flora: char(p.flora), floraAlt: char(p.floraAlt), fauna: char(p.fauna),
    sky: mixHex(p.sky, 0x3a2a26, 0.72), fog: mixHex(p.fog, 0x2e211d, 0.72) };
}

// Nothing survives the front. Counts go to zero rather than the arrays going away, so the
// surface builders keep the shapes they expect.
function strip(planet) {
  planet.flora = { ...planet.flora, density: 0 };
  planet.fauna = { ...planet.fauna, count: 0, dinos: 0 };
  planet.sea = { ...planet.sea, count: 0 };
  planet.species = { fauna: [], flora: [] };
  planet.terrain = { ...planet.terrain, hasWater: false, spaceWater: 0 };
}

export function scorch(planet) {
  if (!planet || planet.scorched || !isDeadSystem(planet.systemIndex)) return planet;
  planet.scorched = true;
  planet.name = `${planet.name} (Hangus)`;
  planet.biome = { id: planet.biome.id, label: `${planet.biome.label} · hangus` };
  planet.palette = burntPalette(planet.palette);
  planet.atmosphere = 'Tanpa atmosfer';
  planet.atmosphereDensity = 0;
  planet.weather = 'Hening total';
  planet.hazard = 'Kerak radioaktif';
  planet.temperature = Math.round(planet.temperature * 0.2) + 180;
  planet.radiation = 5;
  planet.rings = false;
  planet.resources = [...CRUST];
  strip(planet);
  return planet;
}
