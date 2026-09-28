// Trade worlds ("Planet Dagang"): ~3% of solid planets with an atmosphere host a bustling
// spaceport-market city. Deterministic from the planet seed; never in the Solar System.
import { unitOf } from '../core/rng.js';

// Salt chosen so the default galaxy (seed 1337) has trade worlds in the systems nearest to the
// Solar System (3104:1) and among systems 1–20 (5:4, 17:2, 17:3, 19:1).
const SALT = 0x7df;
const CHANCE = 0.03;

export const TRADE_LABEL = 'Planet Dagang';
export const TRADE_COLOR = 0xffc94a;

export function isTradeWorld(planet) {
  if (!planet || planet.gas || planet.style || !(planet.atmosphereDensity > 0)) return false;
  return unitOf(planet.seed, SALT) < CHANCE;
}

// Trade worlds among a system's planets (for HUD markers) -> [planet].
export function tradeWorldsIn(system, planets = []) {
  if (system?.index === 0) return [];
  return planets.filter(isTradeWorld);
}
