// DIY capital-ship yard ("Galangan Kapal Induk"): pick the frame, size, colours, thrusters,
// masts, cargo racks, bridge and name with a live 3D preview, stats bars and a build cost.
// open({ current, fleet, player, onSave(spec, cost), onClose }); Escape or Tutup closes.
import { el } from '../ui/dom.js';
import { normalizeSpec, randomSpec, specStats, refitCost, DEFAULT_SPEC, ARCHETYPE_LABELS } from './fleet-spec.js';
import { CURRENCY } from './fleet.js';
import { FleetStage } from './fleet-stage.js';
import { buildFields } from './fleet-fields.js';
import { button, nanit, statBars, shieldKeys } from './fleet-ui.js';

const DEBOUNCE = 70;

export class FreighterYard {
  constructor() {
    this.root = null;
    this.onKey = (e) => { if (e.code === 'Escape' && this.isOpen) { e.preventDefault(); this.close(); } };
  }

  get isOpen() { return Boolean(this.root); }

  open({ current = null, fleet = null, player = null, onSave, onClose } = {}) {
    if (this.isOpen) this.close();
    this.cbs = { onSave, onClose };
    this.fleet = fleet;
    this.player = player;
    this.ownedSpec = fleet?.owned?.spec ?? (current ? normalizeSpec(current) : null);
    this.msg = '';
    this.buildDom();
    this.stage = new FleetStage(this.stageEl);
    this.apply(current ?? this.ownedSpec ?? DEFAULT_SPEC);
    addEventListener('keydown', this.onKey);
  }

  buildDom() {
    const root = el('div', 'fleetyard');
    shieldKeys(root);
    const side = el('div', 'fl-side panel');
    side.append(el('div', 'panel-label', 'Galangan Kapal Induk'));
    this.fields = buildFields(side, (key, value) => this.change(key, value));
    const tools = el('div', 'fl-tools');
    tools.append(button('btn fl-small', 'Acak', () => this.apply(randomSpec())),
      button('btn fl-small', 'Mulai dari milikku', () => this.apply(this.ownedSpec ?? DEFAULT_SPEC)));
    side.append(tools);
    const main = el('div', 'fl-main');
    this.stageEl = el('div', 'fl-stage');
    this.stageEl.append(this.buildTitle());
    main.append(this.stageEl, this.buildDock());
    root.append(side, main);
    document.body.append(root);
    this.root = root;
  }

  buildTitle() {
    const title = el('div', 'fl-title');
    this.clsEl = el('div', 'fl-class');
    this.nameEl = el('div', 'fl-name');
    title.append(this.clsEl, this.nameEl, el('div', 'fl-hint', 'Seret untuk memutar · gulir untuk zoom'));
    return title;
  }

  buildDock() {
    const dock = el('div', 'fl-dock panel');
    const left = el('div', 'fl-col');
    this.setStats = statBars(left);
    const right = el('div', 'fl-col fl-buy');
    this.costEl = el('div', 'fl-price');
    this.walletEl = el('div', 'fl-wallet');
    this.msgEl = el('div', 'fl-msg');
    this.saveBtn = button('btn btn-primary', 'Bangun', () => this.save());
    right.append(this.costEl, this.walletEl, this.msgEl, this.saveBtn, button('btn', 'Tutup', () => this.close()));
    dock.append(left, right);
    return dock;
  }

  change(key, value) {
    this.spec[key] = value;
    this.spec = normalizeSpec(this.spec);
    this.fields.refresh(this.spec);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.rebuild(), DEBOUNCE);
  }

  // Replace the whole spec (random, owned hull, first open) and sync every widget.
  apply(spec) {
    this.spec = normalizeSpec(structuredClone(spec));
    this.msg = '';
    this.fields.refresh(this.spec);
    this.rebuild();
  }

  rebuild() {
    if (!this.isOpen) return;
    this.stage.setSpec(this.spec);
    this.clsEl.textContent = ARCHETYPE_LABELS[this.spec.archetype];
    this.nameEl.textContent = this.spec.name;
    this.setStats(specStats(this.spec));
    this.cost = refitCost(this.spec, this.ownedSpec);
    this.costEl.textContent = this.cost ? nanit(this.cost) : 'Gratis (tukar tambah)';
    const wallet = this.player?.count(CURRENCY) ?? 0;
    this.walletEl.textContent = `Saldo: ${nanit(wallet)}`;
    const poor = wallet < this.cost;
    this.saveBtn.disabled = poor;
    this.saveBtn.textContent = poor ? 'Nanit kurang' : 'Bangun';
    this.msgEl.textContent = this.msg;
  }

  save() {
    clearTimeout(this.timer);
    this.rebuild();
    const r = this.cbs.onSave?.(structuredClone(this.spec), this.cost);
    if (r && r.ok === false) { this.msg = r.reason ?? 'Pembangunan gagal'; this.rebuild(); return; }
    this.close();
  }

  close() {
    if (!this.isOpen) return;
    clearTimeout(this.timer);
    removeEventListener('keydown', this.onKey);
    this.stage.dispose();
    this.root.remove();
    this.root = this.stage = this.fields = null;
    this.cbs.onClose?.();
  }
}
