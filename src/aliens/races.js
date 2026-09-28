// Alien races: outpost placement, race choice per planet and a tiny syllable language.
import { Rng, hash32, unitOf } from '../core/rng.js';
import { RACES, LORE } from './race-data.js';

export { RACES };

export const RACE_BY_ID = Object.fromEntries(RACES.map((r) => [r.id, r]));

// Things every race can say; the alien words for each meaning are fixed per race.
const GREETINGS = ['Salam, pengembara bintang', 'Langitmu cerah hari ini', 'Selamat datang di desa kami',
  'Kau berbau debu angkasa', 'Semoga bintangmu tak pernah padam', 'Kami tidak menggigit. Biasanya.',
  'Ceritakan dunia asalmu', 'Tukar barang? Tukar cerita?', 'Angin membawa tamu baru'];

const OUTPOST_SALT = 0xa11e;

// Outposts: ~35% of solid planets with air; never on Earth (the human home base).
export function hasOutpost(planet) {
  if (!planet || planet.gas || planet.style === 'earth' || !(planet.atmosphereDensity > 0)) return false;
  return unitOf(planet.seed, OUTPOST_SALT) < 0.35;
}

// Race for a planet: biome-favoured weighted pick, deterministic from the seed.
export function raceFor(planet) {
  const rng = new Rng(hash32(planet.seed, OUTPOST_SALT, 1));
  const items = RACES.map((r) => ({ r, w: r.biomes.includes(planet.biome?.id) ? 5 : 1 }));
  return rng.weighted(items).r;
}

const idHash = (id) => [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 0x811c9dc5);

function alienWord(race, rng) {
  const n = 1 + rng.int(3);
  let w = '';
  for (let i = 0; i < n; i++) w += (i && race.joiner === "'" && rng.chance(0.4) ? "'" : '') + rng.pick(race.syllables);
  return w;
}

// Alien sentence for a meaning index: the same meaning always sounds the same per race.
export function alienPhrase(race, meaning) {
  const rng = new Rng(hash32(idHash(race.id), meaning, 0x1a9));
  const sep = race.joiner === '.' ? '.' : race.joiner === '-' ? '-' : ' ';
  const words = [];
  for (let i = 0, n = 2 + rng.int(3); i < n; i++) words.push(alienWord(race, rng));
  const s = words.join(sep);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Greeting line: alien words + Indonesian translation in brackets.
export function greetLine(race, rng) {
  const i = rng.int(GREETINGS.length);
  return `${alienPhrase(race, i)}! [${GREETINGS[i]}]`;
}

// Fixed phrases (keys >= 100 so they never collide with greeting indices).
export function thanksLine(race) {
  return `${alienPhrase(race, 100)}! [Terima kasih, sahabat]`;
}

export function byeLine(race) {
  return `${alienPhrase(race, 101)}. [Barang kami sudah habis, kembalilah nanti]`;
}

export function loreLine(race, rng) {
  return rng.pick(LORE[race.id]);
}

// Individual name from the race syllables.
export function alienName(race, rng) {
  let w = rng.pick(race.syllables) + rng.pick(race.syllables);
  if (rng.chance(0.3)) w += rng.pick(race.syllables);
  w = w.charAt(0).toUpperCase() + w.slice(1);
  return race.id === 'mekanid' || race.id === 'nexar' ? `${w}-${2 + rng.int(98)}` : w;
}
