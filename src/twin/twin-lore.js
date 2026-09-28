// The flight log recovered from the doppelganger wreck.
//
// The set is seeded from the player's own ship seed and the system it drifts in, so one save
// always reads the same voyage back — a voyage that pilot never flew. Nothing here explains
// itself: the fragments only have to sit next to each other badly.
import { rngOf } from '../core/rng.js';

const LORE_SALT = 0x7417;

// Ordinary. Whoever wrote this was not in trouble yet.
const OPENING = [
  'Bahan bakar cukup. Tidak ada yang perlu dicatat.',
  'Kutinggalkan sistem terakhir tanpa menoleh. Kebiasaan lama.',
  'Lampu kokpit kuperbaiki sendiri. Lebih mudah dari yang kukira.',
  'Perbekalan tersisa untuk sebelas hari. Aku tidak berencana selama itu.',
];

// Each one is wrong in a small way the writer does not comment on.
const DRIFT = [
  'Ada kapal lain dengan nomor lambung yang sama denganku. Aku tidak menyapanya.',
  'Suaraku di rekaman kemarin terdengar lebih tua.',
  'Sistem ini kucatat dua kali. Tulisan tangannya sama, tanggalnya tidak.',
  'Peta bilang aku belum pernah ke sini. Aku tahu jalan ke ruang mesin tanpa melihat.',
  'Kode kunci lama tidak lagi bekerja. Aku tidak ingat menggantinya.',
  'Di belakang panel ada tulisan: jangan kembali. Bentuk hurufnya seperti milikku.',
  'Radio menangkap panggilan darurat dengan suaraku, dikirim tiga jam dari sekarang.',
  'Kursi kedua sudah diatur untuk orang setinggi aku.',
  'Sejak lompatan keenam, bintang-bintang tidak cocok dengan katalog.',
  'Aku berhenti menghitung hari. Angkanya tidak pernah naik.',
  'Pemindai internal menandai satu bentuk kehidupan di dalam kapal. Aku hitung dua.',
  'Sarung tangan di dek bawah masih hangat. Ukurannya pas.',
];

// The last entry always stops mid-sentence. No punctuation, ever.
const CUT = [
  'Kalau ada yang membaca ini: jangan hidupkan mesin dek bawah. Aku sudah mencoba dan',
  'Aku akan tidur sebentar. Kalau aku bangun dan namanya masih',
  'Sekarang aku paham kenapa dia tidak menyapa. Dia sudah tahu bahwa aku',
  'Palka terbuka dari dalam. Aku belum sempat',
];

// -> [{ day, text }] — 5..7 entries, ordered, days climbing past any voyage the player has flown.
export function twinLog(shipSeed, systemIndex) {
  const rng = rngOf(shipSeed >>> 0, systemIndex | 0, LORE_SALT);
  const lines = [rng.pick(OPENING), ...rng.take(DRIFT, 3 + rng.int(3)), rng.pick(CUT)];
  const out = [];
  let day = 280 + rng.int(200);
  for (const text of lines) {
    day += 1 + rng.int(9);
    out.push({ day, text });
  }
  return out;
}
