// World addon: the player's base on this planet. Rebuilds the saved pieces on landing, runs
// build mode (Y), makes floors and walls physical, and handles T at planters, pens and stations.
import { hub, bases, changed } from './hub.js';
import { pieceOf } from './pieces.js';
import { makeMaterials, buildBaseMesh, disposeGroup } from './base-mesh.js';
import { BaseCollide } from './base-collide.js';
import { BaseLife, cropStage, ripe, GROW_STAGE } from './base-life.js';
import { Stations } from './stations.js';
import { BuildMode } from './build-mode.js';
import { teleportSound } from './build-sfx.js';
import { curveScene } from '../view/curvature.js';

const USE_REACH = 3.2;
const REFRESH = 5; // seconds between journal refreshes while crops grow

export class BaseSite {
  constructor(ctx) {
    this.ctx = ctx;
    this.planet = ctx.planet;
    this.surface = ctx.surface;
    if (!hub.wiring || !this.planet?.key) return; // not wired (e.g. isolated tests)
    this.base = bases()[this.planet.key] ?? null;
    this.mats = makeMaterials();
    this.collide = new BaseCollide(this.surface);
    this.ground = this.collide.ground;
    this.life = new BaseLife(ctx, this.planet.palette);
    this.stations = new Stations(ctx);
    this.mode = new BuildMode(this);
    this.onKey = (e) => { if (this.stations.key(e.code, e.shiftKey)) e.stopPropagation(); };
    addEventListener('keydown', this.onKey, true);
    this.group = null;
    this.near = null;
    this.tick = 0;
    hub.site = this;
    this.rebuild();
    this.parkOnPad();
    this.arriveOnPad();
  }

  get pieces() { return this.base?.pieces ?? []; }

  // A landing pad in the base is where the ship waits when you arrive.
  parkOnPad() {
    const pad = this.pieces.find((p) => p.type === 'landasan');
    if (pad && this.surface.landed) this.stations.park(pad);
  }

  // Landing right after a teleport: stand on the pad. Otherwise just point the base out.
  arriveOnPad() {
    const want = hub.arriveAt;
    hub.arriveAt = null;
    const b = this.pieces[0];
    if (!b) return;
    if (want?.key === this.planet.key) {
      const s = this.surface;
      s.feet.set(want.x, s.floorAt(want.x, want.z + 1.6), want.z + 1.6);
      s.velY = 0;
      s.updateCamera(0);
      teleportSound(hub.wiring.sfx);
      hub.wiring.hud.toast('Teleport selesai');
      return;
    }
    const d = Math.round(Math.hypot(b.x - this.surface.feet.x, b.z - this.surface.feet.z));
    if (d > 30) hub.wiring.hud.toast(`Markasmu di planet ini: ${d} m (ikuti cahaya jingga)`);
  }

  add(piece) {
    if (piece.type === 'suar') {
      this.base = bases()[this.planet.key] = { name: this.planet.name, sys: this.planet.systemIndex, pieces: [piece] };
    } else this.base.pieces.push(piece);
    this.rebuild();
  }

  removeAt(i) {
    if (i === 0) { delete bases()[this.planet.key]; this.base = null; } else this.base.pieces.splice(i, 1);
    this.rebuild();
  }

  rebuild() {
    disposeGroup(this.group);
    this.group = this.base ? buildBaseMesh(this.pieces, this.mats) : null;
    if (this.group) { curveScene(this.group); this.surface.scene.add(this.group); }
    this.collide.setPieces(this.pieces);
    this.life.sync(this.pieces);
    changed();
  }

  update(dt, alive) {
    const input = hub.input;
    if (!this.mode || !input) return;
    this.collide.update();
    this.life.update(dt, this.pieces);
    if ((this.tick += dt) > REFRESH) { this.tick = 0; if (this.pieces.some((p) => p.data?.seed)) changed(); }
    const onFoot = alive && !this.surface.flying;
    if (this.mode.active && !onFoot) this.mode.exit();
    if (this.stations.isOpen) { if (this.stations.stale) this.stations.close(); return; }
    if (onFoot && input.pressed('KeyY')) this.mode.toggle();
    if (this.mode.active) this.mode.update(input);
    else if (onFoot) this.useNearby(input);
  }

  // Prompt once when walking up to a station; T uses it (and stops the game's own T).
  useNearby(input) {
    const f = this.surface.feet;
    const p = this.pieces.find((q) => pieceOf(q.type)?.act && Math.hypot(q.x - f.x, q.z - f.z) < USE_REACH);
    if (p !== this.near) { this.near = p; if (p) hub.wiring.hud.toast(`[T] ${prompt(p)}`); }
    if (!p || !input.pressed('KeyT')) return;
    input.justPressed.delete('KeyT');
    const text = p.type === 'kebun' || p.type === 'kandang'
      ? this.life.act(p, hub.wiring.player)
      : this.stations.act(p, hub.wiring.player);
    if (text) hub.wiring.hud.toast(text);
    changed();
  }

  dispose() {
    if (!this.mode) return;
    removeEventListener('keydown', this.onKey, true);
    this.mode.dispose();
    this.stations.dispose();
    this.life.dispose();
    this.collide.dispose();
    disposeGroup(this.group);
    for (const m of Object.values(this.mats)) m.dispose();
    if (hub.site === this) hub.site = null;
    this.mode = null;
  }
}

function prompt(p) {
  const d = p.data;
  if (p.type === 'kandang') return d?.animal ? `Kandang: ambil hasil ${d.animal.name}` : 'Kandang: pancing hewan (1 Protein Fauna)';
  if (p.type === 'bengkel') return 'Bengkel: buka panel racik';
  if (p.type === 'loker') return 'Loker: simpan / ambil barang';
  if (p.type === 'landasan') return 'Landasan: panggil pesawat ke sini';
  if (p.type === 'teleport') return 'Pad teleport: pilih markas tujuan';
  if (!d?.seed) return 'Kebun: tanam bibit';
  if (ripe(d)) return `Kebun: panen ${d.seed}`;
  return `Kebun: ${d.seed} tahap ${cropStage(d)}/3 (${Math.ceil((GROW_STAGE * 3 - d.g) / 60)} mnt lagi)`;
}
