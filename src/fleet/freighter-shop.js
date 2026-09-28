// Freighter shop overlay ("Balai Lelang Kapal Induk"): eight ready-made capital ships, one per
// archetype, with a rotating 3D preview, stats, price in Nanit and a Beli button.
// open({ player, fleet, onBuy(spec, price), onClose }); Escape or Tutup closes.
import { el, clear } from '../ui/dom.js';
import { FREIGHTER_CATALOG, FREIGHTER_PRICES } from './fleet-catalog.js';
import { CURRENCY } from './fleet.js';
import { FleetStage } from './fleet-stage.js';
import { button, nanit, statBars, shieldKeys } from './fleet-ui.js';

export { FREIGHTER_PRICES };

export class FreighterShop {
  constructor() {
    this.root = null;
    this.onKey = (e) => { if (e.code === 'Escape' && this.isOpen) { e.preventDefault(); this.close(); } };
  }

  get isOpen() { return Boolean(this.root); }

  open({ player, fleet = null, onBuy, onClose } = {}) {
    if (this.isOpen) this.close();
    this.cbs = { onBuy, onClose };
    this.player = player;
    this.fleet = fleet;
    this.msg = '';
    this.buildDom();
    this.stage = new FleetStage(this.stageEl);
    this.select(FREIGHTER_CATALOG[0].id);
    addEventListener('keydown', this.onKey);
  }

  buildDom() {
    const root = el('div', 'fleetshop');
    shieldKeys(root);
    const side = el('div', 'fl-side panel');
    side.append(el('div', 'panel-label', 'Balai Kapal Induk'));
    this.listEl = el('div', 'fl-list');
    side.append(this.listEl, this.ownedNote());
    const main = el('div', 'fl-main');
    this.stageEl = el('div', 'fl-stage');
    this.stageEl.append(this.buildTitle());
    main.append(this.stageEl, this.buildDock());
    root.append(side, main);
    document.body.append(root);
    this.root = root;
  }

  ownedNote() {
    const s = this.fleet?.summary?.();
    return el('div', 'fl-note', s ? `Dimiliki: ${s.name} (${s.label})` : 'Belum punya kapal induk sendiri.');
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
    this.blurbEl = el('div', 'fl-blurb');
    left.append(this.blurbEl);
    this.setStats = statBars(left);
    const right = el('div', 'fl-col fl-buy');
    this.priceEl = el('div', 'fl-price');
    this.walletEl = el('div', 'fl-wallet');
    this.msgEl = el('div', 'fl-msg');
    this.buyBtn = button('btn btn-primary', 'Beli', () => this.buy());
    right.append(this.priceEl, this.walletEl, this.msgEl, this.buyBtn, button('btn', 'Tutup', () => this.close()));
    dock.append(left, right);
    return dock;
  }

  renderList() {
    clear(this.listEl);
    for (const s of FREIGHTER_CATALOG) {
      const row = button(`fl-item${s.id === this.selected ? ' is-on' : ''}`, '', () => this.select(s.id));
      const swatch = el('span', 'fl-swatch');
      swatch.style.background = s.spec.accent;
      swatch.style.borderColor = s.spec.glow;
      const meta = el('span', 'fl-item-meta');
      meta.append(el('span', 'fl-item-name', s.name), el('span', 'fl-item-class', s.label));
      row.append(swatch, meta, el('span', 'fl-item-cost', nanit(s.price)));
      this.listEl.append(row);
    }
  }

  select(id) {
    this.selected = id;
    this.msg = '';
    this.renderList();
    this.refresh();
  }

  get current() { return FREIGHTER_CATALOG.find((s) => s.id === this.selected); }

  refresh() {
    const s = this.current;
    this.stage.setSpec(s.spec);
    this.clsEl.textContent = s.label;
    this.nameEl.textContent = s.name;
    this.blurbEl.textContent = s.blurb;
    this.setStats(s.stats);
    this.priceEl.textContent = nanit(s.price);
    const wallet = this.player?.count(CURRENCY) ?? 0;
    this.walletEl.textContent = `Saldo: ${nanit(wallet)}`;
    const poor = wallet < s.price;
    this.buyBtn.disabled = poor;
    this.buyBtn.textContent = poor ? 'Nanit kurang' : 'Beli';
    this.msgEl.textContent = this.msg;
  }

  buy() {
    const s = this.current, r = this.cbs.onBuy?.(structuredClone(s.spec), s.price);
    if (r && r.ok === false) { this.msg = r.reason ?? 'Pembelian gagal'; this.refresh(); return; }
    this.close();
  }

  close() {
    if (!this.isOpen) return;
    removeEventListener('keydown', this.onKey);
    this.stage.dispose();
    this.root.remove();
    this.root = this.stage = null;
    this.cbs.onClose?.();
  }
}
