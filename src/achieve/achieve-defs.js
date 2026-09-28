// Achievement (trofi) definitions. value(ctx) -> current number; unlocked when value >= goal.
// ctx = { c: act counters, f: flags, biomes: count, log: QuestLog, save, player }
export const CATEGORIES = ['Penjelajah', 'Naturalis', 'Pemburu', 'Pedagang', 'Pilot', 'Kolektor', 'Rahasia'];
export const MEDALS = { bronze: 'Perunggu', perak: 'Perak', emas: 'Emas', rahasia: 'Rahasia' };
export const REWARD = { bronze: 25, perak: 75, emas: 200, rahasia: 150 };
const TIERS = ['bronze', 'perak', 'emas'];

const count = (type) => (x) => x.c[type] ?? 0;
const keys = (obj) => Object.keys(obj ?? {}).length;
const flag = (name) => (x) => (x.f[name] ? 1 : 0);

// One entry per tier: tiered('disc', 'Penjelajah', ['A', 'B', 'C'], 'Temukan {n} planet', [1, 25, 100], fn).
function tiered(id, cat, names, desc, goals, value) {
  const medals = goals.length === 2 ? ['bronze', 'perak'] : TIERS;
  return goals.map((goal, i) => ({ id: `${id}${i + 1}`, cat, name: names[i], desc: desc.replace('{n}', goal),
    goal, medal: goals.length === 1 ? 'emas' : medals[i], value }));
}

const single = (id, cat, name, desc, goal, value, medal = 'emas') => [{ id, cat, name, desc, goal, value, medal }];
const secret = (id, name, desc, value) => [{ id, cat: 'Rahasia', name, desc, goal: 1, value, medal: 'rahasia', hidden: true }];

export const ACHIEVEMENTS = [
  ...tiered('disc', 'Penjelajah', ['Langkah Pertama', 'Kartografer', 'Penjelajah Agung'], 'Temukan {n} planet (F)', [1, 25, 100], (x) => keys(x.save.discoveries)),
  ...tiered('sys', 'Penjelajah', ['Pengelana', 'Pengembara Bintang', 'Tanpa Batas'], 'Kunjungi {n} sistem bintang', [5, 50, 200], (x) => x.save.visited?.length ?? 0),
  ...tiered('land', 'Penjelajah', ['Pilot Darat', 'Veteran Pendaratan'], 'Mendarat {n} kali', [10, 100], count('land')),
  ...tiered('biome', 'Penjelajah', ['Turis Bioma', 'Pengamat Iklim', 'Semua Bioma'], 'Mendarat di {n} bioma berbeda', [3, 6, 9], (x) => x.biomes),
  ...tiered('ruin', 'Penjelajah', ['Arkeolog', 'Penjaga Sejarah'], 'Selidiki {n} reruntuhan', [1, 10], count('ruin')),
  ...tiered('species', 'Naturalis', ['Pencatat', 'Ahli Spesies', 'Ensiklopedia Hidup'], 'Catat {n} spesies', [10, 100, 500],
    (x) => keys(x.log.s.catalog?.fauna) + keys(x.log.s.catalog?.flora)),
  ...single('fauna50', 'Naturalis', 'Zoolog', 'Catat 50 spesies fauna', 50, (x) => keys(x.log.s.catalog?.fauna), 'perak'),
  ...single('flora50', 'Naturalis', 'Botanis', 'Catat 50 spesies flora', 50, (x) => keys(x.log.s.catalog?.flora), 'perak'),
  ...tiered('gather', 'Naturalis', ['Peternak', 'Sahabat Satwa'], 'Ambil {n} hasil hewan (Q)', [10, 100], count('gather')),
  ...tiered('tame', 'Naturalis', ['Penjinak', 'Pawang'], 'Jinakkan {n} hewan', [1, 10], count('tame')),
  ...tiered('hunt', 'Pemburu', ['Pemburu', 'Predator Puncak'], 'Buru {n} hewan', [10, 100], count('hunt')),
  ...tiered('sentinel', 'Pemburu', ['Pemberontak', 'Musuh Penjaga'], 'Hancurkan {n} drone penjaga', [10, 50], count('sentinel')),
  ...tiered('pirate', 'Pemburu', ['Penangkal Bajak', 'Pemburu Hadiah', 'Teror Bajak Laut'], 'Kalahkan {n} bajak laut', [1, 25, 100], count('pirate')),
  ...tiered('legend', 'Pemburu', ['Penakluk Legenda', 'Pemburu Mitos'], 'Kalahkan {n} monster legendaris', [1, 5], count('legend')),
  ...tiered('fish', 'Pemburu', ['Pemancing', 'Nelayan Galaksi', 'Raja Samudra'], 'Tangkap {n} ikan', [1, 50, 200], count('fish')),
  ...tiered('sell', 'Pedagang', ['Pedagang Kecil', 'Saudagar', 'Konglomerat'], 'Jual {n} barang', [10, 100, 1000], count('sell')),
  ...tiered('alien', 'Pedagang', ['Diplomat Dagang', 'Mitra Antarbintang'], 'Berdagang dengan alien {n} kali', [1, 10], count('alienTrade')),
  ...tiered('cargo', 'Pedagang', ['Kurir', 'Kurir Kilat'], 'Antar {n} muatan kargo', [1, 20], (x) => x.log.s.cargo?.delivered ?? 0),
  ...single('rep', 'Pedagang', 'Saudara Alien', 'Capai reputasi Saudara dengan satu ras', 250, (x) => Math.max(0, ...Object.values(x.log.s.rep ?? {}))),
  ...single('rich', 'Pedagang', 'Kaya Raya', 'Simpan 10.000 Nanit', 10000, (x) => Math.floor(x.player.count('Nanit'))),
  ...tiered('warp', 'Pilot', ['Lompatan Pertama', 'Navigator Warp'], 'Warp {n} kali', [10, 100], count('warp')),
  ...tiered('asteroid', 'Pilot', ['Penambang Angkasa', 'Pemecah Batu'], 'Hancurkan {n} asteroid', [25, 200], count('asteroid')),
  ...tiered('event', 'Pilot', ['Saksi Peristiwa', 'Pemburu Fenomena'], 'Saksikan {n} peristiwa alam', [1, 10], count('event')),
  ...single('blackhole', 'Pilot', 'Tepi Horizon', 'Kunjungi sistem lubang hitam', 1, flag('blackhole')),
  ...tiered('clear', 'Kolektor', ['Kurator', 'Kurator Agung', 'Pewaris Galaksi'], 'Tuntaskan koleksi {n} planet', [1, 10, 50], (x) => keys(x.log.s.cleared)),
  ...tiered('craft', 'Kolektor', ['Perakit', 'Insinyur'], 'Racik {n} kali (U)', [5, 25], count('craft')),
  ...tiered('build', 'Kolektor', ['Tukang', 'Arsitek'], 'Bangun {n} bagian markas', [10, 100], count('build')),
  ...single('cook', 'Kolektor', 'Koki Bintang', 'Masak 10 hidangan', 10, count('cook'), 'perak'),
  ...single('photo', 'Kolektor', 'Fotografer', 'Ambil 10 foto', 10, count('photo'), 'perak'),
  ...tiered('quests', 'Kolektor', ['Pekerja Keras', 'Pahlawan Misi'], 'Selesaikan {n} misi', [10, 100], (x) => x.log.s.done ?? 0),
  ...single('rival', 'Kolektor', 'Juara Balapan', 'Kalahkan rival 5 kali', 5, (x) => x.log.s.rival?.won ?? 0),
  ...secret('golden', 'Planet Emas', 'Mendarat di planet emas', flag('golden')),
  ...secret('goldbeast', 'Sentuhan Emas', 'Dapatkan hasil hewan emas', flag('goldbeast')),
  ...secret('moon', 'Penjaga Malam', 'Petik Bunga Bulan', flag('Bunga Bulan')),
  ...secret('storm', 'Pemburu Badai', 'Kumpulkan Kristal Badai', flag('Kristal Badai')),
  ...secret('legendrank', 'Legenda Galaksi', 'Capai pangkat tertinggi', (x) => (x.log.s.xp >= 5000 ? 1 : 0)),
];

// Items that set a secret flag when picked up (item name -> flag).
export const ITEM_FLAGS = { 'Bulu Emas': 'goldbeast', 'Susu Bintang': 'goldbeast', 'Trofi Langka': 'goldbeast',
  'Bunga Bulan': 'Bunga Bulan', 'Kristal Badai': 'Kristal Badai' };
