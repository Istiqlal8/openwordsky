// Character creator: full-screen editor for the player's look, with a live rotating 3D preview.
import { el } from '../dom.js';
import { normalizeLook, randomLook } from '../../character/look-store.js';
import { SPECIES } from '../../character/look-options.js';
import { setPath } from './creator-schema.js';
import { buildControls } from './creator-controls.js';
import { CreatorStage } from './creator-stage.js';

const DEBOUNCE = 70;
const SPECIES_LABEL = Object.fromEntries(SPECIES);

function button(cls, label, onClick) {
  const b = el('button', cls, label);
  b.type = 'button';
  b.onclick = onClick;
  return b;
}

export class CharacterCreator {
  constructor() {
    this.root = null;
    this.onKey = (e) => { if (e.code === 'Escape' && this.isOpen) { e.preventDefault(); this.close(); } };
  }

  get isOpen() { return Boolean(this.root); }

  // look: the saved look to start from; onSave(look) gets a fresh normalized look.
  open({ look = null, onSave, onClose } = {}) {
    if (this.isOpen) this.close();
    this.cbs = { onSave, onClose };
    this.look = normalizeLook(look);
    this.buildDom();
    this.stage = new CreatorStage(this.stageEl);
    this.apply(this.look);
    addEventListener('keydown', this.onKey);
  }

  buildDom() {
    const root = el('div', 'creator');
    root.addEventListener('keydown', (e) => { if (e.code !== 'Escape') e.stopPropagation(); });
    root.addEventListener('keyup', (e) => e.stopPropagation());
    const side = el('div', 'cc-side panel');
    side.append(el('div', 'panel-label', 'Buat Karakter'));
    this.controls = buildControls(side, (path, value) => this.change(path, value), (sec) => this.onTab(sec));
    const tools = el('div', 'cc-tools');
    tools.append(button('btn cc-small', 'Acak', () => this.apply(randomLook(Math.floor(Math.random() * 1e9), this.look.species))));
    side.append(tools);
    const main = el('div', 'cc-main');
    this.stageEl = el('div', 'cc-stage');
    this.stageEl.append(this.buildTitle());
    main.append(this.stageEl, this.buildDock());
    root.append(side, main);
    document.body.append(root);
    this.root = root;
  }

  buildTitle() {
    const title = el('div', 'cc-title');
    this.speciesEl = el('div', 'cc-species');
    this.nameEl = el('div', 'cc-name');
    title.append(this.speciesEl, this.nameEl, el('div', 'cc-hint', 'Seret untuk memutar · gulir untuk zoom'));
    return title;
  }

  buildDock() {
    const dock = el('div', 'cc-dock panel');
    this.modeEl = el('div', 'cc-mode');
    const actions = el('div', 'cc-actions');
    actions.append(button('btn btn-primary', 'Simpan', () => this.save()), button('btn', 'Tutup', () => this.close()));
    dock.append(this.modeEl, actions);
    return dock;
  }

  // Suit tab previews the sealed suit, clothes tab the casual outfit.
  onTab(sec) {
    if (!this.stage || !sec.mode) return;
    this.stage.setCasual(sec.mode === 'casual');
    this.showMode();
  }

  showMode() {
    if (this.modeEl) this.modeEl.textContent = this.stage?.casual ? 'Pratinjau: pakaian biasa' : 'Pratinjau: baju astronot';
  }

  change(path, value) {
    setPath(this.look, path, value);
    this.look = normalizeLook(this.look);
    this.controls.refresh(this.look);
    this.writeTitle();
    if (path === 'name') return; // the name never changes the model
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.rebuild(), DEBOUNCE);
  }

  // Replace the whole look (randomize, first open) and sync every control.
  apply(look) {
    this.look = normalizeLook(look);
    this.controls.refresh(this.look);
    this.rebuild();
  }

  rebuild() {
    if (!this.isOpen) return;
    this.stage.setLook(this.look);
    this.writeTitle();
    this.showMode();
  }

  writeTitle() {
    this.speciesEl.textContent = SPECIES_LABEL[this.look.species] ?? this.look.species;
    this.nameEl.textContent = this.look.name;
  }

  save() {
    clearTimeout(this.timer);
    this.rebuild();
    const look = normalizeLook(this.look);
    look.created = true;
    this.cbs.onSave?.(look);
    this.close();
  }

  close() {
    if (!this.isOpen) return;
    clearTimeout(this.timer);
    removeEventListener('keydown', this.onKey);
    this.stage.dispose();
    this.root.remove();
    this.root = this.stage = this.controls = null;
    this.cbs.onClose?.();
  }
}
