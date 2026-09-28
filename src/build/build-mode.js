// Build mode (Y on foot): a ghost of the chosen piece in front of the player, snapped to the
// base grid; click/Enter/T places it (paying its cost), X removes the piece aimed at (half refund).
// The first piece on a planet is always the Suar Markas that claims the base.
import { hub } from './hub.js';
import { BuildKeys } from './build-keys.js';
import { BEACON, PIECES, pieceOf } from './pieces.js';
import { planPiece, pieceNear } from './placement.js';
import { buildGhost, disposeGroup } from './base-mesh.js';
import { have, affordable, pay } from '../craft/recipes.js';
import { BuildBar } from '../ui/build-bar.js';
import { SURFACE_HINTS } from '../game/surface-mode.js';

const HINTS = [['1–0 / Roda', 'Pilih'], ['R', 'Putar'], ['Klik / T', 'Pasang'], ['X', 'Hapus'], ['Y', 'Selesai']];

export class BuildMode {
  constructor(site) {
    this.site = site; // BaseSite: base, surface, mats, ground(), add(piece), removeAt(i)
    this.active = false;
    this.sel = 0;
    this.rot = 0;
    this.ghost = null;
    this.ghostType = null;
    this.spot = null;
    this.keys = new BuildKeys();
    const root = hub.wiring.panel.journal.parentNode;
    this.bar = new BuildBar(root, { pick: (i) => this.keys.queue.push({ op: 'pick', n: i }), op: (op) => this.keys.queue.push({ op }) });
  }

  get items() { return this.site.base ? PIECES : [BEACON]; }
  get type() { return this.items[Math.min(this.sel, this.items.length - 1)].id; }

  toggle() { if (this.active) this.exit(); else this.enter(); }

  enter() {
    this.active = hub.active = true;
    this.keys.take();
    this.bar.show(true);
    hub.wiring.hud.setHints(HINTS);
    if (!this.site.base) hub.wiring.hud.toast('Pasang Suar Markas untuk mengklaim markas di planet ini');
  }

  exit() {
    this.active = hub.active = false;
    this.bar.show(false);
    this.setGhost(null);
    hub.wiring.hud.setHints(SURFACE_HINTS);
  }

  update(input) {
    for (const o of this.keys.take()) this.run(o);
    if (!this.active) return;
    if (input.pressed('KeyT')) { input.justPressed.delete('KeyT'); this.run({ op: 'place' }); }
    this.aim();
    this.drawBar();
  }

  run({ op, n }) {
    const count = this.items.length;
    if (op === 'pick' && n < count) this.sel = n;
    else if (op === 'cycle') this.sel = (this.sel + n + count) % count;
    else if (op === 'rotate') this.rot = (this.rot + 1) % 4;
    else if (op === 'place') this.place();
    else if (op === 'remove') this.remove();
    else if (op === 'exit') this.exit();
  }

  // Aim point: in front of the feet, nearer when looking down.
  aim() {
    const s = this.site.surface, f = s.feet;
    const dist = Math.max(3, Math.min(14, 7 + s.pitch * 8));
    const x = f.x - Math.sin(s.yaw) * dist, z = f.z - Math.cos(s.yaw) * dist;
    this.aimAt = { x, z };
    this.spot = planPiece(this.type, this.rot, x, z, this.site.base, this.site.ground);
    if (this.ghostType !== this.type) this.setGhost(this.type);
    const ok = this.spot.ok && affordable(hub.wiring.player, pieceOf(this.type).cost);
    this.ghost.position.set(this.spot.x, this.spot.y, this.spot.z);
    this.ghost.rotation.y = this.rot * Math.PI / 2;
    for (const m of this.ghost.children) m.material = ok ? this.site.mats.ghostOk : this.site.mats.ghostBad;
  }

  setGhost(type) {
    disposeGroup(this.ghost);
    this.ghost = type ? buildGhost(type, this.site.mats.ghostOk) : null;
    this.ghostType = type;
    if (this.ghost) this.site.surface.scene.add(this.ghost);
  }

  place() {
    const p = hub.wiring.player, piece = pieceOf(this.type), s = this.spot;
    if (!s) return;
    if (!s.ok) return this.say(s.why);
    if (!affordable(p, piece.cost)) return this.say(`Bahan belum cukup untuk ${piece.name}`);
    pay(p, piece.cost);
    this.site.add({ type: piece.id, x: s.x, y: s.y, z: s.z, rot: this.rot, data: null });
    p.emit('act', { type: 'build', item: piece.id });
    hub.wiring.sfx.pickup?.();
    if (piece === BEACON) { this.sel = 0; this.say('Markas diklaim! Pilih bagian untuk dibangun'); }
  }

  remove() {
    const base = this.site.base;
    const i = base && this.aimAt ? pieceNear(base.pieces, this.aimAt.x, this.aimAt.z) : -1;
    if (i < 0) return this.say(base?.pieces.length > 1 ? 'Arahkan ke bagian yang mau dihapus' : 'Tidak ada yang bisa dihapus');
    const piece = pieceOf(base.pieces[i].type);
    for (const line of piece.cost) if (line.n >= 2) hub.wiring.player.addItem(line.any[0], Math.floor(line.n / 2));
    this.site.removeAt(i);
    this.say(i === 0 ? 'Markas dibongkar' : `${piece.name} dibongkar · setengah bahan kembali`);
  }

  say(text) { hub.wiring.hud.toast(text); }

  drawBar() {
    const p = hub.wiring.player, s = this.spot;
    const items = this.items.map((it) => ({ name: it.name, ok: affordable(p, it.cost),
      cost: it.cost.map((l) => ({ label: l.label, have: Math.floor(have(p, l)), n: l.n })) }));
    const count = this.site.base ? `${this.site.base.pieces.length} bagian` : 'Belum diklaim';
    this.bar.draw({ title: `Bangun · ${count}`, sel: this.sel, items,
      status: s?.ok ? `${pieceOf(this.type).name} · putaran ${this.rot * 90}°` : s?.why ?? '', bad: !s?.ok });
  }

  dispose() {
    if (this.active) this.exit();
    this.keys.dispose();
    this.bar.root.remove();
  }
}
