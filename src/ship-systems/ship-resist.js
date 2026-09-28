// Ship environmental resistances (pure data): heat, cold, toxic, radiation, each 0..1.
// Procedural ships roll them from class + seed; custom ships get class base + a "Pelindung" specialty.
// Consumers: star heat in space, suit hazard shelter while flying on planets, gas-giant dive damage.
import { Rng, hash32 } from '../core/rng.js';

export const RESIST_KEYS = ['heat', 'cold', 'toxic', 'radiation'];
export const RESIST_LABELS = { heat: 'Tahan Panas', cold: 'Tahan Dingin', toxic: 'Tahan Toksik', radiation: 'Tahan Radiasi' };
export const ARMOR_OPTIONS = [['none', 'Seimbang'], ['heat', 'Panas'], ['cold', 'Dingin'], ['toxic', 'Toksik'], ['radiation', 'Radiasi']];
export const ARMOR_IDS = ARMOR_OPTIONS.map(([id]) => id);

// Hauler: thick hull vs heat; explorer: insulated vs cold + radiation; exotic: sealed bio-hull vs toxins.
const CLASS_RESIST = {
  fighter: { heat: 0.25, cold: 0.2, toxic: 0.15, radiation: 0.2 },
  explorer: { heat: 0.2, cold: 0.55, toxic: 0.2, radiation: 0.55 },
  hauler: { heat: 0.6, cold: 0.35, toxic: 0.3, radiation: 0.3 },
  exotic: { heat: 0.25, cold: 0.25, toxic: 0.6, radiation: 0.35 },
};
const SPECIALTY = 0.35;
const round2 = (v) => Math.round(Math.max(0, Math.min(0.9, v)) * 100) / 100;

// Seeded resistances for a procedural ship (separate rng stream: existing rolls stay identical).
export function rollResist(seed, cls) {
  const rng = new Rng(hash32(seed >>> 0, 0x2e515));
  const base = CLASS_RESIST[cls] ?? CLASS_RESIST.fighter;
  const out = {};
  for (const k of RESIST_KEYS) out[k] = round2(base[k] + rng.range(-0.1, 0.1));
  return out;
}

// Custom ships: class base, the chosen specialty +35%, a thicker hull (shield stat) adds a little.
export function customResist(cls, armor, shield = 1) {
  const base = CLASS_RESIST[cls] ?? CLASS_RESIST.fighter;
  const out = {};
  for (const k of RESIST_KEYS) out[k] = round2(base[k] + (armor === k ? SPECIALTY : 0) + (shield - 1) * 0.1);
  return out;
}

// Resist value of a design (old designs without the stat fall back to the class roll).
export function resistOf(design, key) {
  const v = design?.stats?.[key];
  if (Number.isFinite(v)) return v;
  return design ? rollResist(design.seed ?? 1, design.cls)[key] : 0;
}

// Planet hazard kinds the suit fights (same thresholds as life-support hazardFactors).
function planetHazards(planet, out) {
  out.length = 0;
  const t = planet?.temperature ?? 20;
  if (t > 45) out.push('heat');
  if (t < -10) out.push('cold');
  if ((planet?.toxicity ?? 0) >= 3) out.push('toxic');
  if ((planet?.radiation ?? 0) >= 3) out.push('radiation');
  return out;
}
const hazList = [];

// Multiplier 0..1 for suit hazard drain while flying the ship over `planet`.
export function shipShelter(design, planet) {
  const list = planetHazards(planet, hazList);
  if (!list.length) return 1;
  let sum = 0;
  for (const k of list) sum += 1 - resistOf(design, k);
  return Math.round((sum / list.length) * 100) / 100;
}

// Star-burn damage multiplier in space (black holes ignore resistances).
export function starHeatMul(design) {
  return 1 - 0.75 * resistOf(design, 'heat');
}

// Heat-resistant hulls take less star burn (black holes ignore it). Wraps space.onStarBurn once.
export function shieldStarBurn(space) {
  const burn = space.onStarBurn;
  if (!burn || burn.heatShielded) return;
  const shielded = (dt) => burn(space.system?.star?.blackHole ? dt : dt * starHeatMul(space.shipDesign ?? space.design));
  shielded.heatShielded = true;
  space.onStarBurn = shielded;
}

// Gas-giant dive damage multiplier by cause: deep pressure is hot and crushing, lightning is EM.
export function gasDamageMul(design, cause) {
  if (cause === 'Tekanan') return 1 - 0.6 * Math.max(resistOf(design, 'heat'), resistOf(design, 'cold') * 0.5);
  if (cause === 'Petir') return 1 - 0.5 * resistOf(design, 'radiation');
  return 1;
}
