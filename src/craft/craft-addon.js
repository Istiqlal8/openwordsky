// Meta addon: workbench (crafting upgrades/consumables) + trade market, one panel on U.
// Keys inside the panel come from its own keydown listener so they also work while the
// game is paused (the panel frees the mouse for clicking, like the collection book).
import { CraftPanel } from '../ui/craft-panel.js';
import { UPGRADES, tierOf, maxTier } from './upgrades.js';
import { UPGRADE_RECIPES, USE_RECIPES, have, affordable, pay } from './recipes.js';
import { BUY, PACK, recordOrigin, sellRows } from './market.js';

const ROMAN = ['0', 'I', 'II', 'III', 'IV'];

export class CraftAddon {
  constructor(wiring) {
    this.w = wiring;
    this.s = (wiring.log.s.craft ??= { origin: {} });
    wiring.player.upgrades ??= {};
    this.tab = 'craft';
    this.sel = 0;
    this.rows = [];
    this.sig = '';
    this.justClosed = false;
    this.panel = new CraftPanel(wiring.panel.journal.parentNode, {
      select: (i) => { this.sel = i; this.refresh(); },
      act: (i, all) => { this.sel = i; this.act(all); },
      tab: (t) => this.setTab(t),
    });
    wiring.player.on('item', ({ name }) => recordOrigin(this.s.origin, name, this.w.planet));
    addEventListener('keydown', (e) => this.onKey(e));
  }

  get sys() { return this.w.planet ? this.w.planet.systemIndex : this.w.save.systemIndex; }

  update(input) {
    if (input.pressed('KeyU') && !this.justClosed && !this.panel.isOpen) this.open(input);
    this.justClosed = false;
    if (this.panel.isOpen) this.refresh();
  }

  open(input) {
    this.panel.show(true);
    if (this.w.panel.isOpen) this.w.panel.toggle();
    input.unlock?.();
    this.sig = '';
    this.refresh();
  }

  close() {
    this.panel.show(false);
    this.justClosed = true;
  }

  onKey(e) {
    if (!this.panel.isOpen || e.repeat) return;
    const n = this.rows.length, c = e.code;
    if (c === 'KeyU') this.close();
    else if (c === 'ArrowLeft' || c === 'ArrowRight') this.setTab(this.tab === 'craft' ? 'market' : 'craft');
    else if (c === 'ArrowUp') this.sel = (this.sel + n - 1) % Math.max(1, n);
    else if (c === 'ArrowDown') this.sel = (this.sel + 1) % Math.max(1, n);
    else if (/^Digit[1-9]$/.test(c) && Number(c[5]) <= n) this.sel = Number(c[5]) - 1;
    else if (c === 'Enter' || c === 'NumpadEnter') return this.act(e.shiftKey);
    else return;
    e.preventDefault();
    this.refresh();
  }

  setTab(t) {
    this.tab = t;
    this.sel = 0;
    this.refresh();
  }

  act(all) {
    const row = this.rows[this.sel];
    const text = row?.run(all);
    if (text) { this.w.hud.toast(text); this.w.sfx.pickup?.(); }
    this.refresh();
  }

  fail(text) {
    this.w.hud.toast(text);
    return null;
  }

  // Rebuilds rows every call (cheap); redraws the DOM only when something visible changed.
  refresh() {
    this.rows = this.tab === 'craft' ? this.craftRows() : this.marketRows();
    this.sel = Math.min(this.sel, Math.max(0, this.rows.length - 1));
    const view = { tab: this.tab, sel: this.sel, nanit: Math.floor(this.w.player.count('Nanit')),
      place: this.w.planet ? `Planet ${this.w.planet.name}` : 'Uplink kapal', rows: this.rows };
    const sig = JSON.stringify(view);
    if (sig === this.sig) return;
    this.sig = sig;
    this.panel.draw(view);
  }

  costView(cost) {
    const p = this.w.player;
    return cost.map((l) => ({ label: l.label, have: Math.floor(have(p, l)), n: l.n, hint: l.any.length > 1 ? l.any.join(', ') : '' }));
  }

  craftRows() {
    const p = this.w.player;
    const ups = UPGRADE_RECIPES.map((r) => {
      const u = UPGRADES[r.key], t = tierOf(p, r.key), max = t >= maxTier(r.key);
      const cost = max ? [] : r.tiers[t];
      const next = u.mul[t + 1], pct = Math.round(Math.abs(1 - next) * 100);
      return { title: u.name, sub: max ? `${u.effect} · maks` : `${ROMAN[t + 1]}: ${u.effect} ${next < 1 ? '−' : '+'}${pct}%`,
        tier: t, max: maxTier(r.key), cost: this.costView(cost), ok: !max && affordable(p, cost),
        button: max ? '' : 'Racik', run: () => this.upgrade(r) };
    });
    const uses = USE_RECIPES.map((r) => ({ title: r.name, sub: r.effect, cost: this.costView(r.cost),
      ok: affordable(p, r.cost), button: 'Racik', run: () => this.consume(r) }));
    uses[0].head = 'Sekali pakai';
    return [...ups, ...uses];
  }

  upgrade(r) {
    const p = this.w.player, t = tierOf(p, r.key);
    if (t >= maxTier(r.key)) return this.fail('Sudah tingkat maksimum');
    if (!affordable(p, r.tiers[t])) return this.fail('Bahan belum cukup');
    pay(p, r.tiers[t]);
    p.upgrades[r.key] = t + 1;
    p.emit('act', { type: 'craft', item: r.key });
    return `${UPGRADES[r.key].name} ${ROMAN[t + 1]} terpasang`;
  }

  consume(r) {
    const p = this.w.player;
    if (!affordable(p, r.cost)) return this.fail('Bahan belum cukup');
    // Check usefulness on a dry run first so nothing is wasted.
    const probe = { suit: { ...p.suit }, addItem() {} };
    if (!r.use(probe)) return this.fail(`${r.name} tidak diperlukan sekarang`);
    pay(p, r.cost);
    p.emit('act', { type: 'craft', item: r.id });
    return r.use(p);
  }

  marketRows() {
    const p = this.w.player;
    const sells = sellRows(p, this.s.origin, this.sys).map((r) => ({
      title: r.name, sub: r.from ? `Endemik ${r.from}${r.bonus ? ` · bonus luar sistem +${r.bonus}` : ' · jual di sistem lain ×2'}` : '',
      count: r.n, price: r.unit, bonus: r.bonus, button: 'Jual 1', button2: 'Semua', ok: true,
      run: (all) => this.sell(r.name, all ? r.n : 1, r.unit) }));
    const buys = BUY.map(([name, unit], i) => ({ title: `${PACK} ${name}`, head: i ? '' : 'Beli', price: unit * PACK, buy: true,
      ok: p.count('Nanit') >= unit * PACK, button: 'Beli', run: () => this.buy(name, unit * PACK) }));
    if (sells[0]) sells[0].head = 'Jual';
    return [...sells, ...buys];
  }

  sell(name, n, unit) {
    const p = this.w.player;
    if (!p.removeItem(name, n)) return null;
    p.addItem('Nanit', n * unit);
    p.emit('act', { type: 'sell', item: name, n });
    return `Terjual ${n} ${name} · +${n * unit} Nanit`;
  }

  buy(name, price) {
    const p = this.w.player;
    if (!p.removeItem('Nanit', price)) return this.fail(`Butuh ${price} Nanit`);
    p.addItem(name, PACK);
    return `Dibeli ${PACK} ${name} · −${price} Nanit`;
  }
}
