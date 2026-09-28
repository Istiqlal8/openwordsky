// Ocean look and depth zones: planet-tinted colors for reef, fish and glowing deep life,
// the underwater fog/light curve, and a depth scale that maps each planet's (often shallow)
// seas onto the reef / open water / abyss zones.
import * as THREE from 'three';
import { Rng } from '../core/rng.js';
import { hsl } from '../core/color.js';
import { word } from '../gen/names.js';

export const REEF_DEPTH = 15;   // zone borders in "virtual" metres (see DepthScale)
export const ABYSS_DEPTH = 60;

const EARTH = {
  coral: [0xff6f61, 0xffa24c, 0xc94fd6, 0xffd24a, 0x4fc3a1, 0xf06292, 0xff8fb0],
  fish: [0xffa31a, 0x2c7be5, 0xf5d90a, 0x9fb4c4, 0x39c0e0, 0xe0503a],
  kelp: 0x6b7f22, grass: 0x3f8a3a, anemone: 0xff9ad0, star: 0xff7a3a, crab: 0xd2452c,
  shark: 0x70808f, turtle: 0x6b8a4a, ray: 0x8a7a64, dolphin: 0x8a9aa8, manta: 0x2c3440,
  squid: 0xb04030, angler: 0x2a2c30, glow: [0x3cf0ff, 0x8a6cff, 0x29ffb0, 0xff5ad8],
};

// Colors for this planet's sea life: natural on Earth, a seeded alien palette elsewhere.
export function oceanPalette(planet) {
  if (planet.style === 'earth') return { ...EARTH, earth: true, water: null };
  const r = new Rng((planet.seed ^ 0x0cea4) >>> 0), h = r.next();
  const ring = (n, s, l, step) => Array.from({ length: n }, (_, i) => hsl(h + i * step + r.range(-0.03, 0.03), s, l));
  return {
    earth: false, water: planet.palette?.water ?? null,
    coral: ring(7, 0.85, 0.58, 0.137), fish: ring(6, 0.75, 0.55, 0.19),
    kelp: hsl(h + 0.42, 0.6, 0.36), grass: hsl(h + 0.35, 0.55, 0.38), anemone: hsl(h + 0.8, 0.8, 0.65),
    star: hsl(h + 0.6, 0.85, 0.55), crab: hsl(h + 0.05, 0.7, 0.5),
    shark: hsl(h + 0.55, 0.25, 0.42), turtle: hsl(h + 0.3, 0.5, 0.4), ray: hsl(h + 0.15, 0.35, 0.45),
    dolphin: hsl(h + 0.6, 0.3, 0.55), manta: hsl(h + 0.7, 0.4, 0.22), squid: hsl(h + 0.95, 0.7, 0.42),
    angler: hsl(h + 0.5, 0.2, 0.18), glow: ring(4, 1, 0.6, 0.23).map((c, i) => (i ? c : hsl(h + 0.5, 1, 0.62))),
  };
}

// Indonesian species names; alien seas get a seeded word in front ("Hiu Zorvak").
export function speciesNames(planet) {
  const base = { reef: 'Ikan Karang', clown: 'Ikan Badut', sardine: 'Sarden', tuna: 'Tuna', lantern: 'Ikan Lentera',
    shark: 'Hiu', turtle: 'Penyu', ray: 'Pari', manta: 'Pari Manta', dolphin: 'Lumba-lumba', whale: 'Paus',
    angler: 'Ikan Pemancing', squid: 'Cumi Raksasa', jelly: 'Ubur-ubur', crab: 'Kepiting' };
  if (planet.style === 'earth') return base;
  const r = new Rng((planet.seed ^ 0x5ea5) >>> 0), out = {};
  for (const [k, v] of Object.entries(base)) out[k] = `${v} ${word(r)}`;
  return out;
}

// [virtual depth, fog color, fog density, light factor]
const LOOK = [[0, 0x2a8fb0, 0.028, 1], [REEF_DEPTH, 0x155f86, 0.034, 0.6],
  [ABYSS_DEPTH, 0x061f3a, 0.05, 0.14], [110, 0x010307, 0.06, 0.03]].map(([d, c, f, l]) => [d, new THREE.Color(c), f, l]);
const _look = { fogColor: new THREE.Color(), fogDensity: 0, lightFactor: 1 };
const _tint = new THREE.Color();

// Underwater fog and light for a (virtual) depth: darker and bluer with depth, near black in
// the abyss. tint (hex, optional) pulls the color toward an alien sea. Returns a shared object.
export function underwaterLook(depth, tint = null) {
  const d = Math.max(0, depth);
  let i = 0;
  while (i < LOOK.length - 2 && d > LOOK[i + 1][0]) i++;
  const a = LOOK[i], b = LOOK[i + 1], t = Math.min(1, (d - a[0]) / (b[0] - a[0]));
  _look.fogColor.copy(a[1]).lerp(b[1], t);
  if (tint !== null) {
    const l = _look.fogColor.getHSL({}).l;
    _look.fogColor.lerp(_tint.set(tint).multiplyScalar(l * 2.2), 0.4);
  }
  _look.fogDensity = a[2] + (b[2] - a[2]) * t;
  _look.lightFactor = a[3] + (b[3] - a[3]) * t;
  return _look;
}

// Maps real water depth to virtual zone depth so every sea gets a reef, open water and an
// abyss: the deepest water found around the landing site becomes the abyss.
export class DepthScale {
  constructor(h, waterY, origin, radius = 1500, step = 50) {
    let max = 0, at = { x: origin.x, z: origin.z };
    for (let x = -radius; x <= radius; x += step) {
      for (let z = -radius; z <= radius; z += step) {
        const d = waterY - h(origin.x + x, origin.z + z);
        if (d > max) { max = d; at = { x: origin.x + x, z: origin.z + z }; }
      }
    }
    this.max = max;
    this.deepest = at;
    this.mid = THREE.MathUtils.clamp(max * 0.3, 3, REEF_DEPTH);
    this.abyss = THREE.MathUtils.clamp(max * 0.68, this.mid + 2, ABYSS_DEPTH);
  }

  virtual(d) {
    if (d <= this.mid) return (Math.max(0, d) / this.mid) * REEF_DEPTH;
    if (d <= this.abyss) return REEF_DEPTH + ((d - this.mid) / (this.abyss - this.mid)) * (ABYSS_DEPTH - REEF_DEPTH);
    return ABYSS_DEPTH + (d - this.abyss) * (ABYSS_DEPTH / this.abyss);
  }

  // 'reef' | 'mid' | 'abyss' for a real water depth.
  zone(d) {
    if (d <= this.mid) return 'reef';
    return d <= this.abyss ? 'mid' : 'abyss';
  }
}
