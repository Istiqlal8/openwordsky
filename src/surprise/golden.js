// Easter egg: a very rare golden planet (~0.5% of rocky planets).
import { hash32 } from '../core/rng.js';

const CHANCE = 0.005;

export function isGolden(planet) {
  return !planet.gas && hash32(planet.seed, 0x601d) / 4294967296 < CHANCE;
}

// Palette to apply at generation time: gold ground, white sky, pearly water.
export function goldenTouch(planet) {
  return { ...planet.palette,
    ground1: 0xe8b83a, ground2: 0xb8861e, rock: 0xf4d27a, water: 0xfff4d6,
    sky: 0xfdfbf4, fog: 0xfff6dc, flora: 0xffe07a, floraAlt: 0xffc83a, sun: 0xffffff };
}

export function goldenToast(planet) {
  return `Planet Emas! ${planet.name} berkilau seperti mimpi Sang Arsitek`;
}
