// Lore fragments of the vanished ancients, and the rewards a ruin site hands out.
import { systemAt, SYSTEM_COUNT } from '../gen/galaxy.js';

export const LORE = [
  'Kaum Seraphel tidak mati. Mereka hanya berhenti bermimpi tentang kita.',
  'Sang Arsitek menggambar bintang pertama dengan satu garis cahaya.',
  'Para Penenun Bintang menjahit galaksi ini agar tidak tercerai-berai.',
  'Dewan Orrith memilih diam. Diam mereka masih terdengar di batu ini.',
  'Di bawah monolit ini tersimpan nama-nama yang sengaja dilupakan.',
  'Kaum Vael menukar tubuh mereka dengan cahaya, lalu pergi ke tepi peta.',
  'Penjaga Senyap mengawasi setiap pendaratan. Termasuk pendaratanmu.',
  'Sang Arsitek meninggalkan satu pesan: "Ulangi, sampai kau ingat."',
  'Kaum Seraphel menanam kota di dalam lubang hitam. Kota itu masih berdetak.',
  'Tiga matahari pernah padam di sini dalam satu malam.',
  'Mereka yang membaca rune ini akan bermimpi tentang laut logam.',
  'Para Penenun Bintang menganggap waktu sebagai benang, bukan sungai.',
  'Setiap planet adalah nada. Galaksi ini adalah lagu yang belum selesai.',
  'Dewan Orrith menulis hukum di kulit asteroid agar tak bisa dihapus.',
  'Kaum Vael berkata: pengembara sejati tidak pernah kembali, hanya berputar.',
  'Batu ini hangat. Seseorang menyentuhnya sebelum kau, seribu tahun lalu.',
  'Kepala raksasa ini pernah bernyanyi. Suaranya menumbuhkan hutan.',
  'Sang Arsitek takut pada satu hal: pengembara yang berhenti bertanya.',
  'Penjaga Senyap bukan mesin. Mereka adalah janji yang lupa dibatalkan.',
  'Di pusat galaksi, Kaum Seraphel menunggu seseorang membuka pintu.',
  'Rune ini menghitung mundur. Tidak ada yang tahu menuju apa.',
  'Para Penenun Bintang menenun ulang dunia yang hancur, satu serat demi satu.',
  'Wahana ini jatuh membawa pesan terakhir: "Kami salah menghitung langit."',
  'Kaum Vael meninggalkan warna mereka pada aurora di planet-planet dingin.',
  'Dewan Orrith pernah melarang peta. Peta membuat orang ingin pergi.',
  'Setiap bintang ungu adalah mata Sang Arsitek yang masih terbuka.',
  'Mereka membangun cincin batu ini untuk memanggil hujan cahaya.',
  'Kaum Seraphel percaya jiwa berpindah bersama debu bintang.',
  'Jangan takut pada gelap. Gelap adalah tempat bintang berlatih bersinar.',
  'Kau bukan yang pertama tiba di sini. Kau juga bukan yang terakhir.',
  'Sang Arsitek membiarkan satu planet berlapis emas, sebagai lelucon.',
  'Penjaga Senyap menghitung langkahmu. Angkanya sudah terlalu besar.',
];

// Scans other systems for something remarkable (black hole, rare star).
function findWonder(galaxySeed, fromIndex, rng) {
  const start = rng.int(SYSTEM_COUNT);
  for (let j = 0; j < 900; j++) {
    const idx = (start + j * 37) % SYSTEM_COUNT;
    if (idx === fromIndex) continue;
    const sys = systemAt(galaxySeed, idx);
    if (sys.star.blackHole) return `Koordinat kuno: Sistem ${sys.name} menyimpan lubang hitam.`;
    if (sys.star.type === 'X') return `Koordinat kuno: Sistem ${sys.name} bersinar ungu, mata Sang Arsitek.`;
  }
  return null;
}

// -> { kind: 'nanit'|'artifact'|'hint', item?, n?, hint?, label }
export function rollReward(rng, galaxySeed, systemIndex) {
  const roll = rng.next();
  if (roll < 0.3 && galaxySeed != null) {
    const hint = findWonder(galaxySeed, systemIndex, rng);
    if (hint) return { kind: 'hint', hint, label: hint };
  }
  if (roll < 0.6) return { kind: 'artifact', item: 'Artefak Kuno', n: 1, label: '+1 Artefak Kuno' };
  const n = 40 + rng.int(81);
  return { kind: 'nanit', item: 'Nanit', n, label: `+${n} Nanit` };
}
