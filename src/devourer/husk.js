// Planets the Pemakan Planet finished eating. galaxy.js runs every generated planet through
// husk(): a consumed world comes back as a shattered, colourless wreck instead of vanishing,
// so system indices, orbits and save keys all stay exactly where they were.
import { mixHex } from '../core/color.js';

let EATEN = new Set();
let SCARRED = new Set();

// Called by the devourer addon while the save is loading and after every outcome.
export function setEatenKeys(keys, scarred) {
  EATEN = new Set(keys ?? []);
  if (scarred) SCARRED = new Set(scarred);
}

export function isEaten(key) {
  return EATEN.has(key);
}

function drain(hex) {
  return mixHex(hex, 0x191a20, 0.78);
}

// A world the fleet saved: burnt and dimmed, but alive.
function scar(planet) {
  const p = planet.palette;
  planet.scarred = true;
  planet.biome = { id: planet.biome.id, label: `${planet.biome.label} \u00b7 terluka` };
  planet.palette = { ...p, ground1: mixHex(p.ground1, 0x2a2420, 0.3), ground2: mixHex(p.ground2, 0x2a2420, 0.3),
    flora: mixHex(p.flora, 0x3a3228, 0.35), sky: mixHex(p.sky, 0x4a3a30, 0.25) };
  return planet;
}

export function husk(planet) {
  if (!planet) return planet;
  if (SCARRED.has(planet.key)) return scar(planet);
  if (!EATEN.has(planet.key)) return planet;
  const p = planet.palette;
  planet.eaten = true;
  planet.shape = 'shattered';
  planet.radius *= 0.55;
  planet.rings = false;
  planet.name = `${planet.name} (Sisa)`;
  planet.biome = { id: planet.biome.id, label: 'Bangkai planet' };
  planet.palette = { ...p, ground1: drain(p.ground1), ground2: drain(p.ground2), rock: drain(p.rock),
    water: drain(p.water), flora: drain(p.flora), floraAlt: drain(p.floraAlt), sky: drain(p.sky), fog: drain(p.fog) };
  planet.atmosphereDensity = 0;
  planet.atmosphere = 'Tanpa atmosfer';
  planet.flora = { ...planet.flora, density: 0 };
  planet.fauna = { ...planet.fauna, count: 0, dinos: 0 };
  planet.sea = { ...planet.sea, count: 0 };
  return planet;
}
