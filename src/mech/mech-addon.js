// Meta addon (src/game/addons.js): owns the ship <-> mech toggle, the energy drain, the HUD and
// the persistence flag. Meta addons receive the input and run after the space/surface views, so
// the mech can take over the camera for the frame that is about to be rendered.
import { mechLink } from './mech-link.js';
import { mechPilot } from './mech-pilot.js';
import { mechFor } from './mech-cache.js';
import { MechSpace } from './mech-space.js';
import { MechSurface } from './mech-surface.js';
import { MechHud } from '../ui/mech-hud.js';
import { UNLIMITED, ENTER_COST, RESTORE_COST, DRAIN_SPACE, DRAIN_GROUND, canAfford, drain } from './mech-power.js';

export const MECH_KEY = 'Period';
const NOOP = () => {};

export class MechAddon {
  constructor(w) {
    this.w = w;
    this.hud = new MechHud(typeof document !== 'undefined' ? document.getElementById('hud') : null);
    this.state = (w.log.s.mech ??= { greeted: false, wasMech: false });
    this.last = performance.now();
    this.space = new MechSpace({ space: null, player: w.player, sfx: w.sfx });
    this.ground = new MechSurface({ player: w.player, sfx: w.sfx });
    this.restored = false;
    const off = () => this.abort();
    w.player.on('shipDestroyed', off);
    w.player.on('playerDied', off);
    w.player.on('respawn', off);
    w.player.on('kill', () => { if (this.active) w.player.emit('act', { type: 'mech' }); });
  }

  get app() { return this.w.app ?? null; } // src/game/app.js: a.quests.app = a
  get active() { return this.space.active || this.ground.active; }

  update(input) {
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const app = this.app;
    if (!app) return;
    const mode = app.game.mode;
    if (mode === 'space') this.tickSpace(dt, input, app);
    else if (mode === 'surface') this.tickSurface(dt, input, app);
    else this.abort();
    mechPilot.active = this.active;
    mechPilot.where = this.active ? mode : null;
    this.draw(app);
  }

  // ---- space ----
  tickSpace(dt, input, app) {
    if (this.ground.active) this.ground.detach();
    this.space.space = app.space;
    const combat = app.spaceMode?.combat;
    if (this.space.active && app.game.design !== this.design) { this.abort(); return; }
    if (input.pressed(MECH_KEY) && !this.space.busy) this.toggleSpace(app, combat);
    else if (!this.space.active && !this.restored) this.restore(app, combat);
    this.suppress(combat, this.space.active);
    if (this.space.active && this.space.tr.t >= 1 && !this.drain(dt, DRAIN_SPACE)) this.space.leave();
    this.space.update(dt, input, combat);
  }

  toggleSpace(app, combat) {
    if (this.space.active) { this.space.leave(); this.state.wasMech = false; return; }
    if (!canAfford(this.w.player.ship, ENTER_COST)) { this.w.hud.toast('Energi kurang untuk transformasi'); return; }
    this.design = app.game.design;
    this.space.enter(mechFor(this.design), combat);
    this.announce();
    this.state.wasMech = true;
  }

  // Last session ended inside the mech: deploy again, already unfolded.
  restore(app, combat) {
    this.restored = true;
    if (!this.state.wasMech || !canAfford(this.w.player.ship, RESTORE_COST)) return;
    this.design = app.game.design;
    this.space.enter(mechFor(this.design), combat);
    this.space.tr.finish(true);
  }

  // The ship's own guns stand down while the mech carries its own arsenal.
  suppress(combat, on) {
    const w = combat?.weapons;
    if (!w) return;
    if (on && !w.mechOff) { w.mechOff = true; w.update = NOOP; w.battery?.clear(); }
    else if (!on && w.mechOff) { w.mechOff = false; delete w.update; }
  }

  // ---- surface ----
  tickSurface(dt, input, app) {
    if (this.space.active) this.space.detach();
    const ctx = mechLink.ctx;
    if (!ctx || !ctx.surface?.planet) { if (this.ground.active) this.ground.detach(); return; }
    if (this.ground.active && app.game.design !== this.design) { this.abort(); return; }
    if (input.pressed(MECH_KEY) && !this.ground.busy) this.toggleGround(app, ctx);
    if (this.ground.active && this.ground.tr.t >= 1 && !this.drain(dt, DRAIN_GROUND)) this.ground.leave();
    this.ground.update(dt, input);
    this.hint(ctx);
  }

  toggleGround(app, ctx) {
    if (this.ground.active) { this.ground.leave(); return; }
    if (!this.ground.canEnter(ctx.surface)) { this.w.hud.toast('Dekati pesawatmu untuk memanggil Mech'); return; }
    if (!canAfford(this.w.player.ship, ENTER_COST)) { this.w.hud.toast('Energi kurang untuk transformasi'); return; }
    this.design = app.game.design;
    this.ground.enter(mechFor(this.design), ctx);
    this.announce();
  }

  // One-off nudge the first time the player stands next to their ship on a planet.
  hint(ctx) {
    if (this.state.greeted || this.active || !this.ground.canEnter(ctx.surface)) return;
    this.state.greeted = true;
    this.w.hud.toast('Tekan . di dekat pesawat untuk berubah menjadi Mech');
  }

  // ---- shared ----
  announce() {
    const m = this.design;
    this.w.hud.toast(`Mech aktif: ${m?.name ?? 'Rangka'} · roda/1-6 ganti senjata · klik tengah pedang · . kembali`);
    this.w.sfx.scan?.();
    this.w.player.emit('act', { type: 'mech' });
  }

  // Returns false when the reactor runs dry (always true while mech-power.js is UNLIMITED).
  drain(dt, rate) {
    if (drain(this.w.player.ship, rate, dt)) return true;
    this.w.hud.toast('Energi mech habis — kembali ke pesawat');
    return false;
  }

  // Immediate fold-away: death, respawn, a ship swap or leaving the play mode.
  abort() {
    if (this.space.active) this.space.detach();
    if (this.ground.active) this.ground.detach();
    this.suppress(this.app?.spaceMode?.combat, false); // never leave the ship's guns muted
  }

  draw(app) {
    const ctl = this.space.active ? this.space : this.ground.active ? this.ground : null;
    if (!ctl) { this.hud.update({ on: false }); return; }
    const mech = ctl.mech;
    this.hud.update({ on: true, name: mech?.design.name ?? 'Mech', label: mech?.design.label ?? '',
      energy: UNLIMITED ? 1 : this.w.player.ship.energy / 100, unlimited: UNLIMITED,
      weapon: ctl.weapon, wp: ctl.weaponHud,
      lock: this.space.active && Boolean(app.spaceMode?.combat?.lockTarget) });
  }

  departed() {
    if (this.ground.active) this.ground.detach();
  }
}
