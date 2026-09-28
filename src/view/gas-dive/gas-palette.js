// Colors for a gas-giant dive, derived from the same band styles the space view paints.
import * as THREE from 'three';
import { GAS_STYLES } from '../space-gas.js';
import { Rng, hash32 } from '../../core/rng.js';

const BAND_ROWS = 256;
export const BAND_PERIOD = 14000; // metres of world Z per full band cycle

// Procedural giants take their bands from the planet palette (mirrors space-gas.js).
function styleOf(planet) {
  const known = GAS_STYLES[planet.style];
  if (known) return known;
  const p = planet.palette;
  const rng = new Rng(hash32(planet.seed, 0x6a5));
  const spot = rng.chance(0.5) ? { color: p.rock } : null;
  return { bands: [p.ground1, p.sky, p.ground2, p.fog, p.rock], spot, glow: p.sky };
}

function meanColor(cols) {
  const m = new THREE.Color(0, 0, 0);
  for (const c of cols) m.add(c);
  return m.multiplyScalar(1 / cols.length);
}

// Blended stripes of band colors along world Z, as a 1 x BAND_ROWS linear texture.
function bandTexture(cols, seed) {
  const rng = new Rng(hash32(seed, 0xba4d));
  const stops = Array.from({ length: 9 }, () => ({ w: rng.range(0.5, 1.6), c: rng.pick(cols) }));
  const total = stops.reduce((a, s) => a + s.w, 0);
  const data = new Uint8Array(BAND_ROWS * 4);
  let row = 0;
  for (const s of stops) {
    const rows = Math.round((s.w / total) * BAND_ROWS);
    for (let i = 0; i < rows && row < BAND_ROWS; i++, row++) writeRow(data, row, s.c);
  }
  for (; row < BAND_ROWS; row++) writeRow(data, row, stops[stops.length - 1].c);
  const tex = new THREE.DataTexture(data, 1, BAND_ROWS, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function writeRow(data, row, c) {
  const i = row * 4;
  data[i] = Math.min(255, c.r * 255);
  data[i + 1] = Math.min(255, c.g * 255);
  data[i + 2] = Math.min(255, c.b * 255);
  data[i + 3] = 255;
}

// Everything the dive needs to tint its scene. Colors are linear THREE.Color.
export function gasPalette(planet) {
  const style = styleOf(planet);
  const bands = style.bands.map((h) => new THREE.Color(h));
  const mean = meanColor(bands);
  const spot = new THREE.Color(style.spot?.color ?? style.bands[style.bands.length - 1]);
  const glow = new THREE.Color(style.glow ?? planet.palette.sky);
  return {
    bands, mean, spot, glow,
    bandTex: bandTexture(bands, planet.seed),
    haze: mean.clone().lerp(glow, 0.35).multiplyScalar(0.95),
    deep: mean.clone().multiplyScalar(0.07).lerp(new THREE.Color(0x05030a), 0.35),
    zenith: new THREE.Color(0x0a1230).lerp(glow, 0.12),
    hasSpot: Boolean(style.spot) || planet.style === 'jupiter',
    rings: Boolean(planet.rings),
    ringColor: planet.style === 'saturn' ? 0xd9c79a : planet.palette.rock,
    moons: Math.min(5, planet.moons ?? 0),
    seed: planet.seed >>> 0,
    style: planet.style ?? null,
    name: planet.name ?? null,
  };
}
