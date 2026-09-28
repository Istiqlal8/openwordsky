// Indonesian names and chatter for settlements and their residents (deterministic via Rng).
const PREFIX = {
  farm: ['Desa'], hamlet: ['Kampung', 'Dusun'], fishing: ['Kampung Nelayan'], town: ['Kota'],
  research: ['Stasiun Riset'], colony: ['Koloni'], mining: ['Pos Tambang'],
};
const ROOTS = ['Sukamaju', 'Sukamakmur', 'Harapan', 'Sejahtera', 'Mekarsari', 'Sindangsari', 'Karanganyar',
  'Tanjungsari', 'Cikaret', 'Wonosari', 'Sumberjaya', 'Mulyorejo', 'Bojongsari', 'Tirtajaya', 'Bumiayu',
  'Lembah Hijau', 'Mentari', 'Nusantara', 'Cahaya', 'Merdeka', 'Pelangi', 'Kencana', 'Bintang Timur'];
const COAST = ['Pantai Biru', 'Tanjung Pasir', 'Teluk Indah', 'Muara Jaya', 'Pasir Putih', 'Karang Mulia'];
const MEN = ['Budi', 'Agus', 'Joko', 'Slamet', 'Rudi', 'Hendra', 'Bambang', 'Wayan', 'Dedi', 'Yusuf', 'Andi', 'Eko', 'Rahmat', 'Asep'];
const WOMEN = ['Sari', 'Siti', 'Dewi', 'Ayu', 'Rina', 'Wati', 'Lestari', 'Nur', 'Putri', 'Indah', 'Ratna', 'Made', 'Yuni', 'Fitri'];
const KIDS = ['Dika', 'Bayu', 'Tono', 'Rara', 'Nisa', 'Kiki', 'Adit', 'Lala', 'Putu', 'Dodi', 'Mimi', 'Fajar'];

const GREET = ['Halo, penjelajah! Selamat datang di {v}.', 'Wah, ada tamu dari langit! Mampir dulu, yuk.',
  'Selamat siang! Sudah makan belum?', 'Hati-hati di jalan, ya.', 'Jarang ada pesawat mampir ke sini.',
  'Cuacanya enak buat jalan-jalan.', 'Salam kenal, saya {n}.'];
const NIGHT = ['Selamat malam! Lampu desa sudah menyala.', 'Sudah malam, jangan jauh-jauh dari cahaya.'];
const ROLE = {
  farmer: ['Panen tahun ini bagus sekali!', 'Sawah butuh air, untung hujan kemarin.', 'Capek, tapi senang lihat padi menguning.'],
  fisher: ['Ikan lagi banyak di teluk.', 'Angin laut bagus buat melaut.', 'Semalam dapat tuna besar!'],
  shop: ['Mampir ke toko, ada barang baru!', 'Pasar ramai tiap pagi.', 'Harga di sini bersahabat.'],
  scientist: ['Data atmosfer hari ini menarik sekali.', 'Antena kami menangkap sinyal dari bintang jauh.'],
  colonist: ['Rumah kaca kami mulai berbuah.', 'Planet ini ternyata ramah, udaranya segar.', 'Pesawat suplai datang minggu depan.'],
  miner: ['Bor tidak pernah istirahat.', 'Hati-hati, tanah di sini licin.'],
  child: ['Kak, pesawatnya keren!', 'Main petak umpet, yuk!', 'Aku mau jadi astronot kalau besar!'],
};
const TIPS = ['Tekan G untuk mengisi suit kalau punya Oksigen atau Karbon.', 'Batu mineral bisa ditambang dengan klik kiri.',
  'Terbang tinggi dengan pesawat untuk kembali ke luar angkasa.', 'Pindai planet dengan F untuk mencatat penemuan.',
  'Jangan tambang terlalu banyak, drone penjaga bisa marah.', 'Hewan yang tenang bisa dijinakkan dengan Protein Fauna.',
  'Di malam hari, cari cahaya desa dari udara.'];
const GIFTS = [['Oksigen', 2], ['Karbon', 3], ['Natrium', 2], ['Ferit', 3], ['Protein Fauna', 1]];

// Settlement name, e.g. 'Desa Sukamaju'; `used` avoids repeats on one planet.
export function settlementName(type, rng, used) {
  const roots = type === 'fishing' ? COAST : ROOTS;
  let root = rng.pick(roots);
  for (let i = 0; i < 6 && used.has(root); i++) root = rng.pick(roots);
  used.add(root);
  return `${rng.pick(PREFIX[type])} ${root}`;
}

// { name, kid, female } with a polite title for adults (Pak / Bu).
export function personName(rng, kid) {
  const female = rng.chance(0.5);
  if (kid) return { name: `Dik ${rng.pick(KIDS)}`, female, kid };
  return { name: female ? `Bu ${rng.pick(WOMEN)}` : `Pak ${rng.pick(MEN)}`, female, kid };
}

// One short greeting line for a resident; `night` > 0.5 favours evening lines.
export function greetLine(rng, person, village, night) {
  const pool = [...GREET, ...(ROLE[person.role] ?? [])];
  if (night > 0.5) pool.push(...NIGHT);
  return rng.pick(pool).replace('{v}', village).replace('{n}', person.name);
}

export const tipLine = (rng) => rng.pick(TIPS);
export const giftFor = (rng) => { const [item, count] = rng.pick(GIFTS); return { item, count }; };
