// Per-landing weapon runtime: viewmodel, fire modes, projectiles, freeze, heat and the weapon HUD.
// Owned/equipped state comes from the session-long Arsenal.
import { ViewModel } from './viewmodel.js';
import { WeaponHits } from './weapon-hits.js';
import { WeaponFire } from './weapon-fire.js';
import { Frost } from './frost.js';
import { WeaponHud } from './weapon-hud.js';
import { WEAPONS } from './catalog.js';
import { playWeaponSfx } from './weapon-sfx.js';

const SLOT_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'];
const UNLOCK_AT = 0.3; // overheated weapons unlock below this heat
const AIM_HOLD = 1.5;  // seconds the third-person arm stays raised after a shot

export class WeaponRig {
  // ctx: SurfaceGameplay ctx; sentinels() -> Sentinels; onDrone('hit' | 'kill') feeds the wanted meter.
  constructor(ctx, arsenal, sentinels, onDrone) {
    this.ctx = ctx;
    this.arsenal = arsenal;
    this.viewmodel = new ViewModel(ctx.surface);
    this.hits = new WeaponHits(ctx, sentinels, onDrone);
    this.frost = new Frost(ctx.surface.scene);
    this.fire = new WeaponFire(ctx, this.hits, this.viewmodel, this.frost);
    this.hud = new WeaponHud(typeof document !== 'undefined' ? document.getElementById('hud') : null);
    this.heat = Object.fromEntries(WEAPONS.map((w) => [w.id, { heat: 0, locked: false }]));
    this.sinceShot = 99;
    this.wheel = 0;
    this.onWheel = (e) => { if (document.pointerLockElement) this.wheel += Math.sign(e.deltaY); };
    addEventListener('wheel', this.onWheel, { passive: true });
    this.viewmodel.setWeapon(arsenal.equipped);
  }

  // Tool-mode (Multitool) muzzle for the mining beam and blaster.
  muzzle(out) { return this.viewmodel.muzzleWorld(out); }

  // Returns true while the Multitool is equipped and ready (caller runs mining + blaster).
  update(dt, input, alive) {
    const hidden = !alive || this.ctx.surface.flying;
    if (!hidden) this.switchKeys(input);
    this.viewmodel.setWeapon(this.arsenal.equipped);
    this.coolDown(dt);
    const spec = this.arsenal.weapon, st = this.heat[spec.id];
    const held = !hidden && input.mouseDown(0);
    const ready = !hidden && this.viewmodel.ready;
    const combat = spec.fire !== 'tool';
    if (combat && this.fire.update(dt, spec, ready && held, st)) this.sinceShot = 0;
    if (!combat) this.fire.update(dt, spec, false, st);
    this.checkHeat(st);
    this.sinceShot += dt;
    const aiming = this.sinceShot < AIM_HOLD || held || input.mouseDown(2);
    this.viewmodel.update(dt, input, { heat: st.heat, charge: this.fire.charge, aiming, hidden });
    this.hud.update({ owned: this.arsenal.owned, equipped: spec.id, heat: st.heat,
      charge: this.fire.charge, locked: st.locked, hidden });
    return !combat && ready;
  }

  switchKeys(input) {
    const i = input.uiCapture ? -1 : SLOT_KEYS.findIndex((k) => input.pressed(k)); // a panel owns 1–9
    let changed = i >= 0 && this.arsenal.equipSlot(i + 1);
    if (this.wheel) { changed = this.arsenal.cycle(this.wheel > 0 ? 1 : -1) || changed; this.wheel = 0; }
    if (changed) playWeaponSfx(this.ctx.sfx, 'equip');
  }

  coolDown(dt) {
    for (const w of WEAPONS) {
      const st = this.heat[w.id];
      st.heat = Math.max(0, st.heat - w.cool * dt);
      if (st.locked && st.heat < UNLOCK_AT) st.locked = false;
    }
  }

  checkHeat(st) {
    if (st.locked || st.heat < 1) return;
    st.heat = 1;
    st.locked = true;
    playWeaponSfx(this.ctx.sfx, 'overheat');
    this.ctx.player.emit('notice', { text: 'Senjata terlalu panas' });
  }

  // Multitool blaster / mining feedback on the viewmodel.
  toolShot(color) {
    this.viewmodel.fire(0.5, color);
    this.sinceShot = 0;
  }

  // After sentinels moved this frame: hold frozen targets in place.
  lateUpdate(dt) { this.frost.update(dt); }

  reset() {
    this.fire.reset();
    this.frost.clear();
  }

  dispose() {
    removeEventListener('wheel', this.onWheel);
    this.fire.dispose();
    this.frost.dispose();
    this.viewmodel.dispose();
    this.hud.dispose();
  }
}
