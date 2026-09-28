// Short Indonesian lines NPC explorers say when the player walks up to them.
const LINES = [
  'Halo, penjelajah!',
  'Planet ini aneh ya?',
  'Hati-hati dengan penjaga.',
  'Sudah lihat fauna di sini?',
  'Cuacanya bikin suit cepat habis.',
  'Aku sedang memindai batuan.',
  'Kapalmu keren juga!',
  'Jangan tambang terlalu banyak, drone datang.',
  'Aku baru tiba dari sistem sebelah.',
  'Ada tanaman bercahaya di dekat sini.',
  'Semoga perjalananmu lancar.',
  'Energi kapalku hampir habis.',
  'Langitnya indah malam ini.',
  'Kamu juga tersesat?',
  'Sampai jumpa di bintang berikutnya!',
];

// One line picked with the given Rng (deterministic per seed).
export function greeting(rng) {
  return rng.pick(LINES);
}
