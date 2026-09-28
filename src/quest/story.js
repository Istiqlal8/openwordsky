// Main quest chain, played in order. goal: { type, n, item?, biome? } — see quest-log.js.
const q = (id, chapter, title, text, goal, nanit, items = []) => ({ id, chapter, title, text, goal, reward: { nanit, items, xp: 10 + Math.round(nanit / 5) } });

export const STORY = [
  // Bab 1 — Pendaratan Pertama
  q('s01', 1, 'Tanah Baru', 'Dekati sebuah planet dan mendaratlah.', { type: 'land', n: 1 }, 30),
  q('s02', 1, 'Mata Penjelajah', 'Pindai planet tempatmu berdiri (F).', { type: 'scan', n: 1 }, 30),
  q('s03', 1, 'Panen Pertama', 'Tembakkan sinar tambang ke tumbuhan.', { type: 'harvest', n: 5 }, 40, [['Karbon', 20]]),
  q('s04', 1, 'Batu dan Logam', 'Tambang batu untuk Ferit.', { type: 'mine', n: 4 }, 40, [['Ferit', 20]]),
  q('s05', 1, 'Katalog Fauna', 'Dekati hewan lalu pindai (F) untuk mencatat spesiesnya.', { type: 'scanFauna', n: 2 }, 50),
  q('s06', 1, 'Pemulung Alam', 'Pungut benda bercahaya di tanah.', { type: 'pickup', n: 3 }, 50),
  q('s07', 1, 'Sahabat Liar', 'Dekati hewan jinak dan tekan Q untuk mengambil hasilnya.', { type: 'gather', n: 2 }, 60, [['Protein Fauna', 2]]),
  q('s08', 1, 'Bekal Suit', 'Kumpulkan Karbon untuk mengisi suit.', { type: 'item', item: 'Karbon', n: 30 }, 60),
  // Bab 2 — Naturalis
  q('s09', 2, 'Herbarium', 'Panen tumbuhan dari spesies yang belum tercatat.', { type: 'floraNew', n: 4 }, 80),
  q('s10', 2, 'Ahli Satwa', 'Catat lebih banyak spesies fauna.', { type: 'scanFauna', n: 6 }, 90),
  q('s11', 2, 'Pemburu', 'Buru hewan dengan blaster (klik kanan).', { type: 'hunt', n: 3 }, 80, [['Protein Fauna', 3]]),
  q('s12', 2, 'Peternak Bintang', 'Ambil hasil hewan tanpa melukainya.', { type: 'gather', n: 6 }, 100),
  q('s13', 2, 'Kolektor Alam', 'Pungut benda alam di permukaan.', { type: 'pickup', n: 10 }, 100),
  q('s14', 2, 'Teman Setia', 'Jinakkan seekor hewan (T, butuh Protein Fauna).', { type: 'tame', n: 1 }, 120),
  q('s15', 2, 'Trofi Pemburu', 'Kumpulkan Kulit Fauna dari hasil buruan.', { type: 'item', item: 'Kulit Fauna', n: 3 }, 110),
  q('s16', 2, 'Tabib Hutan', 'Kumpulkan bahan tumbuhan apa saja.', { type: 'harvest', n: 25 }, 120, [['Karbon', 40]]),
  // Bab 3 — Bintang-Bintang
  q('s17', 3, 'Lompatan Pertama', 'Buka peta (M) dan warp ke sistem lain.', { type: 'warp', n: 1 }, 120),
  q('s18', 3, 'Pencatat Dunia', 'Temukan planet baru dengan pemindai.', { type: 'discover', n: 3 }, 150),
  q('s19', 3, 'Beragam Iklim', 'Mendarat di beberapa planet.', { type: 'land', n: 3 }, 150),
  q('s20', 3, 'Pasir Panas', 'Mendarat di planet gurun.', { type: 'land', biome: 'desert', n: 1 }, 180),
  q('s21', 3, 'Jejak Leluhur', 'Temukan reruntuhan kuno dan sentuh (T).', { type: 'ruin', n: 1 }, 180),
  q('s22', 3, 'Batu Angkasa', 'Hancurkan asteroid dengan laser.', { type: 'asteroid', n: 10 }, 160, [['Kobalt', 10]]),
  q('s23', 3, 'Pemburu Bajak Laut', 'Kalahkan bajak laut di sistem berbahaya.', { type: 'pirate', n: 3 }, 250),
  q('s24', 3, 'Dunia Es', 'Mendarat di planet beku.', { type: 'land', biome: 'frozen', n: 1 }, 200),
  // Bab 4 — Legenda
  q('s25', 4, 'Melawan Penjaga', 'Hancurkan drone penjaga.', { type: 'sentinel', n: 2 }, 250, [['Logam Penjaga', 3]]),
  q('s26', 4, 'Arsip Kuno', 'Baca lebih banyak reruntuhan.', { type: 'ruin', n: 3 }, 280),
  q('s27', 4, 'Herbarium Galaksi', 'Catat banyak spesies flora.', { type: 'floraNew', n: 15 }, 300),
  q('s28', 4, 'Ensiklopedia Satwa', 'Catat banyak spesies fauna.', { type: 'scanFauna', n: 20 }, 320),
  q('s29', 4, 'Pemburu Handal', 'Buru banyak hewan.', { type: 'hunt', n: 12 }, 300),
  q('s30', 4, 'Pemburu Fosil', 'Kumpulkan Fosil (gurun, beku, gersang, eksotis).', { type: 'item', item: 'Fosil', n: 3 }, 320),
  q('s31', 4, 'Laut Luas', 'Mendarat di planet samudra.', { type: 'land', biome: 'ocean', n: 1 }, 300),
  q('s32', 4, 'Tambang Raya', 'Tambang banyak batu.', { type: 'mine', n: 40 }, 300, [['Emas', 5]]),
  q('s33', 4, 'Dunia Api', 'Mendarat di planet vulkanik.', { type: 'land', biome: 'volcanic', n: 1 }, 350),
  q('s34', 4, 'Penjelajah Sejati', 'Temukan banyak planet baru.', { type: 'discover', n: 15 }, 400),
  q('s35', 4, 'Legenda Galaksi', 'Warp ke banyak sistem.', { type: 'warp', n: 10 }, 500, [['Emas', 10]]),
  // Bab 5 — Kurator (planet collections, see planet-collection.js)
  q('s36', 5, 'Kurator Planet', 'Tuntaskan seluruh koleksi satu planet (lihat jurnal).', { type: 'clear', n: 1 }, 400),
  q('s37', 5, 'Kurator Galaksi', 'Tuntaskan koleksi di lima planet.', { type: 'clear', n: 5 }, 800, [['Emas', 15]]),
  q('s38', 5, 'Pewaris Bintang', 'Tuntaskan koleksi di dua belas planet.', { type: 'clear', n: 12 }, 1500, [['Emas', 30]]),
];

export const CHAPTERS = { 1: 'Pendaratan Pertama', 2: 'Naturalis', 3: 'Bintang-Bintang', 4: 'Legenda', 5: 'Kurator' };
