// First-run tips, shown once per save as timed toasts.
// The step-by-step checklist lives in src/tutorial/onboarding.js; only the first hint stays here.
const TIPS = [
  [2, 'Klik layar untuk mengendalikan pesawat'],
];

export function runTutorial(save, hud, writeSave) {
  if (save.tutorialVersion === 2) return; // bump when tips change so returning players see them
  for (const [sec, text] of TIPS) setTimeout(() => hud.toast(text), sec * 1000);
  save.tutorialVersion = 2;
  writeSave(save);
}
