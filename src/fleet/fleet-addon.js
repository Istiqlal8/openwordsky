// Meta addon: frigate fleet expeditions. Y in space opens the board (the Kapal Induk's command
// deck); expeditions run on real time and report back here. State in log.s.fleet.
import { Fleet } from './fleet-state.js';
import { DURATIONS, TYPES } from './fleet-defs.js';
import { FleetBoard } from '../ui/fleet-board.js';
import { fleetTrack, fleetCard } from '../ui/fleet-view.js';

const KEY = 'KeyY';
const SEND = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];

export class FleetAddon {
  constructor(w) {
    this.w = w;
    this.fleet = new Fleet(w.log.s, w.save.galaxySeed);
    this.board = new FleetBoard(w.panel.tracker.parentNode);
    this.sel = 0;
    this.minutes = DURATIONS[1];
    this.reports = [];
    this.nextTick = 0;
    w.panel.sections.push({ journal: () => fleetCard(this.fleet, Date.now()), track: () => fleetTrack(this.fleet, Date.now()) });
  }

  update(input) {
    const now = Date.now();
    if (now >= this.nextTick) { this.nextTick = now + 1000; this.tick(now); }
    if (!this.w.planet && input.pressed(KEY)) this.toggle(now); // on foot Y belongs to build mode
    if (this.board.isOpen && (this.w.planet || this.w.panel.isOpen)) this.board.toggle(false);
    if (this.board.isOpen) this.keys(input, now);
  }

  // Once a second: announce finished expeditions and refresh the clocks.
  tick(now) {
    for (const e of this.fleet.newlyDone(now)) {
      const f = this.fleet.frigates.find((x) => x.id === e.frigate);
      this.w.hud.toast(`Ekspedisi selesai: ${f?.name ?? 'fregat'} · buka Armada (Y) di angkasa`);
      this.w.sfx.scan?.();
    }
    if (this.fleet.exps.length) this.w.log.version++;
    if (this.board.isOpen) { this.collect(now); this.draw(now); }
  }

  toggle(now) {
    if (this.w.panel.isOpen) this.w.panel.toggle();
    this.board.toggle();
    if (!this.board.isOpen) return;
    this.reports = [];
    this.collect(now);
    this.draw(now);
  }

  keys(input, now) {
    const n = this.fleet.frigates.length;
    let acted = true;
    if (input.pressed('ArrowUp')) this.sel = (this.sel + n - 1) % n;
    else if (input.pressed('ArrowDown')) this.sel = (this.sel + 1) % n;
    else if (input.pressed('ArrowLeft') || input.pressed('ArrowRight')) this.shiftDuration(input.pressed('ArrowRight') ? 1 : -1);
    else if (input.pressed('Enter')) this.say(this.fleet.repair(this.selected, (c) => this.pay(c)));
    else if (input.pressed('Digit5')) this.say(this.fleet.buy((c) => this.pay(c)));
    else {
      const i = SEND.findIndex((code) => input.pressed(code));
      if (i >= 0) this.say(this.fleet.send(this.selected, TYPES[i].id, this.minutes, now));
      else acted = false;
    }
    if (acted) { this.w.log.version++; this.draw(now); }
  }

  get selected() { return this.fleet.frigates[this.sel] ?? null; }

  shiftDuration(d) {
    const i = DURATIONS.indexOf(this.minutes);
    this.minutes = DURATIONS[(i + d + DURATIONS.length) % DURATIONS.length];
  }

  say(res) {
    this.w.hud.toast(res.text);
    if (res.ok) this.w.sfx.scan?.();
  }

  // cost = { nanit, items: [[name, n]] }; pays only when everything is there.
  pay(cost) {
    const p = this.w.player, need = [['Nanit', cost.nanit], ...cost.items];
    if (!need.every(([name, n]) => p.count(name) >= n)) return false;
    for (const [name, n] of need) p.removeItem(name, n);
    return true;
  }

  // Hands out every finished expedition's haul and keeps a short report for the board.
  collect(now) {
    for (const { frigate, exp, result, levelUp } of this.fleet.collect(now)) {
      const p = this.w.player;
      if (result.nanit) p.addItem('Nanit', result.nanit);
      for (const [name, n] of result.items) p.addItem(name, n);
      this.reports.unshift(reportText(frigate, exp, result, levelUp));
      this.w.hud.toast(`${frigate.name}: ${result.ok ? 'ekspedisi sukses' : 'kembali rusak'} · +${result.nanit} Nanit`);
      if (result.find) this.w.hud.toast(`Temuan langka: ${result.find}${result.where ? ` dari ${result.where}` : ''}`);
      this.w.player.emit('act', { type: 'fleet', ok: result.ok, expedition: exp.type });
    }
    this.reports = this.reports.slice(0, 4);
  }

  draw(now) {
    this.sel = Math.min(this.sel, this.fleet.frigates.length - 1);
    this.board.draw({ fleet: this.fleet, sel: this.sel, minutes: this.minutes, now, reports: this.reports });
  }

  departed() {}
  arrived() { this.board.toggle(false); }
}

function reportText(f, exp, r, levelUp) {
  const t = TYPES.find((x) => x.id === exp.type)?.label ?? exp.type;
  const loot = [`${r.nanit} Nanit`, ...r.items.map(([n, k]) => `${k} ${n}`)].join(', ');
  const tail = [r.ok ? '' : 'fregat rusak', levelUp ? `naik ke Lv ${f.level}` : ''].filter(Boolean).join(' · ');
  return `${f.name} (${t}, ${exp.minutes} mnt): ${r.ok ? 'sukses' : 'gagal'} · ${loot}${tail ? ` · ${tail}` : ''}`;
}
