// Meta addon: biome hint in the journal, galaxy collection book (L), quest log for surface markers.
import { questLink } from './quest-link.js';
import { BiomeHint } from './biome-hint.js';
import { codexData } from './codex-data.js';
import { CodexPanel } from '../ui/codex-panel.js';

export class GuideAddon {
  constructor(wiring) {
    questLink.log = wiring.log;
    this.hint = new BiomeHint(wiring);
    wiring.panel.sections.push(this.hint);
    this.codex = new CodexPanel(wiring.panel.journal.parentNode);
    this.codex.onTab = (id) => { this.codex.tab = id; this.redraw(wiring); };
    this.seen = -1;
  }

  update(input, wiring) {
    this.hint.update();
    if (input.pressed('KeyL')) this.toggle(wiring);
    else if (this.codex.isOpen && input.pressed('KeyJ')) this.codex.toggle();
    if (!this.codex.isOpen) return;
    if (this.seen !== wiring.log.version) this.redraw(wiring);
  }

  toggle(wiring) {
    this.codex.toggle();
    if (!this.codex.isOpen) return;
    if (wiring.panel.isOpen) wiring.panel.toggle();
    this.redraw(wiring);
  }

  redraw(wiring) {
    this.seen = wiring.log.version;
    this.codex.draw(codexData(wiring.save, wiring.log, wiring.player));
  }
}
