// Shipyard overlay: build a custom ship part by part with a live 3D preview, then save & use it.
import { el } from '../dom.js';
import { customDesign, specFromDesign, randomSpec, normalizeSpec, DEFAULT_SPEC } from '../../view/ship/ship-custom.js';
import { SLOT_COUNT } from './shipyard-store.js';
import { setPath } from './shipyard-schema.js';
import { buildControls } from './shipyard-controls.js';
import { ShipyardStage } from './shipyard-stage.js';

const STATS = [['speed', 'Kecepatan'], ['agility', 'Kelincahan'], ['shield', 'Perisai'], ['damage', 'Daya Tembak']];
const DEBOUNCE = 60;

function button(cls, label, onClick) {
  const b = el('button', cls, label);
  b.type = 'button';
  b.onclick = onClick;
  return b;
}

export class Shipyard {
  constructor() {
    this.root = null;
    this.onKey = (e) => { if (e.code === 'Escape' && this.isOpen) { e.preventDefault(); this.close(); } };
  }

  get isOpen() { return Boolean(this.root); }

  // current: design to start from; slots: loadCustom(save) result; onSave(design, spec, slot).
  open({ current = null, slots = [], slot = null, onSave, onClose } = {}) {
    if (this.isOpen) this.close();
    this.cbs = { onSave, onClose };
    this.current = current;
    this.slots = Array.from({ length: SLOT_COUNT }, (_, i) => slots[i] ?? null);
    this.slot = slot ?? Math.max(0, this.slots.findIndex((s) => !s));
    this.spec = current ? specFromDesign(current) : normalizeSpec(DEFAULT_SPEC);
    this.buildDom();
    this.stage = new ShipyardStage(this.stageEl);
    this.applySpec(this.spec);
    addEventListener('keydown', this.onKey);
  }

  buildDom() {
    const root = el('div', 'shipyard');
    root.addEventListener('keydown', (e) => { if (e.code !== 'Escape') e.stopPropagation(); });
    root.addEventListener('keyup', (e) => e.stopPropagation());
    const side = el('div', 'sy-side panel');
    side.append(el('div', 'panel-label', 'Galangan'));
    this.controls = buildControls(side, (path, value) => this.change(path, value));
    const tools = el('div', 'sy-tools');
    tools.append(button('btn sy-small', 'Acak', () => this.applySpec(randomSpec())),
      button('btn sy-small', 'Mulai dari pesawatku', () => this.applySpec(this.current ? specFromDesign(this.current) : DEFAULT_SPEC)));
    side.append(tools);
    const main = el('div', 'sy-main');
    this.stageEl = el('div', 'sy-stage');
    this.stageEl.append(this.buildTitle());
    main.append(this.stageEl, this.buildDock());
    root.append(side, main);
    document.body.append(root);
    this.root = root;
  }

  buildTitle() {
    const title = el('div', 'sy-title');
    this.clsEl = el('div', 'sy-class');
    this.nameEl = el('div', 'sy-name');
    title.append(this.clsEl, this.nameEl, el('div', 'sy-hint', 'Seret untuk memutar · gulir untuk zoom'));
    return title;
  }

  buildDock() {
    const dock = el('div', 'sy-dock panel');
    const bars = el('div', 'sy-stats');
    this.bars = {};
    for (const [key, label] of STATS) {
      const fill = el('div', 'sy-fill');
      const track = el('div', 'sy-track');
      const val = el('span', 'sy-stat-val');
      track.append(fill);
      bars.append(el('span', 'sy-stat', label), track, val);
      this.bars[key] = { fill, val };
    }
    this.slotsEl = el('div', 'sy-slots');
    const actions = el('div', 'sy-actions');
    actions.append(button('btn btn-primary', 'Simpan & pakai', () => this.save()), button('btn', 'Tutup', () => this.close()));
    dock.append(bars, this.slotsEl, actions);
    this.renderSlots();
    return dock;
  }

  renderSlots() {
    this.slotsEl.replaceChildren(...this.slots.map((spec, i) => {
      const b = button(`sy-slot${i === this.slot ? ' is-on' : ''}`, '', () => this.pickSlot(i));
      b.append(el('span', 'sy-slot-num', `Slot ${i + 1}`), el('span', 'sy-slot-name', spec ? spec.name : 'Kosong'));
      return b;
    }));
  }

  pickSlot(i) {
    this.slot = i;
    if (this.slots[i]) this.applySpec(this.slots[i]);
    this.renderSlots();
  }

  change(path, value) {
    setPath(this.spec, path, value);
    this.controls.refresh(this.spec);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.rebuild(), DEBOUNCE);
  }

  // Replace the whole spec (randomize, slot load, start from current) and sync every control.
  applySpec(spec) {
    this.spec = normalizeSpec(structuredClone(spec));
    this.controls.refresh(this.spec);
    this.rebuild();
  }

  rebuild() {
    if (!this.isOpen) return;
    this.design = customDesign(this.spec);
    this.stage.setDesign(this.design);
    this.clsEl.textContent = this.design.label;
    this.nameEl.textContent = this.design.name;
    for (const [key] of STATS) {
      const v = this.design.stats[key];
      this.bars[key].fill.style.width = `${Math.round(Math.max(0.05, Math.min(1, (v - 0.6) / 0.8)) * 100)}%`;
      this.bars[key].val.textContent = v.toFixed(2);
    }
  }

  save() {
    clearTimeout(this.timer);
    this.rebuild();
    const spec = this.design.spec;
    this.slots[this.slot] = spec;
    this.cbs.onSave?.(this.design, structuredClone(spec), this.slot);
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
