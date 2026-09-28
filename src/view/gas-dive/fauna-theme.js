// Per-planet look and names for gas fauna: warm oranges on Jupiter, pale gold on Saturn,
// icy blues on Uranus / Neptune, procedural giants follow their own palette. All seeded.
import * as THREE from 'three';
import { Rng, hash32 } from '../../core/rng.js';

const TONES = {
  jupiter: { hue: 0.055, spread: 0.035, sat: 0.92, body: 0x6e3a20, belly: 0xd09060 },
  saturn: { hue: 0.125, spread: 0.025, sat: 0.62, body: 0x7a6844, belly: 0xeadcae },
  uranus: { hue: 0.49, spread: 0.035, sat: 0.7, body: 0x3a6c78, belly: 0xc4f1f2 },
  neptune: { hue: 0.6, spread: 0.05, sat: 0.85, body: 0x24388a, belly: 0x86a8ff },
  venus: { hue: 0.11, spread: 0.03, sat: 0.72, body: 0x5a4628, belly: 0xf2dfae },
};

const BASE = {
  whale: 'Paus Langit', glider: 'Pari Awan', floater: 'Ubur Dandelion', eel: 'Belut Badai', coral: 'Karang Awan',
  spark: 'Kunang Percik', titan: 'Titan Jurang', bloom: 'Mekar Tentakel', ghost: 'Hantu Tekanan',
};
const EPITHETS = ['Berpendar', 'Raksasa', 'Berbisik', 'Kembar', 'Berduri', 'Pucat', 'Menyala', 'Kuno', 'Sunyi',
  'Liar', 'Agung', 'Bergaris', 'Berkabut', 'Petir', 'Bermata Tiga', 'Merah Bara', 'Perak', 'Senja'];

function proceduralTone(pal) {
  const hsl = pal.glow.getHSL({});
  return { hue: hsl.h, spread: 0.06, sat: Math.max(0.6, hsl.s), body: pal.mean.clone().multiplyScalar(0.35).getHex(),
    belly: pal.glow.getHex() };
}

const KINDS = Object.keys(BASE);

// Species name: whales carry the planet name, most others a seeded epithet (unique per planet).
function nameOf(kind, planetName, seed, epithets) {
  if (kind === 'whale') return `${BASE.whale} ${planetName}`;
  const i = KINDS.indexOf(kind);
  return hash32(seed, 0x4a3e, i) % 4 === 0 ? BASE[kind] : `${BASE[kind]} ${epithets[i]}`;
}

export class FaunaTheme {
  constructor(pal) {
    this.seed = pal.seed;
    this.tone = TONES[pal.style] ?? proceduralTone(pal);
    this.planet = pal.name ?? 'Raksasa Gas';
    this.body = new THREE.Color(this.tone.body);
    this.belly = new THREE.Color(this.tone.belly);
    this.epithets = new Rng(hash32(this.seed, 0xe917)).take(EPITHETS, KINDS.length);
  }

  // Seeded rng for one species.
  rng(kind) { return new Rng(hash32(this.seed, 0xfa0a, kind.charCodeAt(0), kind.length)); }

  name(kind) { return nameOf(kind, this.planet, this.seed, this.epithets); }

  // Glow color shifted along the planet hue; light 0..1.
  glow(rng, shift = 0, light = 0.58) {
    const t = this.tone, h = t.hue + shift + rng.range(-t.spread, t.spread);
    return new THREE.Color().setHSL(((h % 1) + 1) % 1, t.sat, light);
  }

  // Skin: body tone nudged toward a glow color, times shade.
  skin(rng, glow, shade = 1) {
    return this.body.clone().lerp(glow, rng.range(0.05, 0.2)).multiplyScalar(shade);
  }
}
