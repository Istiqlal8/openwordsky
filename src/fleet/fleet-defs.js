// Fleet expedition tables: frigate classes, expedition types, durations and prices.

export const MAX_FRIGATES = 5;
export const MAX_LEVEL = 10;
export const DURATIONS = [5, 15, 30, 60]; // real minutes

// Each class is better at one expedition type (success + reward bonus).
export const CLASSES = {
  tambang: { label: 'Industri', best: 'tambang' },
  dagang: { label: 'Dagang', best: 'dagang' },
  jelajah: { label: 'Penjelajah', best: 'eksplorasi' },
  tempur: { label: 'Tempur', best: 'tempur' },
  dukung: { label: 'Pendukung', best: null }, // no favourite, small bonus everywhere
};
export const CLASS_IDS = Object.keys(CLASSES);

// risk: base failure chance for a 5-minute trip. find: chance of a rare find on success.
export const TYPES = [
  { id: 'tambang', label: 'Tambang', risk: 0.1, find: 0.06, nanit: 40,
    items: [['Ferit', 30], ['Kobalt', 12], ['Emas', 5], ['Platinum', 2]] },
  { id: 'dagang', label: 'Dagang', risk: 0.15, find: 0.06, nanit: 160, items: [['Karbon', 10], ['Natrium', 6]] },
  { id: 'eksplorasi', label: 'Eksplorasi', risk: 0.2, find: 0.4, nanit: 70, items: [['Oksigen', 10], ['Silika', 8]] },
  { id: 'tempur', label: 'Tempur', risk: 0.32, find: 0.12, nanit: 240, items: [['Ferit', 10]] },
];
export const TYPE_BY_ID = Object.fromEntries(TYPES.map((t) => [t.id, t]));

export const RARE_FINDS = ['Artefak Kuno', 'Kristal Alien'];

const HEADS = ['Fajar', 'Bayu', 'Garuda', 'Merak', 'Cakra', 'Rajawali', 'Bintang', 'Samudra', 'Kencana', 'Lintang'];

export function frigateName(rng, word) {
  return `${rng.pick(HEADS)} ${word(rng)}`;
}

// Buying frigate n (n = how many you already own): grows with fleet size.
export function buyCost(owned) {
  return { nanit: 500 * owned, items: [['Ferit', 40 * owned], ['Kobalt', 15 * owned]] };
}

export function repairCost(f) {
  return { nanit: 60 + 30 * f.level, items: [['Ferit', 15 + 5 * f.level]] };
}

export function xpToNext(level) { return 60 * level; }

// Reward multiplier for a trip length: longer trips pay more per trip, a bit less per minute.
export function durationScale(minutes) { return Math.pow(minutes / 5, 0.85); }

// Success chance for frigate f on type t for `minutes`.
export function successChance(f, t, minutes) {
  const cls = CLASSES[f.cls] ?? CLASSES.dukung;
  const bonus = cls.best === t.id ? 0.15 : cls.best === null ? 0.05 : 0;
  const risk = t.risk * (1 + 0.25 * DURATIONS.indexOf(minutes));
  return Math.max(0.3, Math.min(0.97, 1 - risk + 0.035 * (f.level - 1) + bonus));
}
