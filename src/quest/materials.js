// Gatherable materials: what each plant shape, animal body and ground pickup yields.

// Flora shape -> extra material dropped when harvesting that plant.
const FLORA = {
  tree: 'Kayu Asing', mushroom: 'Spora', crystal: 'Serpih Kristal', spike: 'Duri Tajam',
  coral: 'Karang Hidup', bulb: 'Gas Umbi', tentacle: 'Lendir Tentakel', flower: 'Nektar',
  cactus: 'Getah Kaktus', orb: 'Inti Apung', eyestalk: 'Lensa Organik', lantern: 'Cahaya Cair',
  spiral: 'Serat Spiral', jelly: 'Gel Hayati', fan: 'Daun Kipas', pod: 'Biji Polong',
  arch: 'Sulur Lentur', bone: 'Tulang Tanaman', balloon: 'Kulit Balon',
};
const FLORA_FALLBACK = 'Serat Tumbuhan';

// Animal body -> product gathered peacefully (Q) and trophy from hunting.
const FAUNA_GATHER = {
  bulat: 'Bulu Lembut', lonjong: 'Susu Fauna', pipih: 'Sisik', segmen: 'Kitin',
  'bola-ganda': 'Telur Fauna', ular: 'Kulit Ular', kubus: 'Serpih Kubus', tong: 'Susu Fauna',
};
const FAUNA_TROPHY = { flying: 'Bulu Sayap', big: 'Tulang Besar', small: 'Kulit Fauna' };

// Ground pickups per biome (walk over them). First entry is the common one.
export const PICKUPS = {
  lush: ['Herba Liar', 'Buah Hutan', 'Telur Fauna'],
  desert: ['Batu Gurun', 'Buah Kaktus', 'Fosil'],
  frozen: ['Es Murni', 'Geode Beku', 'Fosil'],
  toxic: ['Jamur Liar', 'Kantong Racun', 'Telur Fauna'],
  irradiated: ['Akar Bercahaya', 'Serpih Isotop', 'Geode'],
  volcanic: ['Batu Apung', 'Kaca Vulkanik', 'Geode'],
  barren: ['Pecahan Meteor', 'Geode', 'Fosil'],
  ocean: ['Kerang', 'Mutiara', 'Rumput Laut'],
  exotic: ['Kristal Anomali', 'Biji Aneh', 'Fosil'],
  earth: ['Herba Liar', 'Buah Hutan', 'Batu Sungai'],
};

export function floraMaterial(species) {
  return FLORA[species?.genes?.shape] ?? FLORA_FALLBACK;
}

// Named model animals (Earth, dinosaurs) have no genes: a few known products, eggs otherwise.
const MODEL_GATHER = { Rusa: 'Susu Fauna', Elang: 'Bulu Sayap', Biawak: 'Telur Fauna' };

export function gatherProduct(species, name = null) {
  if (species?.genes) return FAUNA_GATHER[species.genes.body] ?? 'Bulu Lembut';
  return MODEL_GATHER[name] ?? 'Telur Fauna';
}

export function huntTrophy(species) {
  const g = species?.genes;
  if (!g) return FAUNA_TROPHY.small;
  if (g.move === 'terbang') return FAUNA_TROPHY.flying;
  return g.size > 1.6 ? FAUNA_TROPHY.big : FAUNA_TROPHY.small;
}

export function pickupsOf(planet) {
  if (planet.style === 'earth') return PICKUPS.earth;
  return PICKUPS[planet.biome.id] ?? PICKUPS.barren;
}

// Every material quests may ask for, grouped for the contract generator.
export const FLORA_MATERIALS = [...new Set([...Object.values(FLORA), FLORA_FALLBACK])];
export const FAUNA_MATERIALS = [...new Set([...Object.values(FAUNA_GATHER), ...Object.values(FAUNA_TROPHY), 'Protein Fauna'])];

// Special items from rare animals, night/storm flora and planet events (src/gameplay, src/events).
export const EVENT_MATERIALS = ['Bulu Emas', 'Susu Bintang', 'Trofi Langka', 'Bunga Bulan', 'Kristal Badai',
  'Pecahan Meteor', 'Inti Bintang', 'Serbuk Mekar'];
