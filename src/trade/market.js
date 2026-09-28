// Market overlay: sell inventory items ("Jual") and buy the shop's stock ("Beli").
// open({ player, shop, onClose }); Escape or Tutup closes. Prices come from shops.js.
import { el, clear } from '../ui/dom.js';
import { itemInfo } from '../items/catalog.js';
import { Rng, hash32 } from '../core/rng.js';
import { greetLine } from '../aliens/races.js';
import { CURRENCY, rarityOf } from './prices.js';
import { sellPriceOf, isWanted } from './shops.js';

export class Market {
  constructor() {
    this.root = null;
    this.onKey = (e) => { if (e.code === 'Escape') { e.preventDefault(); this.close(); } };
  }

  get isOpen() { return Boolean(this.root); }

  open({ player, shop, onClose } = {}) {
    if (this.isOpen) this.close();
    Object.assign(this, { player, shop, onClose, traded: false, selected: null });
    this.buildDom();
    this.render();
    addEventListener('keydown', this.onKey);
  }

  buildDom() {
    const s = this.shop, root = el('div', 'mkt'), panel = el('div', 'mkt-panel panel');
    const head = el('div', 'mkt-head');
    const title = el('div', 'mkt-title');
    title.append(el('div', 'panel-label', `Pasar · ${s.typeLabel}`), el('div', 'mkt-name', s.name),
      el('div', 'mkt-race', `${s.race.name} · ${s.race.temperament}`));
    this.walletEl = el('div', 'mkt-wallet');
    head.append(title, this.walletEl);
    const greet = el('div', 'mkt-greet', greetLine(s.race, new Rng(hash32(s.id.length, Date.now() & 0xffff))));
    this.sellList = el('div', 'mkt-list');
    this.buyList = el('div', 'mkt-list');
    const cols = el('div', 'mkt-cols');
    cols.append(this.column('Jual', 'Harga yang dibayar toko', this.sellList), this.column('Beli', 'Stok toko', this.buyList));
    this.infoEl = el('div', 'mkt-info');
    this.msgEl = el('div', 'mkt-msg');
    const close = el('button', 'btn', 'Tutup');
    close.onclick = () => this.close();
    const foot = el('div', 'mkt-foot');
    foot.append(this.msgEl, close);
    panel.append(head, greet, cols, this.infoEl, foot);
    root.append(panel);
    document.body.append(root);
    this.root = root;
  }

  column(title, sub, list) {
    const col = el('div', 'mkt-col');
    const h = el('div', 'mkt-col-head');
    h.append(el('span', 'mkt-col-title', title), el('span', 'mkt-col-sub', sub));
    col.append(h, list);
    return col;
  }

  render() {
    this.walletEl.textContent = `${this.player.count(CURRENCY)} ${CURRENCY}`;
    this.renderSell();
    this.renderBuy();
    this.renderInfo();
  }

  // Inventory rows, favourite goods first, then the most valuable.
  sellRows() {
    const inv = this.player.inventory;
    return Object.keys(inv).filter((n) => n !== CURRENCY && inv[n] >= 1)
      .map((name) => ({ name, n: Math.floor(inv[name]), price: sellPriceOf(this.shop, name), want: isWanted(this.shop, name) }))
      .sort((a, b) => b.want - a.want || b.price - a.price || a.name.localeCompare(b.name, 'id'));
  }

  renderSell() {
    clear(this.sellList);
    const rows = this.sellRows();
    if (!rows.length) this.sellList.append(el('div', 'mkt-empty', 'Inventori kosong'));
    for (const r of rows) {
      const row = this.row(r.name, `×${r.n}`, `${r.price} ${CURRENCY}`, r.want);
      row.append(this.button('Jual 1', () => this.sell(r.name, 1)), this.button('Semua', () => this.sell(r.name, r.n)));
      this.sellList.append(row);
    }
  }

  renderBuy() {
    clear(this.buyList);
    const wallet = this.player.count(CURRENCY);
    for (const s of this.shop.stock) {
      const row = this.row(s.item, s.qty ? `stok ${s.qty}` : 'habis', `${s.price} ${CURRENCY}`, false);
      const one = this.button('Beli 1', () => this.buy(s, 1)), five = this.button('Beli 5', () => this.buy(s, 5));
      one.disabled = !s.qty || wallet < s.price;
      five.disabled = one.disabled;
      row.append(one, five);
      this.buyList.append(row);
    }
  }

  row(name, count, price, want) {
    const row = el('div', `mkt-row${name === this.selected ? ' is-on' : ''}`);
    const label = el('span', 'mkt-item', name);
    if (want) label.append(el('span', 'mkt-want', 'Dicari'));
    row.append(label, el('span', 'mkt-count', count), el('span', 'mkt-price', price));
    row.onmouseenter = () => this.select(name, false);
    row.onclick = (e) => { if (e.target.tagName !== 'BUTTON') this.select(name, true); };
    return row;
  }

  button(text, fn) {
    const b = el('button', 'btn mkt-btn', text);
    b.onclick = fn;
    return b;
  }

  select(name, sticky) {
    if (!sticky && this.pinned) return;
    this.pinned = sticky ? !this.pinned || this.selected !== name : this.pinned;
    this.selected = name;
    this.renderInfo();
  }

  renderInfo() {
    clear(this.infoEl);
    if (!this.selected) { this.infoEl.append(el('div', 'mkt-hint', 'Arahkan kursor ke barang untuk melihat keterangannya.')); return; }
    const i = itemInfo(this.selected);
    const head = el('div', 'mkt-info-head');
    head.append(el('b', null, i.name), el('span', 'mkt-tag', `${i.cat} · ${rarityOf(i.name)}`));
    this.infoEl.append(head, el('div', null, i.desc), el('div', 'mkt-dim', `Sumber: ${i.source}`), el('div', 'mkt-dim', `Guna: ${i.use}`));
  }

  sell(name, n) {
    const k = Math.min(n, Math.floor(this.player.count(name)));
    if (k < 1 || !this.player.removeItem(name, k)) return this.say('Barang tidak cukup');
    const gain = sellPriceOf(this.shop, name) * k;
    this.player.addItem(CURRENCY, gain);
    const entry = this.shop.stock.find((s) => s.item === name);
    if (entry) entry.qty += k;
    this.done(`Terjual ${k} ${name} · +${gain} ${CURRENCY}`);
  }

  buy(entry, n) {
    const afford = Math.floor(this.player.count(CURRENCY) / entry.price), k = Math.min(n, entry.qty, afford);
    if (k < 1) return this.say(entry.qty ? `${CURRENCY} tidak cukup` : 'Stok habis');
    this.player.removeItem(CURRENCY, entry.price * k);
    this.player.addItem(entry.item, k);
    entry.qty -= k;
    this.done(`Dibeli ${k} ${entry.item} · −${entry.price * k} ${CURRENCY}`);
  }

  done(text) {
    if (!this.traded) this.player.emit('act', { type: 'alienTrade', race: this.shop.race.id });
    this.traded = true;
    this.say(text);
    this.render();
  }

  say(text) { this.msgEl.textContent = text; }

  close() {
    if (!this.isOpen) return;
    removeEventListener('keydown', this.onKey);
    this.root.remove();
    this.root = null;
    this.onClose?.();
  }
}
