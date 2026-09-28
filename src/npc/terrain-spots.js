// Ground queries for surface NPCs: dry land, gentle slopes, flat parking spots.
const MAX_SLOPE = 0.5;

export function isWet(h, planet, x, z) {
  const t = planet.terrain;
  return t.hasWater && h(x, z) <= t.waterY + 0.6;
}

export function isDryFlat(h, planet, x, z) {
  if (isWet(h, planet, x, z)) return false;
  const slope = Math.hypot(h(x + 2, z) - h(x - 2, z), h(x, z + 2) - h(x, z - 2)) / 4;
  return slope < MAX_SLOPE;
}

// Height spread under a ship footprint (centre + 4 pads), Infinity when wet or steep.
function unevenness(h, planet, x, z, r) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 5; i++) {
    const px = x + (i === 1 ? r : i === 2 ? -r : 0), pz = z + (i === 3 ? r : i === 4 ? -r : 0);
    if (!isDryFlat(h, planet, px, pz)) return Infinity;
    const y = h(px, pz);
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  }
  return hi - lo;
}

// Highest ground under the footprint so no pad sinks in.
export function restHeight(h, x, z, r) {
  return Math.max(h(x, z), h(x + r, z), h(x - r, z), h(x, z + r), h(x, z - r));
}

const blocked = (x, z, avoid) => avoid.some((a) => Math.hypot(x - a.x, z - a.z) < a.r);

// Flattest dry spot on a ring minR..maxR around `center`, away from `avoid` circles.
// Uses `rng` (Rng) so the pick is deterministic per seed. Returns { x, z } or null.
export function findParking(h, planet, rng, center, minR, maxR, footprint, avoid = []) {
  let best = null, bestScore = Infinity;
  for (let i = 0; i < 48; i++) {
    const a = rng.range(0, Math.PI * 2), d = rng.range(minR, maxR);
    const x = center.x + Math.cos(a) * d, z = center.z + Math.sin(a) * d;
    if (blocked(x, z, avoid)) continue;
    const score = unevenness(h, planet, x, z, footprint);
    if (score < bestScore) { best = { x, z }; bestScore = score; }
    if (bestScore < 0.5) break;
  }
  return best;
}

// A dry walk target within `radius` of (cx, cz), or null after a few tries.
export function walkTarget(h, planet, cx, cz, minR, radius, out) {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2, d = minR + Math.random() * (radius - minR);
    const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (isDryFlat(h, planet, x, z)) return out.set(x, h(x, z), z);
  }
  return null;
}
