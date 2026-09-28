// Manual stations in a base: the workbench opens the crafting panel, the locker moves items by
// hand, the landing pad parks your ship and the teleport pad travels to another of your bases.
import { hub, bases } from './hub.js';
import { BuildList } from '../ui/build-list.js';
import { lockerView } from './locker.js';
import { teleportView } from './teleport-view.js';

export class Stations {
  constructor(ctx) {
    this.ctx = ctx;
    this.piece = null;
    this.mode = null; // 'loker' | 'teleport'
    this.sel = 0;
    this.panel = new BuildList(hub.wiring.panel.journal.parentNode, {
      pick: (i, all) => this.pick(i, all),
      close: () => this.close(),
    });
  }

  get isOpen() { return this.panel.isOpen; }

  // The player clicked back into the game (pointer locked again): drop the panel.
  get stale() { return this.isOpen && hub.input?.locked && performance.now() - this.openedAt > 600; }

  // T at a station -> notice text (panels open silently).
  act(piece, player) {
    if (piece.type === 'bengkel') return hub.openCraft ? (hub.openCraft(), null) : 'Bengkel belum siap';
    if (piece.type === 'landasan') return this.park(piece);
    this.piece = piece;
    this.mode = piece.type;
    this.sel = 0;
    this.panel.show(true);
    this.openedAt = performance.now();
    hub.input?.unlock?.();
    this.refresh();
    return null;
  }

  close() {
    this.panel.show(false);
    this.piece = null;
    this.mode = null;
    hub.input?.lock?.();
  }

  // Calls the ship down onto the pad.
  park(piece) {
    const landed = this.ctx.surface.landed;
    if (!landed) return 'Pesawatmu tidak ada di planet ini';
    const g = landed.model.group;
    g.position.set(piece.x, piece.y + 0.4 + landed.model.groundOffset - 0.15, piece.z);
    g.rotation.set(0, piece.rot * Math.PI / 2, 0);
    this.ctx.sfx?.land?.();
    return 'Pesawat diparkir di landasan';
  }

  rows() {
    const player = hub.wiring.player;
    return this.mode === 'loker' ? lockerView(this.piece, player) : teleportView(this.ctx.planet, bases(), player);
  }

  refresh() {
    if (!this.isOpen) return;
    const rows = this.rows();
    this.sel = Math.min(this.sel, Math.max(0, rows.length - 1));
    const loker = this.mode === 'loker';
    this.panel.draw({ title: loker ? 'Loker Markas' : 'Pad Teleport', sel: this.sel, rows,
      hint: 'T/Esc tutup · 1–9 pilih · Enter pindah · Shift semua',
      note: loker ? 'Klik barang untuk memindahkannya.' : 'Pilih markas tujuan.' });
  }

  pick(i, all) {
    const rows = this.rows();
    const row = rows[i];
    this.sel = i;
    if (!row || row.ok === false) return;
    if (row.travel) this.close(); // travelling tears this base down, so let go of it first
    const text = row.run(all);
    if (text) hub.wiring.hud.toast(text);
    if (!row.travel) this.refresh();
  }

  // Panel keys while it is open (the game is paused with the mouse free).
  key(code, shift) {
    if (!this.isOpen) return false;
    const rows = this.rows();
    if (code === 'Escape' || code === 'KeyT') this.close();
    else if (code === 'ArrowUp') this.sel = (this.sel + rows.length - 1) % Math.max(1, rows.length);
    else if (code === 'ArrowDown') this.sel = (this.sel + 1) % Math.max(1, rows.length);
    else if (/^Digit[1-9]$/.test(code) && Number(code[5]) <= rows.length) this.sel = Number(code[5]) - 1;
    else if (code === 'Enter' || code === 'NumpadEnter') this.pick(this.sel, shift);
    else return false;
    this.refresh();
    return true;
  }

  dispose() {
    this.panel.root.remove();
  }
}
