// Biome archetypes. Each planet jitters these so no two look alike.
export const BIOMES = [
  { id: 'lush', label: 'Subur', w: 16, temp: [8, 34], sky: 0x8fc7ff, fog: 0xbfe3ff,
    g1: 0x4f8b3b, g2: 0x2e5c2a, rock: 0x6f6a5c, water: 0x1f6f8f, flora: [0.55, 1], waterChance: 0.8,
    weather: ['Cerah', 'Hujan ringan', 'Berkabut', 'Badai petir'], hazard: null,
    resources: ['Karbon', 'Oksigen', 'Natrium', 'Faecium'] },
  { id: 'desert', label: 'Gurun', w: 12, temp: [30, 72], sky: 0xf3c98b, fog: 0xe8cfa2,
    g1: 0xc9a668, g2: 0x9c7a44, rock: 0x8a6f4a, water: 0x2f8fa0, flora: [0.03, 0.25], waterChance: 0.2,
    weather: ['Kering', 'Badai debu', 'Panas terik'], hazard: 'Panas',
    resources: ['Silika', 'Kaktium', 'Tembaga', 'Pirit'],
    floraPref: ['cactus', 'spike', 'bone', 'balloon'] },
  { id: 'frozen', label: 'Beku', w: 12, temp: [-85, -12], sky: 0xbcd8f0, fog: 0xdfeefb,
    g1: 0xe3edf5, g2: 0xa9c3d6, rock: 0x7d8a96, water: 0x9fd0e8, flora: [0.03, 0.3], waterChance: 0.5,
    weather: ['Badai salju', 'Angin beku', 'Hening'], hazard: 'Dingin ekstrem',
    resources: ['Es Air', 'Dioksit', 'Frost Crystal', 'Kobalt'],
    floraPref: ['crystal', 'spike', 'fan', 'spiral'] },
  { id: 'toxic', label: 'Toksik', w: 10, temp: [10, 45], sky: 0x9be07a, fog: 0xb6e79a,
    g1: 0x6d8f3a, g2: 0x47612a, rock: 0x5f6b46, water: 0x7fa83a, flora: [0.3, 0.9], waterChance: 0.6,
    weather: ['Hujan asam', 'Kabut spora', 'Lembap'], hazard: 'Toksisitas',
    resources: ['Ammonia', 'Fungal Mould', 'Belerang', 'Natrium'],
    floraPref: ['mushroom', 'tentacle', 'pod', 'eyestalk'] },
  { id: 'irradiated', label: 'Radioaktif', w: 8, temp: [15, 60], sky: 0xd7f06a, fog: 0xdcf08a,
    g1: 0x9aa83c, g2: 0x6c7a2a, rock: 0x6f6a4a, water: 0x9fb03a, flora: [0.1, 0.6], waterChance: 0.4,
    weather: ['Badai radiasi', 'Kabut kuning', 'Tenang'], hazard: 'Radiasi',
    resources: ['Uranium', 'Gamma Root', 'Kobalt', 'Tritium'],
    floraPref: ['bulb', 'orb', 'eyestalk', 'lantern'] },
  { id: 'volcanic', label: 'Vulkanik', w: 8, temp: [60, 140], sky: 0xff9a5a, fog: 0xc0603a,
    g1: 0x4a2a22, g2: 0x2a1a18, rock: 0x6a3a2a, water: 0xff5a1a, flora: [0, 0.12], waterChance: 0.9,
    weather: ['Hujan abu', 'Semburan lava', 'Asap tebal'], hazard: 'Panas ekstrem',
    resources: ['Belerang', 'Obsidian', 'Magnetized Ferrite', 'Solanium'],
    floraPref: ['spike', 'crystal', 'bone'] },
  { id: 'barren', label: 'Gersang', w: 12, temp: [-30, 40], sky: 0xcfcfd6, fog: 0xd6d6dd,
    g1: 0x8e8a80, g2: 0x5f5c56, rock: 0x7a7670, water: 0x4a5a6a, flora: [0, 0.08], waterChance: 0.1,
    weather: ['Hening', 'Angin kencang'], hazard: null,
    resources: ['Ferit', 'Silika', 'Kromatik', 'Pirit'] },
  { id: 'ocean', label: 'Samudra', w: 10, temp: [5, 32], sky: 0x7fc9ff, fog: 0xa8dcff,
    g1: 0x3f7f6a, g2: 0x2a5f5a, rock: 0x5f6f6a, water: 0x1f7fb0, flora: [0.3, 0.8], waterChance: 1,
    weather: ['Gerimis', 'Badai laut', 'Cerah'], hazard: null,
    resources: ['Garam', 'Karang Nautilon', 'Klorin', 'Oksigen'],
    floraPref: ['coral', 'tentacle', 'fan', 'jelly'] },
  { id: 'exotic', label: 'Eksotis', w: 7, temp: [-20, 50], sky: 0, fog: 0,
    g1: 0, g2: 0, rock: 0, water: 0, flora: [0.2, 0.9], waterChance: 0.5,
    weather: ['Anomali gravitasi', 'Pulsa cahaya', 'Tak terbaca'], hazard: 'Anomali',
    resources: ['Emas', 'Platinum', 'Indium', 'Kristal Anomali'],
    floraPref: ['eyestalk', 'jelly', 'spiral', 'lantern', 'balloon'] },
  { id: 'crystal', label: 'Kristal', w: 5, temp: [-45, 18], sky: 0xe9d8ff, fog: 0xf3e8ff,
    g1: 0xc4b0ea, g2: 0x86a8de, rock: 0x7a68b0, water: 0x7fe0f0, flora: [0.2, 0.7], waterChance: 0.4,
    weather: ['Hening', 'Pulsa cahaya', 'Angin kencang'], hazard: 'Dingin',
    resources: ['Kristal Anomali', 'Frost Crystal', 'Silika', 'Indium'],
    floraPref: ['crystal', 'spiral', 'fan', 'orb', 'jelly'] },
  { id: 'fungal', label: 'Jamur', w: 5, temp: [12, 38], sky: 0xb79ad9, fog: 0x9d82c4,
    g1: 0x6b4a8e, g2: 0x2f7a78, rock: 0x5a4a6e, water: 0x4a8a7c, flora: [0.6, 1], waterChance: 0.5,
    weather: ['Kabut spora', 'Lembap', 'Berkabut'], hazard: 'Spora',
    resources: ['Fungal Mould', 'Karbon', 'Ammonia', 'Spora Ungu'],
    floraPref: ['mushroom', 'eyestalk', 'pod', 'lantern', 'tentacle', 'balloon'] },
  { id: 'swamp', label: 'Rawa', w: 6, temp: [16, 40], sky: 0xa3ad8c, fog: 0x8f9a78,
    g1: 0x4d5d2c, g2: 0x39381f, rock: 0x4f4a38, water: 0x3d4a2a, flora: [0.5, 1], waterChance: 1,
    weather: ['Berkabut', 'Gerimis', 'Lembap', 'Badai petir'], hazard: 'Kelembapan',
    resources: ['Karbon', 'Ammonia', 'Metana Rawa', 'Natrium'],
    floraPref: ['tentacle', 'arch', 'lantern', 'pod', 'eyestalk', 'tree'] },
  { id: 'glass', label: 'Kaca', w: 4, temp: [40, 110], sky: 0x6b5a86, fog: 0x4f4468,
    g1: 0x2d2b3d, g2: 0x16151f, rock: 0x3a3450, water: 0x8a4ad0, flora: [0, 0.2], waterChance: 0.15,
    weather: ['Angin kencang', 'Badai debu', 'Hening'], hazard: 'Panas',
    resources: ['Obsidian', 'Silika', 'Kromatik', 'Platinum'],
    floraPref: ['crystal', 'spike', 'bone', 'spiral'] },
  { id: 'candy', label: 'Permen', w: 3, temp: [5, 35], sky: 0xffc9ea, fog: 0xffe1f2,
    g1: 0xf29ac8, g2: 0x9fe3d4, rock: 0xfff0c8, water: 0xff7ab8, flora: [0.4, 1], waterChance: 0.5,
    weather: ['Cerah', 'Hujan ringan', 'Pulsa cahaya'], hazard: null,
    resources: ['Gula Kristal', 'Sirup Kosmik', 'Karbon', 'Natrium'],
    floraPref: ['balloon', 'spiral', 'jelly', 'orb', 'flower', 'lantern'] },
];

export const COMMON_RESOURCES = ['Ferit', 'Karbon', 'Kobalt', 'Oksigen', 'Emas', 'Silika'];
export const FLORA_KINDS = ['tree', 'mushroom', 'crystal', 'spike', 'coral'];
export const FAUNA_KINDS = ['hopper', 'walker', 'floater'];
// waterBias: added to the biome's waterChance (islands need a sea).
// biomes: optional weight multipliers per biome id (see pickTerrainStyle).
export const TERRAIN_STYLES = [
  { style: 'flat', w: 2, amp: [4, 10], freq: [0.006, 0.012], biomes: { swamp: 4, ocean: 2 } },
  { style: 'dunes', w: 3, amp: [8, 18], freq: [0.01, 0.02], biomes: { desert: 3, glass: 4 } },
  { style: 'hills', w: 5, amp: [14, 32], freq: [0.006, 0.012] },
  { style: 'mountains', w: 3, amp: [40, 95], freq: [0.004, 0.008], biomes: { frozen: 2 } },
  { style: 'ridges', w: 3, amp: [28, 70], freq: [0.004, 0.009] },
  { style: 'plateau', w: 2, amp: [18, 40], freq: [0.005, 0.01] },
  { style: 'craters', w: 2, amp: [12, 26], freq: [0.004, 0.008], biomes: { barren: 3, irradiated: 2, frozen: 1.5 } },
  { style: 'canyons', w: 2, amp: [22, 45], freq: [0.003, 0.006], biomes: { desert: 2.5, volcanic: 2, glass: 1.5 } },
  { style: 'spires', w: 1.5, amp: [14, 30], freq: [0.004, 0.008], biomes: { crystal: 4, fungal: 2, exotic: 2 } },
  { style: 'terraces', w: 1.5, amp: [16, 36], freq: [0.004, 0.009], biomes: { candy: 3, lush: 1.5, toxic: 1.5 } },
  { style: 'archipelago', w: 1.5, amp: [12, 28], freq: [0.004, 0.008], waterBias: 0.6,
    biomes: { ocean: 5, swamp: 3, lush: 1.5 } },
];

// Biome-aware terrain pick; consumes exactly one rng.next() like rng.weighted.
export function pickTerrainStyle(rng, biomeId) {
  const items = TERRAIN_STYLES.map((t) => ({ t, w: t.w * (t.biomes?.[biomeId] ?? 1) }));
  return rng.weighted(items).t;
}

// Water chance for a biome + terrain style pair (archipelagos want a sea).
export function waterChanceOf(biome, style) {
  return Math.min(1, biome.waterChance + (style.waterBias ?? 0));
}
