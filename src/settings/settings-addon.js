// Settings menu: ` toggles it (any time, also paused), the pause screen gets a gear button.
// Applies stored settings to input/audio/HUD/renderer and sets input.uiCapture for number-key panels.
import { el } from '../ui/dom.js';
import { settings, setSetting, bindKey, bindProblem, saveSettings, keyLabel } from './settings-store.js';
import { needsReload } from './graphics.js';
import { applyAll, applyAudio, panelOpen } from './settings-apply.js';
import { SettingsPanel } from './settings-panel.js';

const OPEN_KEY = 'Backquote';

export class SettingsAddon {
  // tutorial: { get active, skip(), restart() }
  constructor(w, tutorial) {
    this.w = w;
    this.tutorial = tutorial;
    this.input = null;
    this.audioSet = false;
    this.listening = null;
    this.note = '';
    this.win = new SettingsPanel(w.hud.root, {
      set: (n, v) => this.set(n, v), rebind: (c) => this.listen(c), resetKeys: () => this.resetKeys(),
      skipTutorial: () => { tutorial.skip(); this.draw(); }, restartTutorial: () => { tutorial.restart(); this.draw(); },
      close: () => this.toggle(false),
    });
    this.gear = el('button', 'st-gear', '⚙ Pengaturan (`)');
    this.gear.type = 'button';
    this.gear.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(true); });
    w.hud.pause?.root.append(this.gear);
    addEventListener('keydown', (e) => this.onKey(e), true);
    applyAll(w, null);
  }

  update(input, w) {
    if (this.input !== input) { this.input = input; this.audioSet = applyAll(w, input, false); }
    if (!this.audioSet) this.audioSet = applyAudio(w.sfx);
    input.uiCapture = panelOpen(w.addons, null);
  }

  // Capture phase: a pending rebind swallows the next key before the game sees it.
  onKey(e) {
    if (e.remapped) return;
    if (this.listening) { e.preventDefault(); e.stopImmediatePropagation(); this.bind(e.code); return; }
    if (e.code === OPEN_KEY && !e.repeat) { e.preventDefault(); this.toggle(!this.win.isOpen); }
  }

  toggle(on) {
    this.win.show(on);
    this.listening = null;
    this.note = '';
    if (on) { this.input?.unlock?.(); this.draw(); this.onOpen?.(); }
  }

  set(name, value) {
    setSetting(name, value);
    applyAll(this.w, this.input, name === 'quality');
    if (name === 'quality') {
      this.note = needsReload() ? 'Antialias berubah setelah halaman dimuat ulang.' : '';
      this.draw();
    }
  }

  listen(code) {
    this.listening = code;
    this.note = 'Tekan tombol baru (Esc batal).';
    this.draw();
  }

  bind(physical) {
    const logical = this.listening;
    this.listening = null;
    const problem = physical === 'Escape' ? '' : bindProblem(logical, physical);
    if (physical !== 'Escape' && !problem) bindKey(logical, physical);
    this.note = problem || (physical === 'Escape' ? '' : `${keyLabel(logical)} dipasang.`);
    applyAll(this.w, this.input, false);
    this.draw();
  }

  resetKeys() {
    settings.keys = {};
    saveSettings();
    applyAll(this.w, this.input, false);
    this.note = 'Tombol dikembalikan.';
    this.draw();
  }

  draw() {
    this.win.draw({ listening: this.listening, note: this.note, tutorialOn: this.tutorial.active });
  }
}
