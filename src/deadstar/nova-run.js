// The set piece, run only while the player is still flying in the system that is going.
//
// It is deliberately slow to arrive: ~26 s of tremors, a bleaching sky and three plain warnings
// before the front touches anything. Being caught costs most of a hull, but a floor keeps it
// from ever being the thing that kills you — a nova with no warning is a rage-quit, not a
// surprise. Warping out at any point ends it: the addon drops this run the moment the player
// leaves the system.
import { resolveSpace, raidLink } from '../raid/raid-link.js';
import { WARN, BLAST } from './deadstar-state.js';
import { Bleach } from './bleach.js';

const DPS = 19;                 // ~133 over the whole front if they just sit there
const HULL_FLOOR = 10;          // the nova never lands the killing blow
const SHAKE_MAX = 1.6;
// [seconds of warning elapsed, line]
const CUES = [
  [0, (n) => `Inti ${n} runtuh — sistem ini akan hancur. Pergi sekarang!`],
  [10, () => 'Getaran meningkat — buka peta (M) dan warp keluar'],
  [19, () => 'Gelombang kejut hampir tiba — TINGGALKAN SISTEM'],
];

function spaceEvents() {
  return raidLink.spaceMode?.events ?? globalThis.__game?.spaceMode?.events ?? null;
}

export class NovaRun {
  constructor(w, ev) {
    this.w = w;
    this.ev = ev;
    this.bleach = new Bleach();
    this.cue = 0;
    this.blown = false;
    this.w.sfx.alarm?.(true);
  }

  // t = seconds since the collapse started; ramp = 0..1 across the warning.
  update(dt, t, ramp) {
    this.cues(t);
    const blast = t >= WARN;
    this.bleach.set(blast ? 1 - (t - WARN) / (BLAST + 3) : ramp * ramp * 0.55);
    const { space } = resolveSpace() ?? {};
    space?.shake?.(blast ? SHAKE_MAX : 0.08 + ramp * ramp * 0.5);
    if (!blast) return;
    if (!this.blown) this.detonate();
    if (t < WARN + BLAST) this.burn(dt);
  }

  cues(t) {
    while (this.cue < CUES.length && t >= CUES[this.cue][0]) {
      this.w.hud.toast(CUES[this.cue][1](this.ev.name));
      this.cue++;
    }
  }

  detonate() {
    this.blown = true;
    spaceEvents()?.triggerSupernova();
    this.w.sfx.explosion?.(1);
    this.w.hud.toast(`NOVA — ${this.ev.name} pecah`);
  }

  // Shield first, then hull, but never past the floor: run and you keep the ship.
  burn(dt) {
    const p = this.w.player;
    const room = p.ship.shield + p.ship.hull - HULL_FLOOR;
    const dmg = Math.min(DPS * dt, Math.max(0, room));
    if (dmg > 0) p.damageShip(dmg);
  }

  dispose() {
    this.bleach.dispose();
    this.w.sfx.alarm?.(false);
  }
}
