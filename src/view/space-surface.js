// Per-vertex surface coloring for space-view bodies: palette, water, ice caps and craters.
// surfaceColorer(planet)(v, out) colors `out` for sample point v (unit direction on spheres)
// and returns the height above sea level (<= 0 means water or lowland).
import * as THREE from 'three';
import { fbm3 } from '../core/noise.js';
import { Rng } from '../core/rng.js';

const { smoothstep } = THREE.MathUtils;
const ICE = new THREE.Color(0xf2f7fb);

// Hand-tuned rocky looks for Solar System bodies (planet.style).
const ROCKY_STYLES = {
  earth: { g1: 0x3f7b35, g2: 0x9a8455, rock: 0x6f604f, water: 0x2466b8, deep: 0x0b2766, sea: 0.53, cap: 0.84 },
  mars: { g1: 0xc0602f, g2: 0x7c3520, rock: 0x5a2a1a, cap: 0.93 },
  mercury: { g1: 0x7f7c78, g2: 0x6a6763, rock: 0x5c5a57, craters: 90 },
  moon: { g1: 0xc4c2bc, g2: 0x8e8c88, rock: 0x7a7976, craters: 80 },
};

function makeCraters(seed, count) {
  const rng = new Rng(seed ^ 0xc4a7);
  return Array.from({ length: count }, () => {
    const v = new THREE.Vector3(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)).normalize();
    const r = 0.05 + rng.next() ** 4 * 0.3;
    return { v, r, cosOuter: Math.cos(r * 1.25) };
  });
}

function colorsOf(planet) {
  const s = ROCKY_STYLES[planet.style];
  const p = planet.palette;
  const t = planet.terrain;
  const water = s?.water ?? p.water;
  return {
    g1: new THREE.Color(s?.g1 ?? p.ground1), g2: new THREE.Color(s?.g2 ?? p.ground2),
    rock: new THREE.Color(s?.rock ?? p.rock), water: new THREE.Color(water),
    deep: s?.deep != null ? new THREE.Color(s.deep) : new THREE.Color(water).multiplyScalar(0.5),
    hasWater: s ? Boolean(s.water) : t.hasWater,
    sea: s ? (s.sea ?? 0.42) : (t.hasWater ? t.spaceWater : 0.42),
    cap: s?.cap ?? null,
    craters: s?.craters ? makeCraters(planet.seed, s.craters) : null,
  };
}

function landColor(seed, cols, v, h, out) {
  const m = fbm3(seed + 7, v.x * 4 + 30, v.y * 4 + 30, v.z * 4 + 30, 3);
  out.copy(cols.g1).lerp(cols.g2, smoothstep(m, 0.35, 0.65));
  out.lerp(cols.rock, smoothstep(h, 0.6, 0.7));
}

function iceLine(planet, cols) {
  if (cols.cap != null) return cols.cap;
  if (planet.temperature >= 5) return null;
  return 0.82 - Math.min(0.35, Math.max(0, (5 - planet.temperature) / 200));
}

function applyIce(seed, cap, v, out) {
  const wobble = (fbm3(seed + 13, v.x * 5 + 9, v.y * 5 + 9, v.z * 5 + 9, 3) - 0.5) * 0.18;
  const y = Math.abs(v.y) / Math.max(1e-6, v.length());
  out.lerp(ICE, smoothstep(y + wobble, cap - 0.04, cap + 0.04));
}

// Darkens crater floors and brightens rims; returns the height change.
function applyCraters(craters, v, out) {
  let dh = 0;
  for (const c of craters) {
    const d = v.dot(c.v);
    if (d < c.cosOuter) continue;
    const t = Math.acos(Math.min(1, d)) / c.r;
    if (t < 1) {
      out.multiplyScalar(0.55 + 0.3 * t ** 4);
      dh -= 0.05 * (1 - t * t);
    } else {
      const rim = 1 - (t - 1) / 0.25;
      out.multiplyScalar(1 + 0.55 * rim);
      dh += 0.03 * rim;
    }
  }
  return dh;
}

export function surfaceColorer(planet, seedOffset = 0) {
  const cols = colorsOf(planet);
  const seed = planet.seed + seedOffset;
  const cap = iceLine(planet, cols);
  const unit = new THREE.Vector3();
  return (v, out) => {
    const h = fbm3(seed, v.x * 2.2 + 50, v.y * 2.2 + 50, v.z * 2.2 + 50, 5, 0.5);
    if (cols.hasWater && h < cols.sea) out.copy(cols.deep).lerp(cols.water, smoothstep(h, cols.sea - 0.12, cols.sea));
    else landColor(seed, cols, v, h, out);
    if (cap != null) applyIce(seed, cap, v, out);
    const dh = cols.craters ? applyCraters(cols.craters, unit.copy(v).normalize(), out) : 0;
    return h - cols.sea + dh;
  };
}

// Grey cratered moon look for small satellites, varied by seed.
export function moonColorer(seed) {
  return surfaceColorer({ seed, style: 'moon', temperature: 0, palette: {}, terrain: {} });
}
