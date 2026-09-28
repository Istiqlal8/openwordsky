// Which mech weapon is selected and what state it is in: spin-up, charge, heat, magazine.
// Shared by the space and the surface gun controllers so both feel identical. No three.js here.
//
// Controls (chosen so nothing the rest of the game claims is touched):
//   mouse wheel  cycle the mech weapon — the on-foot weapon rig is hidden while piloting, so the
//                wheel is free, and the hand never leaves the mouse during a fight
//   1..6         jump straight to a mode (the on-foot rig owns these only while on foot)
//   RMB          missile pod, always;  MMB  beam saber combo, always
import { MODES, MODE_COUNT, RIFLE, SABER, modeById, modeIndex, cycleMode } from './mech-weapons.js';

const SLOTS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];
const SWAP_LOCK = 0.22;    // seconds the arms need to bring the next weapon up
const UNLOCK_AT = 0.35;    // overheated weapons come back below this

export class Loadout {
  constructor(onSwap) {
    this.onSwap = onSwap;
    this.id = RIFLE;
    this.swapT = 0;
    this.spin = 0;
    this.charge = 0;
    this.wheel = 0;
    this.state = {};
    for (const m of MODES) this.state[m.id] = { heat: 0, locked: false, ammo: m.ammo ?? 0, reload: 0 };
    this.onWheel = (e) => { if (document.pointerLockElement) this.wheel += Math.sign(e.deltaY); };
    if (typeof addEventListener === 'function') addEventListener('wheel', this.onWheel, { passive: true });
  }

  get mode() { return modeById(this.id); }
  get st() { return this.state[this.id]; }
  get swapping() { return this.swapT > 0; }

  select(id) {
    if (id === this.id) return false;
    this.id = id;
    this.swapT = SWAP_LOCK;
    this.spin = 0;
    this.charge = 0;
    this.onSwap?.(this.mode);
    return true;
  }

  // Wheel and number keys. `capture` mutes them while a panel owns the keyboard.
  switchKeys(input, capture) {
    let changed = false;
    if (this.wheel) { changed = this.select(cycleMode(this.id, this.wheel > 0 ? 1 : -1)); this.wheel = 0; }
    if (capture) return changed;
    for (let i = 0; i < SLOTS.length && i < MODE_COUNT; i++) {
      if (input.pressed(SLOTS[i])) changed = this.select(MODES[i].id) || changed;
    }
    return changed;
  }

  // firing: trigger held for the selected mode this frame.
  update(dt, input, firing, capture = false) {
    this.switchKeys(input, capture);
    this.swapT = Math.max(0, this.swapT - dt);
    const m = this.mode;
    this.spinTick(dt, m, firing);
    this.chargeTick(dt, m, firing);
    for (const k in this.state) this.tickOne(dt, modeById(k), this.state[k]);
  }

  spinTick(dt, m, firing) {
    if (!m.spinUp) { this.spin = 0; return; }
    const rate = firing && !this.swapping ? dt / m.spinUp : -dt / m.spinDown;
    this.spin = Math.max(0, Math.min(1, this.spin + rate));
  }

  chargeTick(dt, m, firing) {
    if (!m.charge) { this.charge = 0; return; }
    const st = this.st;
    const up = firing && !this.swapping && !st.locked;
    this.charge = Math.max(0, Math.min(1, this.charge + (up ? dt / m.charge : -dt / 0.35)));
  }

  tickOne(dt, m, st) {
    if (m.cool) st.heat = Math.max(0, st.heat - m.cool * dt);
    if (st.locked && st.heat < UNLOCK_AT) st.locked = false;
    if (!st.reload) return;
    st.reload = Math.max(0, st.reload - dt);
    if (st.reload === 0) st.ammo = m.ammo;
  }

  // True when the selected mode may actually put a shot out this frame.
  get ready() {
    const m = this.mode, st = this.st;
    if (this.swapping || st.locked || st.reload > 0) return false;
    if (m.ammo && st.ammo <= 0) return false;
    if (m.spinUp && this.spin < 1) return false;
    if (m.charge && this.charge < 1) return false;
    return true;
  }

  // Call right after a shot leaves the barrel. Returns true if it overheated on this one.
  spend(id = this.id, amount = 1) {
    const m = modeById(id), st = this.state[id];
    if (m.ammo) {
      st.ammo = Math.max(0, st.ammo - amount);
      if (st.ammo === 0) st.reload = m.reload;
    }
    if (!m.heat) return false;
    st.heat = Math.min(1, st.heat + m.heat * amount);
    if (st.heat < 1 || st.locked) return false;
    st.locked = true;
    return true;
  }

  // Whether a mode that is not the selected one (the RMB pod) may fire right now.
  canFire(id) {
    const m = modeById(id), st = this.state[id];
    return !st.locked && st.reload <= 0 && (!m.ammo || st.ammo > 0);
  }

  // Drain for the sustained beam (per second).
  sustain(dt) {
    const m = this.mode, st = this.st;
    if (!m.heat) return false;
    st.heat = Math.min(1, st.heat + m.heat * dt);
    if (st.heat < 1 || st.locked) return false;
    st.locked = true;
    this.charge = 0;
    return true;
  }

  // What the HUD draws: the row of modes plus the gauge of the selected one.
  hud(out) {
    const m = this.mode, st = this.st;
    out.index = modeIndex(this.id);
    out.name = m.name;
    out.short = m.short;
    out.gauge = m.gauge;
    out.locked = st.locked;
    out.reload = st.reload > 0 ? st.reload / m.reload : 0;
    out.value = m.gauge === 'ammo' ? (m.ammo ? st.ammo / m.ammo : 0)
      : m.gauge === 'charge' ? this.charge
        : m.gauge === 'combo' ? 0 : st.heat;
    out.ammo = m.ammo ? st.ammo : -1;
    out.spin = this.spin;
    out.swap = this.swapT / SWAP_LOCK;
    return out;
  }

  dispose() {
    if (typeof removeEventListener === 'function') removeEventListener('wheel', this.onWheel);
  }
}

export { SABER };
