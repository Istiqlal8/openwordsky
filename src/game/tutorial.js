// First-run tips, shown once per save as timed toasts.
const TIPS = [
  [2, 'Klik layar untuk mengendalikan pesawat'],
  [7, 'Space = pulse drive. Terbang masuk atmosfer untuk mendarat'],
  [13, 'F memindai planet: temukan semua spesiesnya'],
  [19, 'M membuka peta galaksi (warp butuh 30 energi)'],
  [25, 'Tembak asteroid untuk Ferit dan Karbon, G mengisi daya'],
  [31, 'Di planet: E di dekat pesawat untuk terbang rendah, V ganti kamera'],
];

export function runTutorial(save, hud, writeSave) {
  if (save.tutorialVersion === 2) return; // bump when tips change so returning players see them
  for (const [sec, text] of TIPS) setTimeout(() => hud.toast(text), sec * 1000);
  save.tutorialVersion = 2;
  writeSave(save);
}
