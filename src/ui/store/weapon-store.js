// Weapon shop overlay: list of weapons, rotating 3D preview, stat bars, price and Beli button.
// open({ player, owned, onBuy(id) -> { ok, reason }?, onClose }); Escape or Tutup closes.
import { el, clear, hexCss } from '../dom.js';
import { WEAPONS, weaponById, weaponStats } from '../../weapons/catalog.js';
import { CURRENCY } from '../../weapons/arsenal.js';
import { StorePreview } from './store-preview.js';

export { loadOwned, saveOwned, loadEquipped, saveEquipped } from '../../weapons/weapon-save.js';

const STATS = [['damage', 'Kerusakan'], ['rate', 'Laju tembak'], ['range', 'Jangkauan']];

export class WeaponStore {
  constructor() {
    this.root = null;
    this.onKey = (e) => this.handleKey(e);
  }

  get isOpen() { return Boolean(this.root); }

  open({ player, owned = [], onBuy, onClose } = {}) {
    if (this.isOpen) this.close();
    this.cbs = { onBuy, onClose };
    this.player = player;
    this.owned = new Set(owned);
    this.buildDom();
    this.preview = new StorePreview(this.stage);
    this.select(WEAPONS.find((w) => !this.owned.has(w.id))?.id ?? WEAPONS[0].id);
    addEventListener('keydown', this.onKey);
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  buildDom() {
    const root = el('div', 'wstore');
    const panel = el('div', 'wstore-panel panel');
    this.list = el('div', 'wstore-list');
    this.stage = el('div', 'wstore-stage');
    panel.append(el('div', 'panel-label', 'Toko Senjata'), this.list, this.buildInfo());
    root.append(panel);
    document.body.append(root);
    this.root = root;
  }

  buildInfo() {
    const info = el('div', 'wstore-info');
    this.nameEl = el('div', 'wstore-name');
    this.blurbEl = el('div', 'wstore-blurb');
    const bars = el('div', 'wstore-stats');
    this.bars = {};
    for (const [key, label] of STATS) {
      const track = el('div', 'wstore-track');
      this.bars[key] = el('div', 'wstore-fill');
      track.append(this.bars[key]);
      bars.append(el('span', 'wstore-stat', label), track);
    }
    this.priceEl = el('div', 'wstore-price');
    this.walletEl = el('div', 'wstore-wallet');
    this.msgEl = el('div', 'wstore-msg');
    this.buyBtn = el('button', 'btn btn-primary', 'Beli');
    this.buyBtn.onclick = () => this.buy();
    const close = el('button', 'btn', 'Tutup');
    close.onclick = () => this.close();
    const actions = el('div', 'wstore-actions');
    actions.append(this.buyBtn, close);
    info.append(this.stage, this.nameEl, this.blurbEl, bars, this.priceEl, this.walletEl, this.msgEl, actions);
    return info;
  }

  renderList() {
    clear(this.list);
    for (const w of WEAPONS) {
      const row = el('button', `wstore-item${w.id === this.selected ? ' is-on' : ''}`);
      const tag = this.owned.has(w.id) ? el('span', 'wstore-tag', 'Dimiliki') : el('span', 'wstore-cost', `${w.price} ${CURRENCY}`);
      const swatch = el('span', 'wstore-swatch');
      swatch.style.background = hexCss(w.color);
      row.append(swatch, el('span', 'wstore-item-name', w.name), tag);
      row.onclick = () => this.select(w.id);
      this.list.append(row);
    }
  }

  select(id) {
    this.selected = id;
    this.msgEl.textContent = '';
    this.preview.show(id);
    this.renderList();
    this.updateInfo();
  }

  updateInfo() {
    const w = weaponById(this.selected), stats = weaponStats(w);
    const owned = this.owned.has(w.id), wallet = this.player?.count(CURRENCY) ?? 0;
    this.nameEl.textContent = w.name;
    this.blurbEl.textContent = w.blurb;
    for (const [key] of STATS) this.bars[key].style.width = `${Math.round(Math.max(0.05, stats[key]) * 100)}%`;
    this.priceEl.textContent = owned ? 'Dimiliki' : `${w.price} ${CURRENCY}`;
    this.walletEl.textContent = `Saldo: ${wallet} ${CURRENCY}`;
    this.buyBtn.disabled = owned || wallet < w.price;
    this.buyBtn.textContent = owned ? 'Dimiliki' : 'Beli';
  }

  buy() {
    const id = this.selected;
    if (this.owned.has(id)) return;
    const res = this.cbs.onBuy?.(id) ?? { ok: false, reason: 'Toko tutup' };
    if (res.ok) this.owned.add(id);
    this.msgEl.textContent = res.ok ? `${weaponById(id).name} dibeli` : res.reason;
    this.renderList();
    this.updateInfo();
  }

  // Arrow keys browse, Enter buys, Escape closes.
  handleKey(e) {
    const i = WEAPONS.findIndex((w) => w.id === this.selected), n = WEAPONS.length;
    const actions = { ArrowUp: () => this.select(WEAPONS[(i - 1 + n) % n].id),
      ArrowDown: () => this.select(WEAPONS[(i + 1) % n].id), Enter: () => this.buy(), Escape: () => this.close() };
    const act = actions[e.code];
    if (!act) return;
    e.preventDefault();
    act();
  }

  frame(now) {
    if (!this.isOpen) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.preview.frame(dt);
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  close() {
    if (!this.isOpen) return;
    cancelAnimationFrame(this.raf);
    removeEventListener('keydown', this.onKey);
    this.preview.dispose();
    this.root.remove();
    this.root = this.preview = null;
    this.cbs.onClose?.();
  }
}
