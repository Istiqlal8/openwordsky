// On-foot gameplay: mining beam, suit life support, sentinels, blaster, fall damage.
import { FxSystem } from '../fx/explosion.js';
import { MiningTool } from './mining.js';
import { LifeSupport } from './life-support.js';
import { Sentinels } from './sentinels.js';
import { Blaster } from './blaster.js';
import { Wanted } from './wanted.js';

const FALL_SAFE = 18;     // vertical speed (units/s) survivable on landing
const FALL_DMG = 4;       // health per unit/s above the safe speed

export class SurfaceGameplay {
  constructor(surface, player, sfx) {
    this.surface = surface;
    this.player = player;
    this.sfx = sfx;
    this.ctx = null;
    this.wantedMeter = new Wanted();
  }

  mount(planet) {
    this.dispose();
    const fx = new FxSystem(this.surface.scene);
    this.ctx = { surface: this.surface, player: this.player, sfx: this.sfx, fx, planet };
    this.mining = new MiningTool(this.ctx);
    this.life = new LifeSupport(this.player, planet);
    this.sentinels = new Sentinels(this.ctx);
    this.blaster = new Blaster(this.ctx);
    this.wantedMeter.reset();
    this.alarm = false;
    this.airVel = 0;
  }

  get wanted() { return this.wantedMeter.level; }
  get storm() { return Boolean(this.life?.storm); }
  get beamTarget() { return this.ctx ? this.mining.target : null; }

  update(dt, input) {
    if (!this.ctx || !this.surface.planet) return;
    dt = Math.min(dt, 0.1);
    this.surface.camera.updateMatrixWorld();
    const alive = !this.player.dead;
    this.useTools(dt, input, alive);
    if (alive) this.life.update(dt);
    if (alive && input.pressed('KeyG')) this.life.recharge();
    this.wantedMeter.update(dt);
    this.sentinels.update(dt, this.wanted);
    this.setAlarm(this.wanted > 0);
    this.checkFall();
    this.ctx.fx.update(dt);
  }

  useTools(dt, input, alive) {
    const mined = this.mining.update(dt, alive && input.mouseDown(0));
    if (mined && this.sentinels.present) this.wantedMeter.mined(mined);
    const shot = this.blaster.update(dt, alive && input.mouseDown(2), this.sentinels);
    if (shot === 'hit') this.wantedMeter.atLeast(1);
    else if (shot === 'kill') this.wantedMeter.raise(1);
  }

  setAlarm(on) {
    if (on === this.alarm) return;
    this.alarm = on;
    this.sfx?.alarm?.(on);
    if (on) this.player.emit('notice', { text: 'Penjaga siaga!' });
  }

  // Damage on hard landings: remember the last airborne vertical speed.
  checkFall() {
    const s = this.surface;
    if (!s.onGround) { this.airVel = s.velY; return; }
    const impact = -this.airVel;
    this.airVel = 0;
    if (impact > FALL_SAFE && !this.player.dead) {
      this.player.damageSuit(Math.round((impact - FALL_SAFE) * FALL_DMG), 'Jatuh');
    }
  }

  // Called by main after player.respawn(): back to the ship (or spawn), sentinels calm down.
  onRespawn() {
    if (!this.ctx) return;
    // The landing spawn point is dry and clear of the parked ship.
    const s = this.surface, spot = s.spawn ?? { x: 0, z: 0 };
    const x = spot.x, z = spot.z;
    s.feet.set(x, s.floorAt(x, z), z);
    s.velY = 0;
    s.onGround = true;
    s.updateCamera(0);
    this.airVel = 0;
    this.wantedMeter.reset();
    this.sentinels.clearHostiles();
    this.setAlarm(false);
  }

  dispose() {
    if (!this.ctx) return;
    this.setAlarm(false);
    this.mining.dispose();
    this.sentinels.dispose();
    this.ctx.fx.dispose();
    this.ctx = this.mining = this.life = this.sentinels = this.blaster = null;
  }
}
