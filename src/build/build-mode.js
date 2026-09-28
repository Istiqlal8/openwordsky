// Build mode (Y on foot): a ghost of the chosen piece in front of the player that snaps to the
// pieces already built; click/Enter/T places it (paying its cost), X removes the piece you aim
// at (half refund), Z undoes the last one (full refund), C paints it.
import { hub } from './hub.js';
import { BuildKeys } from './build-keys.js';
import { BEACON, CATEGORIES, piecesIn, pieceOf } from './pieces.js';
import { TINT_COUNT, tintName } from './palette.js';
import { planPiece, pieceNear } from './placement.js';
import { buildGhost, buildSnapMark, disposeGroup } from './base-mesh.js';
import { placeSound, removeSound, placeDust } from './build-sfx.js';
import { have, affordable, pay } from '../craft/recipes.js';
import { BuildBar } from '../ui/build-bar.js';

const HINTS = [['1–0 / Roda', 'Pilih'], ['Q / E', 'Kategori'], ['R', 'Putar'], ['C', 'Warna'],
  ['Klik / T', 'Pasang'], ['X', 'Hapus'], ['Z', 'Batalkan'], ['Y', 'Selesai']];

export class BuildMode {
  constructor(site) {
    this.site = site; // BaseSite: base, surface, mats, ground(), add(piece), removeAt(i)
    this.active = false;
    this.catIdx = 0;
    this.sel = 0;
    this.rot = 0;
    this.tint = 0;
    this.placed = 0; // pieces added this session (what Z may undo)
    this.ghost = null;
    this.ghostKey = '';
    this.spot = null;
    this.keys = new BuildKeys();
    this.mark = buildSnapMark(site.mats.mark);
    site.surface.scene.add(this.mark);
    this.bar = new BuildBar(hub.wiring.panel.journal.parentNode, {
      pick: (i) => this.keys.queue.push({ op: 'pick', n: i }),
      cat: (i) => { this.catIdx = i; this.sel = 0; },
      op: (op) => this.keys.queue.push({ op }),
    });
  }

  get items() { return this.site.base ? piecesIn(CATEGORIES[this.catIdx][0]) : [BEACON]; }
  get piece() { return this.items[Math.min(this.sel, this.items.length - 1)]; }

  toggle() { if (this.active) this.exit(); else this.enter(); }

  enter() {
    this.active = hub.active = true;
    this.placed = 0;
    this.keys.take();
    this.bar.show(true);
    const hints = hub.wiring.hud?.hints;
    this.savedHints = hints ? [...hints.children] : null;
    hub.wiring.hud.setHints(HINTS);
    if (!this.site.base) hub.wiring.hud.toast('Pasang Suar Markas untuk mengklaim markas di planet ini');
  }

  exit() {
    this.active = hub.active = false;
    this.bar.show(false);
    this.setGhost(null);
    this.mark.visible = false;
    if (this.savedHints) hub.wiring.hud.hints.replaceChildren(...this.savedHints);
  }

  update(input) {
    for (const o of this.keys.take()) this.run(o);
    if (!this.active) return;
    if (input.pressed('KeyT')) { input.justPressed.delete('KeyT'); this.place(); }
    this.aim();
    this.drawBar();
  }

  run({ op, n }) {
    const count = this.items.length;
    if (op === 'pick' && n < count) this.sel = n;
    else if (op === 'cycle') this.sel = (this.sel + n + count) % count;
    else if (op === 'cat') { this.catIdx = (this.catIdx + n + CATEGORIES.length) % CATEGORIES.length; this.sel = 0; }
    else if (op === 'rotate') this.rot = (this.rot + 1) % 4;
    else if (op === 'paint') this.tint = (this.tint + 1) % TINT_COUNT;
    else if (op === 'place') this.place();
    else if (op === 'remove') this.remove();
    else if (op === 'undo') this.undo();
    else if (op === 'exit') this.exit();
  }

  // Aim point: in front of the feet, nearer when looking down.
  aim() {
    const s = this.site.surface, f = s.feet;
    const dist = Math.max(3, Math.min(14, 7 + s.pitch * 8));
    this.aimAt = { x: f.x - Math.sin(s.yaw) * dist, z: f.z - Math.cos(s.yaw) * dist };
    this.spot = planPiece(this.piece.id, this.rot, this.aimAt.x, this.aimAt.z, this.site.base, this.site.ground);
    this.setGhost(this.piece.id);
    const ok = this.spot.ok && affordable(hub.wiring.player, this.piece.cost);
    this.ghost.position.set(this.spot.x, this.spot.y, this.spot.z);
    this.ghost.rotation.y = this.spot.rot * Math.PI / 2;
    for (const m of this.ghost.children) m.material = ok ? this.site.mats.ghostOk : this.site.mats.ghostBad;
    this.showMark(this.spot.anchor);
  }

  // Square highlight under the piece the ghost snapped to.
  showMark(anchor) {
    this.mark.visible = Boolean(anchor);
    if (anchor) this.mark.position.set(anchor.x, anchor.y + 0.12, anchor.z);
  }

  setGhost(type) {
    const key = `${type}:${this.tint}`;
    if (key === this.ghostKey) return;
    disposeGroup(this.ghost);
    this.ghost = type ? buildGhost(type, this.tint, this.site.mats.ghostOk) : null;
    this.ghostKey = type ? key : '';
    if (this.ghost) this.site.surface.scene.add(this.ghost);
  }

  place() {
    const p = hub.wiring.player, piece = this.piece, s = this.spot;
    if (!s) return;
    if (!s.ok) return this.say(s.why);
    if (!affordable(p, piece.cost)) return this.say(`Bahan belum cukup untuk ${piece.name}`);
    pay(p, piece.cost);
    this.site.add({ type: piece.id, x: s.x, y: s.y, z: s.z, rot: s.rot, data: this.tint ? { tint: this.tint } : null });
    this.placed++;
    p.emit('act', { type: 'build', item: piece.id });
    placeSound(hub.wiring.sfx);
    placeDust(this.site.ctx.fx, s.x, s.y, s.z);
    if (piece === BEACON) { this.sel = 0; this.say('Markas diklaim! Pilih bagian untuk dibangun'); }
  }

  remove() {
    const base = this.site.base;
    const i = base && this.aimAt ? pieceNear(base.pieces, this.aimAt.x, this.aimAt.z) : -1;
    if (i < 0) return this.say(base?.pieces.length > 1 ? 'Arahkan ke bagian yang mau dihapus' : 'Tidak ada yang bisa dihapus');
    const piece = this.drop(i, 0.5);
    this.say(i === 0 ? 'Markas dibongkar' : `${piece.name} dibongkar · setengah bahan kembali`);
  }

  undo() {
    const pieces = this.site.base?.pieces;
    if (!this.placed || !pieces?.length) return this.say('Tidak ada yang bisa dibatalkan');
    this.placed--;
    const piece = this.drop(pieces.length - 1, 1);
    this.say(`${piece.name} dibatalkan · bahan kembali`);
  }

  // Removes piece i and pays back `share` of its cost.
  drop(i, share) {
    const p = this.site.base.pieces[i], piece = pieceOf(p.type);
    for (const line of piece.cost) {
      const back = Math.floor(line.n * share);
      if (back) hub.wiring.player.addItem(line.any[0], back);
    }
    this.site.removeAt(i);
    removeSound(hub.wiring.sfx);
    placeDust(this.site.ctx.fx, p.x, p.y, p.z);
    return piece;
  }

  say(text) { hub.wiring.hud.toast(text); }

  drawBar() {
    const p = hub.wiring.player, s = this.spot, piece = this.piece;
    const items = this.items.map((it) => ({ name: it.name, ok: affordable(p, it.cost),
      cost: it.cost.map((l) => ({ label: l.label, have: Math.floor(have(p, l)), n: l.n })) }));
    const count = this.site.base ? `${this.site.base.pieces.length} bagian` : 'Belum diklaim';
    this.bar.draw({ title: `Bangun · ${count}`, sel: this.sel, items, cats: CATEGORIES.map(([, n]) => n),
      cat: this.site.base ? this.catIdx : -1, bad: !s?.ok,
      status: s?.ok ? `${piece.name} · ${this.rot * 90}° · cat ${tintName(this.tint)}${s.anchor ? ' · menempel' : ''}` : s?.why ?? '' });
  }

  dispose() {
    if (this.active) this.exit();
    this.keys.dispose();
    this.mark.geometry.dispose();
    this.mark.parent?.remove(this.mark);
    this.bar.root.remove();
  }
}
