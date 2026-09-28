// Meta addon: cargo deliveries (board on O) + distress-call planet rescues. State in log.s.cargo / log.s.rescue.
import { CargoMissions } from './cargo-missions.js';
import { RescueMissions } from './rescue-missions.js';
import { currentDesign, holdOf, usedHold, lockReason, CLASS_NAME } from './ship-cargo.js';
import { hub } from './hub.js';
import { CargoBoard } from '../ui/missions-board.js';
import { el } from '../ui/dom.js';
import { cargoTrack, cargoCard, rescueTrack, rescueCard, savedCard } from '../ui/missions-view.js';

const DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];

export class MissionsAddon {
  constructor(w) {
    this.w = w;
    this.cargo = new CargoMissions(w.log.s);
    this.rescue = new RescueMissions(w.log.s);
    this.board = new CargoBoard(w.panel.tracker.parentNode);
    this.last = performance.now();
    this.clockAcc = 0;
    hub.rescue = this.rescue;
    hub.changed = () => this.changed();
    hub.toast = (text) => w.hud.toast(text);
    this.bindRescue();
    w.player.on('act', (a) => { if (this.rescue.onAct(a.type, this.where())) this.changed(); });
    w.player.on('item', () => { if (this.rescue.checkDeliver(w.player, w.planet?.key)) this.changed(); });
    w.panel.sections.push({ journal: () => this.journal(), track: () => this.track() });
  }

  where() {
    return { planetKey: this.w.planet?.key ?? null, systemIndex: this.w.save.systemIndex, inSpace: !this.w.planet };
  }

  changed() { this.w.log.version++; if (this.board.isOpen) this.drawBoard(); }

  bindRescue() {
    const { hud, log, sfx } = this.w;
    this.rescue.onStage = (m, st) => { hud.toast(`${m.dest.name}: ${st.label} ✓`); sfx.scan?.(); };
    this.rescue.onDone = (m) => {
      hud.toast(`Planet diselamatkan: ${m.dest.name}`);
      log.award({ title: `Penyelamatan ${m.dest.name}`, reward: m.reward });
    };
    this.rescue.onFail = (m) => { hud.toast(`Penyelamatan gagal: ${m.dest.name} tidak tertolong`); this.changed(); };
  }

  design() { return currentDesign(this.w.save); }

  hold(design = this.design()) { return { used: usedHold(this.cargo.active), max: holdOf(design) }; }

  update(input) {
    const now = performance.now(), dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    this.tick(dt);
    this.keys(input);
  }

  tick(dt) {
    const { w } = this;
    for (const m of this.cargo.tick(dt, w.player.ship.hull)) {
      w.hud.toast(`Muatan gagal: ${m.title} mati di perjalanan`);
      this.changed();
    }
    const call = this.rescue.tick(dt, w.save.galaxySeed, w.save.systemIndex);
    if (call) this.distress(call);
    this.clockAcc += dt;
    if (this.clockAcc >= 1 && (this.cargo.active.length || this.rescue.active)) { this.clockAcc = 0; this.changed(); }
  }

  distress(m) {
    this.w.hud.toast(`Sinyal darurat! ${m.title} (${m.dest.jumps} lompatan) · J`);
    this.w.sfx.discover?.();
    this.changed();
  }

  keys(input) {
    const { w } = this;
    if (input.pressed('KeyO')) this.toggleBoard();
    if (this.board.isOpen && w.panel.isOpen) this.board.toggle(false);
    if (!this.board.isOpen) return;
    DIGITS.forEach((code, i) => { if (input.pressed(code)) this.load(i); });
    if (input.pressed('Backspace')) this.drop();
  }

  toggleBoard() {
    const { w } = this;
    if (!w.planet) { w.hud.toast('Papan kargo hanya ada di permukaan planet'); this.board.toggle(false); return; }
    if (w.panel.isOpen) w.panel.toggle();
    this.board.toggle();
    if (this.board.isOpen) this.drawBoard();
  }

  load(i) {
    const res = this.cargo.accept(i, this.design(), this.w.player.ship.hull);
    this.w.hud.toast(res.text);
    if (res.ok) this.w.sfx.scan?.();
    this.changed();
  }

  drop() {
    const m = this.cargo.abandon();
    if (m) this.w.hud.toast(`Muatan dibuang: ${m.title}`);
    this.changed();
  }

  drawBoard() {
    const d = this.design();
    this.board.draw({ planet: this.w.planet?.name ?? '', offers: this.cargo.offers, hold: this.hold(d),
      shipLabel: `${d.name} (${CLASS_NAME[d.cls] ?? d.cls})`, lockOf: (o) => lockReason(o, d, this.cargo.active) });
  }

  arrived(planet) {
    const { w } = this;
    for (const { mission, reward } of this.cargo.arrive(planet.key)) {
      w.log.award({ title: `Kirim ${mission.title}`, reward });
    }
    this.cargo.refreshOffers(w.save.galaxySeed, planet, planet.systemIndex ?? w.save.systemIndex);
    this.rescue.onArrive(planet.key, w.player);
    this.changed();
  }

  departed() { this.board.toggle(false); this.changed(); }

  track() {
    const box = el('div', 'mis-group');
    const r = rescueTrack(this.rescue.active), c = cargoTrack(this.cargo, this.hold());
    if (r) box.append(r);
    if (c) box.append(c);
    return box.childElementCount ? box : null;
  }

  journal() {
    const box = el('div', 'mis-group');
    if (this.rescue.active) box.append(rescueCard(this.rescue.active));
    for (const m of this.cargo.active) box.append(cargoCard(m));
    const saved = savedCard(this.rescue.s.saved);
    if (saved) box.append(saved);
    if (this.w.planet && !this.cargo.active.length) box.append(el('div', 'q-text mis-hint', 'O: papan kargo planet ini'));
    return box.childElementCount ? box : null;
  }
}
