// Procedural capital ship "Kapal Induk" (nose -Z, hangar opening on +X). Each star system
// seeds one of several hull archetypes with its own proportions, colours, details and name.
import * as THREE from 'three';
import { std, glow } from './kit.js';
import { Parts } from './freighter-parts.js';
import { boundOf } from './freighter-collide.js';
import { classic, hammerhead } from './freighter-hulls-long.js';
import { catamaran, ringShip } from './freighter-hulls-twin.js';
import { citadel, saucer } from './freighter-hulls-round.js';
import { whale, cruiser } from './freighter-hulls-war.js';

const ARCHETYPES = [classic, hammerhead, catamaran, ringShip, citadel, saucer, whale, cruiser];
const NAMES = ['Garuda', 'Nusantara', 'Rinjani', 'Bima', 'Arjuna', 'Srikandi', 'Gajah Mada', 'Majapahit',
  'Sriwijaya', 'Merapi', 'Krakatau', 'Cendrawasih', 'Komodo', 'Semeru', 'Mahakam', 'Jatayu', 'Hanoman',
  'Samudra', 'Bromo', 'Toba', 'Kartika', 'Anoa', 'Mandala', 'Wijaya'];
const TONES = {
  metal: [0x8a909c, 0xa39a8a, 0x6f7f8c, 0xb4b8be, 0x7d8a78, 0x6a6470, 0x9a8474],
  organic: [0x4f7f7a, 0x8a7a62, 0x5e5478, 0x6f8a5a, 0x3f5f78],
};
const ACCENTS = [0x2f7fd0, 0xd0662f, 0x3aa87a, 0xc9b23a, 0x8a5ad0, 0xc03a4a, 0x2fb8c0, 0xe0e0e0];
const WINDOWS = [0xffe0a8, 0xffe0a8, 0xa8e0ff, 0xfff4d8, 0xb8ffc8];
const ENGINES = [0x6ad0ff, 0x6ad0ff, 0xff9a4a, 0xb08aff, 0x7affc0];

// Seeded materials; `organic` gives the alien-grown whale softer, bioluminescent tones.
export function freighterMaterials(rng, organic = false) {
  const tone = new THREE.Color(rng.pick(TONES[organic ? 'organic' : 'metal']));
  const accent = rng.pick(ACCENTS), win = organic ? rng.pick([0x7affd8, 0xd8a0ff, 0xa0f0ff]) : rng.pick(WINDOWS);
  const engineHex = organic ? win : rng.pick(ENGINES), dark = tone.clone().multiplyScalar(0.28);
  const m = {
    hull: std({ color: tone, emissive: tone.clone().multiplyScalar(0.3), flatShading: !organic,
      metalness: organic ? 0.2 : 0.55, roughness: organic ? 0.45 : 0.55 }),
    plate: std({ color: tone.clone().multiplyScalar(0.7), emissive: tone.clone().multiplyScalar(0.12), flatShading: true }),
    dark: std({ color: dark, emissive: dark.clone().multiplyScalar(0.3), flatShading: true }),
    accent: std({ color: accent, emissive: accent, emissiveIntensity: 0.25, flatShading: true }),
    crate: std({ color: 0xffffff, roughness: 0.8, metalness: 0.2 }),
    window: glow(win, 1.8), engine: glow(engineHex, 3), bay: glow(0x7fe6ff, 2.4),
    warn: glow(0xffb040, 2.2), gate: glow(0x9ff0ff, 1.6), bio: glow(win, 2.4),
  };
  m.greeble = m.dark;
  m.engineHex = engineHex;
  return m;
}

// `pick` in [0, 1) chooses the archetype (hashed from the system seed so neighbours differ).
// Returns { group, bay, engineCores, lights, solids, holes, bound, spinners, top, name, engineHex }.
export function buildFreighterModel(rng, pick = rng.next()) {
  const arch = ARCHETYPES[Math.floor(pick * ARCHETYPES.length)];
  const mats = freighterMaterials(rng, arch.organic);
  const p = new Parts();
  const out = arch.build(p, rng, mats);
  const group = p.build(mats);
  group.name = 'freighter';
  for (const s of out.spinners ?? []) group.add(s.obj);
  return {
    group, mats, bay: out.bay, top: out.top, spinners: out.spinners ?? [],
    engineCores: p.cores, lights: p.lights, solids: p.solids, holes: p.holes, bound: boundOf(p.solids) + 8,
    name: `${arch.title} ${rng.pick(NAMES)}`, archetype: arch.id, engineHex: mats.engineHex,
  };
}
