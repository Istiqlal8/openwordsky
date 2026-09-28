// Paint colours for base pieces. Every piece is drawn with one of these colour sets; the
// player cycles them with C in build mode and the choice is saved per piece (data.tint).
import { mixHex, shiftHex } from '../core/color.js';

const STEEL = 0x8d97a4;
// name + the hull hue each tint mixes into the steel.
const TINTS = [
  ['Baja', null], ['Putih', 0xf0f4f8], ['Merah', 0xc9483a], ['Hijau', 0x4f9e5c],
  ['Biru', 0x3f7fc4], ['Pasir', 0xd8b26a], ['Ungu', 0x8a5fc4], ['Arang', 0x2f343b],
];

export const TINT_COUNT = TINTS.length;
export const tintName = (i) => TINTS[i % TINT_COUNT][0];

// Colour set handed to every piece's draw function.
export function colorsOf(tint = 0) {
  const hue = TINTS[tint % TINT_COUNT][1];
  const metal = hue === null ? STEEL : mixHex(STEEL, hue, 0.8);
  return {
    metal,
    dark: shiftHex(metal, 0, 0, -0.22),
    trim: shiftHex(metal, 0, 0, 0.2),
    accent: 0xffb347,
    wood: 0x9a6b43,
    soil: 0x5a3d26,
    glow: 0x9fefff,
    warm: 0xfff1b8,
    glass: 0x9fe8ff,
    cloth: hue === null ? 0xc9483a : hue,
  };
}
