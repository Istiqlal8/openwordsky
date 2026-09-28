// Word lists for procedural species. Indonesian, shown in the scanner.
export const TEMPERAMENTS = ['Jinak', 'Penakut', 'Agresif', 'Penasaran', 'Teritorial', 'Pemalu',
  'Tenang', 'Gelisah', 'Pemangsa', 'Suka bermain'];

export const DIETS = ['Herbivora', 'Karnivora', 'Omnivora', 'Pemakan batu', 'Pemakan cahaya',
  'Pemakan logam', 'Pemakan spora', 'Penyerap panas', 'Pemakan bangkai', 'Penghisap mineral'];

export const FAUNA_QUIRKS = ['Tidur terbalik', 'Bernyanyi saat senja', 'Menggembung saat takut',
  'Berganti warna tiap jam', 'Berjalan mundur', 'Bertelur di batu panas', 'Tertawa saat lapar',
  'Punya dua jantung', 'Berkomunikasi lewat kedipan', 'Mengubur diri saat badai',
  'Menempel di tebing', 'Mengikuti pengunjung', 'Menari saat hujan', 'Bersinar saat marah',
  'Tak pernah tidur', 'Hidup 400 tahun', 'Mengeluarkan gelembung', 'Makan bayangannya sendiri',
  'Berkembang biak dengan membelah', 'Menghafal wajah', 'Bersiul ultrasonik', 'Kulit sekeras baja',
  'Tiga perut', 'Bisa melayang sesaat', 'Menangis cairan asam', 'Kepala kedua selalu tidur',
  'Mendengkur seperti mesin', 'Menyimpan kristal di perut', 'Cangkangnya bergema', 'Berkedip berirama',
  'Menggali terowongan spiral', 'Menyamar jadi batu'];

export const FLORA_QUIRKS = ['Bernapas pelan', 'Menyala di malam hari', 'Menjerit saat disentuh',
  'Mengeluarkan spora pelangi', 'Akarnya berjalan', 'Berputar mengikuti matahari', 'Berdenyut',
  'Meneteskan madu logam', 'Berbunyi saat tertiup angin', 'Menangkap serangga', 'Tumbuh dalam semalam',
  'Buahnya meledak', 'Daunnya tajam', 'Memancarkan panas', 'Mengambang sedikit', 'Berbau manis',
  'Menyerap radiasi', 'Bercabang fraktal', 'Batangnya kristal', 'Berbisik', 'Mengedipkan matanya',
  'Bergoyang tanpa angin', 'Bijinya melayang', 'Bergetar saat didekati', 'Terasa hangat'];

export const FAUNA_BODIES = ['bulat', 'lonjong', 'pipih', 'segmen', 'bola-ganda', 'ular', 'kubus', 'tong'];
export const BODY_LABELS = { bulat: 'Bulat', lonjong: 'Lonjong', pipih: 'Pipih', segmen: 'Beruas',
  'bola-ganda': 'Bola ganda', ular: 'Ular', kubus: 'Kotak', tong: 'Tong' };
// Optional body features: [id, chance]. Builder draws each one it finds in genes.features.
export const FAUNA_FEATURES = [['sirip', 0.18], ['jambul', 0.15], ['rumbai', 0.1], ['cangkang', 0.12],
  ['gading', 0.14], ['telinga', 0.16], ['moncong', 0.2], ['bintik', 0.18], ['belalai', 0.07]];
export const FEATURE_LABELS = { sirip: 'bersirip', jambul: 'berjambul', rumbai: 'berumbai leher',
  cangkang: 'bercangkang', gading: 'bergading', telinga: 'bertelinga lebar', moncong: 'bermoncong',
  bintik: 'bintik bercahaya', belalai: 'berbelalai' };
export const PATTERNS = ['polos', 'polos', 'belang', 'totol', 'dua-warna'];
export const FAUNA_MOVES = [
  { move: 'jalan', w: 5 }, { move: 'lompat', w: 3 }, { move: 'melayang', w: 2 },
  { move: 'merayap', w: 2 }, { move: 'terbang', w: 2 },
];
export const TAILS = ['none', 'short', 'long', 'club'];
export const FLORA_SHAPES = ['tree', 'mushroom', 'crystal', 'spike', 'coral', 'bulb', 'tentacle',
  'flower', 'cactus', 'orb', 'eyestalk', 'lantern', 'spiral', 'jelly', 'fan', 'pod', 'arch', 'bone',
  'balloon'];
export const FLORA_LABELS = { tree: 'Pohon', mushroom: 'Jamur', crystal: 'Kristal', spike: 'Duri',
  coral: 'Karang', bulb: 'Umbi balon', tentacle: 'Tentakel', flower: 'Bunga raksasa', cactus: 'Kaktus',
  orb: 'Bola apung', eyestalk: 'Tangkai mata', lantern: 'Lentera gantung', spiral: 'Spiral',
  jelly: 'Agar-agar', fan: 'Kipas', pod: 'Telur polong', arch: 'Lengkung sulur', bone: 'Tulang rusuk',
  balloon: 'Pohon balon' };
export const MOVE_LABELS = { jalan: 'Berjalan', lompat: 'Melompat', melayang: 'Melayang',
  merayap: 'Merayap', terbang: 'Terbang' };
