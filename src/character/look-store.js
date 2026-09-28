// Pure save helpers for the player's look. The caller persists with writeSave(save) from state.js.
// save.look holds one normalized look object; `created` marks that the player went through the creator.
import { Rng, hash32 } from '../core/rng.js';
import { RACE_BY_ID } from '../aliens/races.js';
import * as O from './look-options.js';

const num = (v, a, b, fb) => (Number.isFinite(+v) ? Math.min(b, Math.max(a, +v)) : fb);
const opt = (list, v, fb) => (list.some(([id]) => id === v) ? v : fb);
const col = (v, fb) => (/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v).toLowerCase() : fb);
const str = (v, fb) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 16) : fb);

export function defaultLook() {
  return {
    name: 'Penjelajah', species: 'manusia', created: false,
    body: { height: 1.78, build: 0.5 }, skin: '#c98d62',
    face: { eyes: 'bulat', eyeColor: '#3a2415', brow: 'sedang', nose: 'sedang', mouth: 'datar', beard: 'tanpa' },
    hair: { style: 'pendek', color: '#2a1a12' },
    suit: { helmet: 'bulat', visor: '#1a2a44', backpack: true, color: '#e9e4d8', trim: '#ffa040', decal: 'garis' },
    casual: { shirt: 'kaos', shirtColor: '#3f6fa8', trousers: 'panjang', trousersColor: '#2a2f38',
      shoes: 'sepatu', shoeColor: '#2a2f38', hat: 'tanpa' },
    alien: { variant: 0, tall: 0.5, outfit: true },
  };
}

function normFace(raw, d) {
  return {
    eyes: opt(O.EYES, raw?.eyes, d.eyes), eyeColor: col(raw?.eyeColor, d.eyeColor),
    brow: opt(O.BROWS, raw?.brow, d.brow), nose: opt(O.NOSES, raw?.nose, d.nose),
    mouth: opt(O.MOUTHS, raw?.mouth, d.mouth), beard: opt(O.BEARDS, raw?.beard, d.beard),
  };
}

function normSuit(raw, d) {
  return {
    helmet: opt(O.HELMETS, raw?.helmet, d.helmet), visor: col(raw?.visor, d.visor),
    backpack: raw?.backpack === undefined ? d.backpack : Boolean(raw.backpack),
    color: col(raw?.color, d.color), trim: col(raw?.trim, d.trim), decal: opt(O.DECALS, raw?.decal, d.decal),
  };
}

function normCasual(raw, d) {
  return {
    shirt: opt(O.SHIRTS, raw?.shirt, d.shirt), shirtColor: col(raw?.shirtColor, d.shirtColor),
    trousers: opt(O.TROUSERS, raw?.trousers, d.trousers), trousersColor: col(raw?.trousersColor, d.trousersColor),
    shoes: opt(O.SHOES, raw?.shoes, d.shoes), shoeColor: col(raw?.shoeColor, d.shoeColor),
    hat: opt(O.HATS, raw?.hat, d.hat),
  };
}

// Always returns a complete look; anything missing or out of range falls back to the default.
export function normalizeLook(raw) {
  const d = defaultLook();
  const species = opt(O.SPECIES, raw?.species, d.species);
  return {
    name: str(raw?.name, d.name), species, created: Boolean(raw?.created),
    body: { height: num(raw?.body?.height, O.HEIGHT[0], O.HEIGHT[1], d.body.height), build: num(raw?.body?.build, 0, 1, d.body.build) },
    skin: col(raw?.skin, d.skin),
    face: normFace(raw?.face, d.face),
    hair: { style: opt(O.HAIRS, raw?.hair?.style, d.hair.style), color: col(raw?.hair?.color, d.hair.color) },
    suit: normSuit(raw?.suit, d.suit),
    casual: normCasual(raw?.casual, d.casual),
    alien: { variant: Math.round(num(raw?.alien?.variant, 0, 7, 0)), tall: num(raw?.alien?.tall, 0, 1, 0.5),
      outfit: raw?.alien?.outfit === undefined ? true : Boolean(raw.alien.outfit) },
  };
}

export function loadLook(save) {
  return normalizeLook(save?.look);
}

// Stores the look and marks the character as created. Returns the stored look.
export function saveLook(save, look) {
  const clean = normalizeLook(look);
  clean.created = true;
  if (save) save.look = clean;
  return clean;
}

export function playerName(save) {
  return loadLook(save).name;
}

// True until the player has saved a character once: the lead opens the creator from the title screen.
export function needsCreator(save) {
  return !save?.look?.created;
}

function randomHuman(look, rng) {
  look.skin = rng.pick(O.SKINS);
  look.body = { height: Number(rng.range(1.58, 1.95).toFixed(2)), build: Number(rng.range(0.2, 0.8).toFixed(2)) };
  look.face = { eyes: rng.pick(O.ids(O.EYES)), eyeColor: rng.pick(O.EYE_COLORS), brow: rng.pick(O.ids(O.BROWS)),
    nose: rng.pick(O.ids(O.NOSES)), mouth: rng.pick(O.ids(O.MOUTHS)), beard: rng.pick(O.ids(O.BEARDS)) };
  look.hair = { style: rng.pick(O.ids(O.HAIRS)), color: rng.pick(O.HAIR_COLORS) };
}

// Deterministic random look: the same seed always builds the same character.
export function randomLook(seed = 1, species = null) {
  const rng = new Rng(hash32(seed | 0, 0x1eaf));
  const look = defaultLook();
  look.name = rng.pick(O.NAMES);
  look.species = species ?? rng.pick(O.ids(O.SPECIES));
  randomHuman(look, rng);
  look.suit = { helmet: rng.pick(O.ids(O.HELMETS)), visor: rng.pick(O.VISORS), backpack: rng.chance(0.8),
    color: rng.pick(O.SUIT_COLORS), trim: rng.pick(O.TRIMS), decal: rng.pick(O.ids(O.DECALS)) };
  look.casual = { shirt: rng.pick(O.ids(O.SHIRTS)), shirtColor: rng.pick(O.CLOTH_COLORS),
    trousers: rng.pick(O.ids(O.TROUSERS)), trousersColor: rng.pick(O.CLOTH_COLORS),
    shoes: rng.pick(O.ids(O.SHOES)), shoeColor: rng.pick(O.SHOE_COLORS), hat: rng.pick(O.ids(O.HATS)) };
  look.alien = { variant: rng.int(8), tall: Number(rng.next().toFixed(2)), outfit: rng.chance(0.75) };
  return normalizeLook(look);
}

// Height in metres for an alien look, inside its own race range.
export function alienHeight(look) {
  const race = RACE_BY_ID[look.species];
  if (!race) return look.body.height;
  return race.height[0] + (race.height[1] - race.height[0]) * look.alien.tall;
}
