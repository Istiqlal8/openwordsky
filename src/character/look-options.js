// Option tables for the character creator: every choice list and the palettes the randomizer uses.
// Values are stable ids (stored in the save); labels are the Indonesian UI strings.
import { RACES } from '../aliens/race-data.js';

export const SPECIES = [['manusia', 'Manusia'], ...RACES.map((r) => [r.id, r.name])];

export const EYES = [['bulat', 'Bulat'], ['sipit', 'Sipit'], ['lebar', 'Lebar'], ['tajam', 'Tajam']];
export const BROWS = [['tipis', 'Tipis'], ['sedang', 'Sedang'], ['tebal', 'Tebal']];
export const NOSES = [['kecil', 'Kecil'], ['sedang', 'Sedang'], ['besar', 'Besar'], ['bengkok', 'Bengkok']];
export const MOUTHS = [['senyum', 'Senyum'], ['datar', 'Datar'], ['tegas', 'Tegas']];
export const BEARDS = [['tanpa', 'Tanpa'], ['kumis', 'Kumis'], ['jambang', 'Jambang'], ['penuh', 'Penuh']];
export const HAIRS = [['botak', 'Botak'], ['pendek', 'Pendek'], ['jambul', 'Jambul'],
  ['kuncir', 'Kuncir'], ['panjang', 'Panjang'], ['keriting', 'Keriting']];
export const HATS = [['tanpa', 'Tanpa'], ['topi', 'Topi'], ['peci', 'Peci'], ['hijab', 'Hijab'], ['hood', 'Hoodie']];
export const HELMETS = [['bulat', 'Bulat'], ['kubah', 'Kubah'], ['tertutup', 'Tertutup']];
export const DECALS = [['tanpa', 'Tanpa'], ['garis', 'Garis'], ['bintang', 'Bintang'], ['bendera', 'Bendera']];
export const SHIRTS = [['kaos', 'Kaos'], ['kemeja', 'Kemeja'], ['jaket', 'Jaket'], ['rompi', 'Rompi']];
export const TROUSERS = [['panjang', 'Panjang'], ['pendek', 'Pendek'], ['kargo', 'Kargo']];
export const SHOES = [['sepatu', 'Sepatu'], ['bot', 'Bot'], ['sandal', 'Sandal']];

export const SKINS = ['#f3d3b6', '#e8bb92', '#c98d62', '#a86a43', '#7c4a2b', '#53301c'];
export const HAIR_COLORS = ['#141010', '#2a1a12', '#5a3a20', '#9a6b32', '#c9a227', '#b03030', '#6c6f7a', '#e8e2d4'];
export const EYE_COLORS = ['#3a2415', '#5a3a1a', '#2f5a7a', '#3a6b4a', '#6b6b6b', '#101010'];
export const SUIT_COLORS = ['#e9e4d8', '#d8dee6', '#c8ccd2', '#9fa6b2', '#3f4754', '#e0b24a'];
export const VISORS = ['#1a2a44', '#2a1a44', '#143a32', '#442a1a', '#101418'];
export const TRIMS = ['#ffa040', '#ff6a3a', '#6adcff', '#8cff6a', '#ff6ad0', '#ffd83a'];
export const CLOTH_COLORS = ['#3f6fa8', '#2f7a5a', '#8a3a3a', '#d8a23a', '#5a4a8a', '#2a2f38', '#c9c3b4', '#e08a3a'];
export const SHOE_COLORS = ['#2a2f38', '#4a3320', '#6c6f7a', '#8a3a3a', '#e8e2d4'];
export const NAMES = ['Adi', 'Bima', 'Citra', 'Dewi', 'Eka', 'Farel', 'Gita', 'Hana', 'Indra', 'Joko',
  'Kirana', 'Laras', 'Mika', 'Nadia', 'Oka', 'Putra', 'Rangga', 'Sari', 'Tari', 'Yudha'];

// Body height range in metres; 1.8 is the reference figure the model is built at.
export const HEIGHT = [1.5, 2.05];
export const BASE_HEIGHT = 1.8;

export const ids = (list) => list.map(([id]) => id);
