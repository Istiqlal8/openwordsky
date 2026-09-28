// Surface height + ground color for a planet. Pure functions of world x/z.
import { fbm2, ridge2 } from '../core/noise.js';
import * as EXTRA from './terrain-shapes.js';
import { earthHeight } from '../earth/earth-terrain.js';

const SHAPERS = {
  flat: (n) => n,
  dunes: (n, r) => n * 0.6 + Math.abs(Math.sin(r * 6.0)) * 0.4,
  hills: (n) => n,
  mountains: (n, r) => Math.pow(n, 1.6) * 0.5 + r * 0.6,
  ridges: (n, r) => r,
  plateau: (n) => Math.round(n * 4) / 4 * 0.7 + n * 0.3,
};

export function heightFn(planet) {
  if (planet.style === 'earth') return earthHeight; // hand-built continents, see src/earth/
  const { style, amp, freq, gain } = planet.terrain;
  const seed = planet.seed;
  const shape = SHAPERS[style] ?? SHAPERS.hills;
  const needsRidge = style === 'mountains' || style === 'ridges' || style === 'dunes';
  const extra = EXTRA[style];
  if (extra) return (x, z) => (extra(seed, x, z, freq, gain) - 0.45) * amp * 2;
  return (x, z) => {
    const n = fbm2(seed, x * freq, z * freq, 5, gain);
    const r = needsRidge ? ridge2(seed + 7, x * freq * 0.8, z * freq * 0.8, 4, gain) : 0;
    return (shape(n, r) - 0.45) * amp * 2;
  };
}

export { groundColor } from './terrain-color.js';
