// Which settlements a planet has and where they sit (deterministic from the planet seed).
import { Rng, hash32 } from '../core/rng.js';
import { breathable } from '../gameplay/life-support.js';
import { settlementName } from './names.js';

const SALT = 0x5e771e;
// Footprint radius (m) per settlement type.
export const RADIUS = { farm: 62, hamlet: 40, fishing: 48, town: 42, research: 26, colony: 36, mining: 18 };
const EARTH_ORDER = ['town', 'farm', 'fishing', 'research', 'hamlet', 'farm'];
const BASE_CLEAR = 150; // keep this far from the home base at the spawn

// -> [{ type, x, z, yaw, name, seed, r }]
export function planSettlements(planet, h, spawn) {
  const rng = new Rng(hash32(planet.seed, SALT));
  const types = settlementTypes(planet, rng);
  const out = [], used = new Set();
  types.forEach((type, i) => {
    const s = findSite(type, planet, h, spawn, rng, out, 450 + i * 250) ?? findSite(type, planet, h, spawn, rng, out);
    if (!s) return;
    out.push({ ...s, name: settlementName(s.type, rng, used), seed: hash32(planet.seed, SALT, i) });
  });
  return out;
}

function settlementTypes(planet, rng) {
  if (planet.style === 'earth') return EARTH_ORDER.slice(0, 3 + rng.int(4));
  if (planet.gas) return [];
  if (breathable(planet)) return Array(1 + rng.int(3)).fill('colony');
  return planet.atmosphereDensity > 0 && rng.chance(0.25) ? ['mining'] : [];
}

// Ring distances: Earth villages 200..1500 m; elsewhere stay clear of alien outposts (150..400 m).
const ringOf = (planet) => (planet.style === 'earth' ? [200, 1500] : [460, 1200]);

// Best spot on the ring lo..min(hi, cap) around the spawn -> site | null.
function findSite(type, planet, h, spawn, rng, taken, cap = Infinity) {
  const r = RADIUS[type], [lo, far] = ringOf(planet), hi = Math.min(far, cap);
  let best = null;
  for (let k = 0, n = type === 'fishing' ? 160 : 44; k < n; k++) {
    const a = rng.range(0, Math.PI * 2), d = rng.range(Math.max(lo, BASE_CLEAR + r), hi);
    const x = spawn.x + Math.cos(a) * d, z = spawn.z + Math.sin(a) * d;
    if (taken.some((t) => Math.hypot(x - t.x, z - t.z) < t.r + r + 80)) continue;
    const c = scoreSite(type, planet, h, x, z, r);
    if (c && (!best || c.score < best.score)) best = { type, x, z, r, yaw: c.yaw, score: c.score };
  }
  if (!best && type === 'fishing' && cap === Infinity) return findSite('hamlet', planet, h, spawn, rng, taken);
  return best;
}

const wetAt = (planet, h, x, z, m = 0.5) => planet.terrain.hasWater && h(x, z) < planet.terrain.waterY + m;

// Height spread and wet samples over a disc -> { spread, wet, top }
function survey(planet, h, x, z, r) {
  let lo = Infinity, hi = -Infinity, wet = 0;
  for (let ring = 0; ring <= 2; ring++) {
    const n = ring ? 8 * ring : 1;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, px = x + Math.cos(a) * r * ring / 2, pz = z + Math.sin(a) * r * ring / 2;
      const y = h(px, pz);
      lo = Math.min(lo, y); hi = Math.max(hi, y);
      if (wetAt(planet, h, px, pz, 0.8)) wet++;
    }
  }
  return { spread: hi - lo, wet, top: h(x, z) };
}

// Lower score is better; null when the spot cannot host this type.
function scoreSite(type, planet, h, x, z, r) {
  if (wetAt(planet, h, x, z, 1.5)) return null;
  if (type === 'fishing') return scoreCoast(planet, h, x, z);
  const s = survey(planet, h, x, z, r * 0.7);
  if (s.wet > 2) return null;
  const yaw = type === 'farm' ? bestFieldYaw(planet, h, x, z) : Math.floor((x * 7 + z * 13) % 6) * (Math.PI / 3);
  const lift = type === 'research' ? -s.top * 0.25 : 0; // research outposts like hilltops
  return { score: s.spread + s.wet * 4 + lift, yaw };
}

// Coast: dry centre with open water 30..45 m off in one direction; local -Z faces the sea.
function scoreCoast(planet, h, x, z) {
  let sx = 0, sz = 0, wet = 0;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
    if (wetAt(planet, h, x + dx * 38, z + dz * 38, 0)) { sx += dx; sz += dz; wet++; }
  }
  if (wet < 3 || wet > 9) return null;
  const yaw = Math.atan2(-sx, -sz); // local -Z = sea direction
  const land = survey(planet, h, x + Math.sin(yaw) * 18, z + Math.cos(yaw) * 18, 16);
  if (land.wet > 3) return null;
  return { score: land.spread + land.wet * 3 - 5, yaw };
}

// Farm fields lie on local -Z: pick the yaw whose field area is flattest and driest.
function bestFieldYaw(planet, h, x, z) {
  let best = 0, bestScore = Infinity;
  for (let k = 0; k < 6; k++) {
    const yaw = (k / 6) * Math.PI * 2, fx = x - Math.sin(yaw) * 44, fz = z - Math.cos(yaw) * 44;
    const s = survey(planet, h, fx, fz, 22);
    const score = s.spread + s.wet * 5;
    if (score < bestScore) { best = yaw; bestScore = score; }
  }
  return best;
}
