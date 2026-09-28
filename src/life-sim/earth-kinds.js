// More of Earth's model-drawn animals (the rigged GLBs re-tinted and re-scaled into other
// species) and where they live: antelope on the plains, moose in the pines, giraffes and ostriches
// on the savanna, crocodiles on the beaches, extra dinosaurs, whales and birds. Also the tame
// riding deer that villagers use, and a komodo lurking near each village.
import { actors } from './actors.js';

// Same fields as EarthFauna's SPECS (height m; far: draw distance; radius: hit sphere / height).
export const EXTRA_SPECS = {
  kijang: { model: 'deer', name: 'Kijang', height: [1.2, 1.5], speed: 1.8, flee: 12, hp: 40, radius: 0.45, far: 320, tint: 0xb07a40 },
  moose: { model: 'deer', name: 'Rusa Besar', height: [2.6, 3.0], speed: 1.4, flee: 9, hp: 120, radius: 0.45, far: 420, tint: 0x4a3422 },
  antelope: { model: 'deer', name: 'Antelop', height: [1.6, 1.9], speed: 2, flee: 14, hp: 50, radius: 0.45, far: 360, tint: 0xd8b080 },
  spotted: { model: 'deer', name: 'Rusa Tutul', height: [1.6, 2.0], speed: 1.6, flee: 11, hp: 55, radius: 0.45, far: 360, tint: 0xc07a3a },
  mount: { model: 'deer', name: 'Rusa Tunggang', height: [2.3, 2.5], speed: 2, hp: 90, radius: 0.45, far: 420, tint: 0x7a4a2a },
  giraffe: { model: 'longneck', name: 'Jerapah', height: [5, 5.8], speed: 1.6, flee: 6, hp: 160, radius: 0.3, far: 700, tint: 0xe0b050 },
  styraco: { model: 'triceratops', name: 'Styracosaurus', height: [4, 4.8], speed: 2, flee: 7, hp: 220, radius: 0.55, far: 700, tint: 0x8a5a3a },
  ostrich: { model: 'raptor', name: 'Burung Unta', height: [2.2, 2.6], speed: 2.4, flee: 15, hp: 45, radius: 0.5, far: 380, tint: 0x2a2a2a },
  dilopho: { model: 'raptor', name: 'Dilophosaurus', height: [2.8, 3.2], speed: 3, chase: 11, sight: 34, bite: 12, hp: 90, radius: 0.5, far: 500, tint: 0x6a8a4a },
  allo: { model: 'trex', name: 'Allosaurus', height: [7, 8], speed: 3, chase: 10, sight: 50, bite: 22, hp: 260, radius: 0.45, far: 900, tint: 0x8a5a3a },
  komodo: { model: 'lizard', name: 'Komodo', height: [0.8, 1.0], speed: 1.1, chase: 5, sight: 16, bite: 8, hp: 70, radius: 1.1, far: 260, tint: 0x5a5a4a },
  croc: { model: 'lizard', name: 'Buaya', height: [0.8, 1.0], speed: 0.9, chase: 6, sight: 14, bite: 14, hp: 110, radius: 1.1, far: 260, tint: 0x3a4a2a },
  iguana: { model: 'lizard', name: 'Iguana', height: [0.45, 0.55], speed: 0.8, flee: 5, hp: 20, radius: 1.1, far: 160, tint: 0x5a9a4a },
  vulture: { model: 'bird', name: 'Burung Nasar', height: [1.3, 1.6], speed: 10, hp: 30, radius: 0.7, far: 500, tint: 0x3a3030 },
  stork: { model: 'bird', name: 'Bangau', height: [1.2, 1.5], speed: 9, hp: 25, radius: 0.7, far: 450, tint: 0xf0f0f0 },
  crow: { model: 'bird', name: 'Gagak', height: [0.7, 0.9], speed: 11, hp: 15, radius: 0.7, far: 300, tint: 0x1a1a1a },
  hawk: { model: 'bird', name: 'Rajawali', height: [1.2, 1.5], speed: 14, hp: 30, radius: 0.7, far: 500, tint: 0x8a5a2a },
  bluewhale: { model: 'whale', name: 'Paus Biru', height: [1, 1], speed: 2.6, hp: 600, radius: 0.18, far: 1100, tint: 0x4a6a8a, length: [20, 24] },
  orca: { model: 'whale', name: 'Orca', height: [1, 1], speed: 4, hp: 250, radius: 0.18, far: 700, tint: 0x1a1a1a, length: [7, 8] },
  dolphin: { model: 'whale', name: 'Lumba-lumba', height: [1, 1], speed: 5, hp: 60, radius: 0.18, far: 400, tint: 0x8a9aaa, length: [2.5, 3.2] },
};

// Adds the extra herds, hunters, flocks and sea animals to an EarthFauna group `f`.
export function populateExtra(f) {
  const herd = (kind, biomes, r0, r1, n, range) => f.addHerd(kind, biomes, r0, r1, n, range);
  herd('kijang', ['grass', 'forest'], 60, 220, 5, 50);
  herd('spotted', ['forest'], 120, 500, 5, 60);
  herd('antelope', ['grass', 'desert'], 300, 1200, 6, 80);
  herd('moose', ['pine', 'forest'], 300, 1500, 3, 70);
  herd('giraffe', ['grass'], 400, 1400, 4, 90);
  herd('ostrich', ['grass', 'desert'], 400, 1600, 4, 90);
  herd('iguana', ['beach', 'desert'], 100, 900, 3, 30);
  const plains = f.region(['grass'], 900, 1800);
  if (plains) {
    f.addHerd('styraco', null, 0, 0, 3, 120, plains);
    for (let i = 0; i < 2; i++) f.addHunter('dilopho', plains, 140, true);
    f.addHunter('allo', plains, 220, true);
  }
  const beach = f.region(['beach'], 150, 1400);
  if (beach) for (let i = 0; i < 2; i++) f.addHunter('croc', beach, 40, true);
  f.addFlock(3, 'vulture');
  f.addFlock(4, 'stork');
  f.addFlock(5, 'crow');
  f.addFlock(2, 'hawk');
  const sea = f.region(['water'], 200, 1400);
  if (sea) for (const k of ['bluewhale', 'orca', 'orca', 'dolphin', 'dolphin', 'dolphin']) f.addWhale(sea, k);
  villageHunters(f);
}

// A komodo (or crocodile by the sea) prowls just outside each village.
function villageHunters(f) {
  for (const s of actors.sites) {
    const a = Math.atan2(s.z - f.origin.z, s.x - f.origin.x) + f.rng.range(-1, 1), d = s.r + 30;
    const home = f.origin.clone().set(s.x + Math.cos(a) * d, 0, s.z + Math.sin(a) * d);
    if (f.land(home.x, home.z)) f.addHunter(f.rng.chance(0.7) ? 'komodo' : 'croc', home, 45, true);
  }
}
