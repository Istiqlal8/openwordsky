// Per-planet species catalog: body plans ("genes") + scanner lore for fauna and flora.
import { Rng } from '../core/rng.js';
import { hsl, shiftHex } from '../core/color.js';
import { word } from './names.js';
import * as T from './species-traits.js';
import { BIOMES } from './biomes.js';
import { breathable } from '../gameplay/life-support.js';

const FLORA_PREF = Object.fromEntries(BIOMES.map((b) => [b.id, b.floraPref ?? null]));
const GLOWY = ['fungal', 'crystal', 'exotic', 'irradiated'];

const SUFFIX = ['ops', 'ith', 'ora', 'yx', 'odon', 'ella', 'aur', 'ix', 'umba', 'ipede'];

function speciesName(rng) {
  return `${word(rng)}${rng.pick(SUFFIX)}`;
}

function faunaFeatures(rng, body) {
  const out = [];
  for (const [id, p] of T.FAUNA_FEATURES) if (rng.chance(p)) out.push(id);
  if (out.includes('belalai')) return out.filter((f) => f !== 'moncong' && f !== 'gading');
  return body === 'ular' ? out.filter((f) => f !== 'cangkang') : out;
}

function legsFor(rng, move, body) {
  if (body === 'ular') return 0;
  if (move === 'melayang' || move === 'terbang') return rng.pick([0, 0, 2]);
  return rng.pick(move === 'merayap' ? [0, 6, 8] : [2, 4, 4, 6]);
}

function faunaGenes(rng, planet) {
  const { move } = rng.weighted(T.FAUNA_MOVES);
  const body = rng.pick(T.FAUNA_BODIES);
  const primary = rng.chance(0.5) ? shiftHex(planet.palette.fauna, rng.range(-0.2, 0.2), 0, rng.range(-0.1, 0.1))
    : hsl(rng.next(), rng.range(0.4, 0.9), rng.range(0.35, 0.6));
  const glowP = planet.atmosphereDensity < 0.4 || GLOWY.includes(planet.biome.id) ? 0.55 : 0.2;
  return {
    move, body, legs: legsFor(rng, move, body), size: rng.range(0.35, 3.2),
    eyes: 1 + rng.int(rng.chance(0.2) ? 6 : 2), eyeStalks: rng.chance(0.25),
    horns: rng.chance(0.4) ? 1 + rng.int(3) : 0, antennae: rng.chance(0.35),
    tail: body === 'ular' ? 'short' : rng.pick(T.TAILS), spikes: rng.chance(0.3), wings: move === 'terbang',
    glow: rng.chance(glowP),
    primary, secondary: hsl(rng.next(), rng.range(0.5, 1), rng.range(0.45, 0.7)),
    speed: rng.range(1.5, 7), stretch: rng.range(0.7, 1.8),
    features: faunaFeatures(rng, body), heads: rng.chance(0.06) ? 2 : 1,
    pattern: rng.pick(T.PATTERNS), seed: rng.int(0x7fffffff),
  };
}

function faunaLore(rng, genes) {
  return {
    temperament: rng.pick(T.TEMPERAMENTS), diet: rng.pick(T.DIETS), quirk: rng.pick(T.FAUNA_QUIRKS),
    height: +(genes.size * rng.range(0.6, 1.6)).toFixed(1),
    weight: Math.round(genes.size ** 3 * rng.range(15, 90)),
  };
}

function floraShape(rng, planet) {
  const pref = FLORA_PREF[planet.biome.id];
  return pref && rng.chance(0.6) ? rng.pick(pref) : rng.pick(T.FLORA_SHAPES);
}

function floraGenes(rng, planet) {
  const shape = floraShape(rng, planet);
  const base = rng.chance(0.5) ? planet.palette.flora : planet.palette.floraAlt;
  const giant = rng.chance(0.07) ? 1.8 : 1;
  return {
    shape, height: Math.min(14, rng.range(0.6, 4.5) * planet.flora.scale * giant),
    primary: shiftHex(base, rng.range(-0.12, 0.12), 0, rng.range(-0.08, 0.08)),
    secondary: hsl(rng.next(), rng.range(0.5, 1), rng.range(0.45, 0.7)),
    glow: rng.chance(planet.atmosphereDensity < 0.4 || GLOWY.includes(planet.biome.id) ? 0.6 : 0.25),
    sway: rng.range(0, 1), weight: rng.range(0.4, 1.6),
  };
}

// Lush and breathable worlds teem with life: 50-70 fauna and 30-38 flora species (the fauna are
// streamed in herds around the player, so only a few dozen animals exist at once).
function speciesCounts(rng, planet) {
  const d = planet.flora.density;
  if (breathable(planet)) return { fauna: 55 + rng.int(16), flora: 30 + rng.int(9) };
  if (planet.biome.id === 'lush' && d >= 0.3) return { fauna: 50 + rng.int(11), flora: 30 + rng.int(6) };
  if (d < 0.05) return { fauna: rng.chance(0.4) ? 1 : 0, flora: rng.chance(0.5) ? 1 : 0 };
  return { fauna: 2 + rng.int(Math.round(2 + d * 4)), flora: 2 + rng.int(Math.round(1 + d * 4)) };
}

export function makeSpecies(planet) {
  const rng = new Rng(planet.seed ^ 0x5bec1e5);
  const counts = speciesCounts(rng, planet);
  const fauna = [];
  for (let i = 0; i < counts.fauna; i++) {
    const genes = faunaGenes(rng, planet);
    fauna.push({ id: i, name: speciesName(rng), genes, lore: faunaLore(rng, genes),
      herd: genes.size > 2 ? 1 + rng.int(2) : 2 + rng.int(5) });
  }
  const flora = [];
  for (let i = 0; i < counts.flora; i++) {
    const genes = floraGenes(rng, planet);
    flora.push({ id: i, name: speciesName(rng), genes, label: T.FLORA_LABELS[genes.shape],
      quirk: rng.pick(T.FLORA_QUIRKS) });
  }
  return { fauna, flora };
}

export { MOVE_LABELS, FLORA_LABELS, BODY_LABELS, FEATURE_LABELS } from './species-traits.js';
