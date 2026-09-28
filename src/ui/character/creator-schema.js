// Editor layout for the character creator: one section per tab, one field per option.
// `when` limits a section or field to a species kind ('human' or 'alien'); default is both.
import * as O from '../../character/look-options.js';
import { HEIGHT } from '../../character/look-options.js';

const VARIANTS = Array.from({ length: 8 }, (_, i) => [i, `Varian ${i + 1}`]);

export const SECTIONS = [
  { id: 'spesies', label: 'Spesies', fields: [
    { type: 'choice', key: 'species', label: 'Spesies', options: O.SPECIES },
  ] },
  { id: 'tubuh', label: 'Tubuh', fields: [
    { type: 'range', key: 'body.height', label: 'Tinggi (m)', min: HEIGHT[0], max: HEIGHT[1], step: 0.01, when: 'human' },
    { type: 'range', key: 'body.build', label: 'Bentuk badan', min: 0, max: 1, step: 0.05, when: 'human' },
    { type: 'color', key: 'skin', label: 'Warna kulit', when: 'human' },
    { type: 'choice', key: 'alien.variant', label: 'Varian warna', options: VARIANTS, when: 'alien' },
    { type: 'range', key: 'alien.tall', label: 'Tinggi', min: 0, max: 1, step: 0.05, when: 'alien' },
    { type: 'toggle', key: 'alien.outfit', label: 'Pakai baju', when: 'alien' },
  ] },
  { id: 'wajah', label: 'Wajah', when: 'human', fields: [
    { type: 'choice', key: 'face.eyes', label: 'Bentuk mata', options: O.EYES },
    { type: 'color', key: 'face.eyeColor', label: 'Warna mata' },
    { type: 'choice', key: 'face.brow', label: 'Alis', options: O.BROWS },
    { type: 'choice', key: 'face.nose', label: 'Hidung', options: O.NOSES },
    { type: 'choice', key: 'face.mouth', label: 'Mulut', options: O.MOUTHS },
    { type: 'choice', key: 'face.beard', label: 'Kumis / jenggot', options: O.BEARDS },
  ] },
  { id: 'rambut', label: 'Rambut', when: 'human', fields: [
    { type: 'choice', key: 'hair.style', label: 'Model rambut', options: O.HAIRS },
    { type: 'color', key: 'hair.color', label: 'Warna rambut' },
  ] },
  { id: 'suit', label: 'Baju Astronot', mode: 'suit', fields: [
    { type: 'choice', key: 'suit.helmet', label: 'Helm', options: O.HELMETS, when: 'human' },
    { type: 'color', key: 'suit.visor', label: 'Kaca helm' },
    { type: 'color', key: 'suit.color', label: 'Warna baju' },
    { type: 'color', key: 'suit.trim', label: 'Garis warna' },
    { type: 'choice', key: 'suit.decal', label: 'Lambang', options: O.DECALS, when: 'human' },
    { type: 'toggle', key: 'suit.backpack', label: 'Tabung udara', when: 'human' },
  ] },
  { id: 'pakaian', label: 'Pakaian', mode: 'casual', fields: [
    { type: 'choice', key: 'casual.shirt', label: 'Atasan', options: O.SHIRTS, when: 'human' },
    { type: 'color', key: 'casual.shirtColor', label: 'Warna atasan' },
    { type: 'choice', key: 'casual.trousers', label: 'Bawahan', options: O.TROUSERS, when: 'human' },
    { type: 'color', key: 'casual.trousersColor', label: 'Warna bawahan', when: 'human' },
    { type: 'choice', key: 'casual.shoes', label: 'Sepatu', options: O.SHOES, when: 'human' },
    { type: 'color', key: 'casual.shoeColor', label: 'Warna sepatu', when: 'human' },
    { type: 'choice', key: 'casual.hat', label: 'Penutup kepala', options: O.HATS, when: 'human' },
  ] },
  { id: 'nama', label: 'Nama', fields: [
    { type: 'text', key: 'name', label: 'Nama karakter', max: 16 },
  ] },
];

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
}

// 'human' for our own species, 'alien' for one of the races.
export const kindOf = (species) => (species === 'manusia' ? 'human' : 'alien');

export const fits = (item, kind) => !item.when || item.when === kind;
