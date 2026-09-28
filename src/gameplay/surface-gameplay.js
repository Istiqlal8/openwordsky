// On-foot gameplay: mining beam, suit life support, sentinels, blaster, weapons, fall damage.
import { FxSystem } from '../fx/explosion.js';
import { MiningTool } from './mining.js';
import { LifeSupport } from './life-support.js';
import { Sentinels } from './sentinels.js';
import { Blaster } from './blaster.js';
import { Wanted } from './wanted.js';
import { Pickups } from './pickups.js';
import { WORLD_ADDONS } from './world-addons.js';
import { Arsenal } from '../weapons/arsenal.js';
import { WeaponRig } from '../weapons/weapon-rig.js';

const FALL_SAFE = 18;     // vertical speed (units/s) survivable on landing
const FALL_DMG = 4;       // health per unit/s above the safe speed

export class SurfaceGameplay {
  constructor(surface, player, sfx) {
    this.surface = surface;
    this.player = player;
    this.sfx = sfx;
    this.ctx = null;
    this.wantedMeter = new Wanted();
    this.weapons = new Arsenal(); // owned/equipped weapons persist across landings
  }

  mount(planet) {
    this.dispose();
    const fx = new FxSystem(this.surface.scene);
    this.ctx = { surface: this.surface, player: this.player, sfx: this.sfx, fx, planet };
    this.ctx.gameplay = this; // addons read storm state (src/gameplay/night-flora.js)
    this.sfx?.listen?.(this.surface.camera, 35); // on foot, distance is in metres
    this.mining = new MiningTool(this.ctx);
    this.life = new LifeSupport(this.player, planet);
    this.sentinels = new Sentinels(this.ctx);
    this.blaster = new Blaster(this.ctx);
    this.pickups = new Pickups(this.ctx);
    this.ctx.pickups = this.pickups;
    this.addons = WORLD_ADDONS.map((A) => new A(this.ctx));
    this.rig = new WeaponRig(this.ctx, this.weapons, () => this.sentinels, (r) => this.droneShot(r));
    this.ctx.muzzle = (out) => this.rig.muzzle(out);
    this.wantedMeter.reset();
    this.alarm = false;
    this.airVel = 0;
  }

  get wanted() { return this.wantedMeter.level; }
  get storm() { return Boolean(this.life?.storm); }
  get beamTarget() { return this.ctx ? this.mining.target : null; }
  // Owned/equipped weapons: { owned, equipped, equip(id), buy(id, player), attachSave(save) }.
  get arsenal() { return this.weapons; }

  update(dt, input) {
    if (!this.ctx || !this.surface.planet) return;
    dt = Math.min(dt, 0.1);
    this.surface.camera.updateMatrixWorld();
    const alive = !this.player.dead;
    const tool = this.rig.update(dt, input, alive);
    this.useTools(dt, input, alive && tool);
    if (alive) this.life.update(dt);
    if (alive && !this.surface.flying) this.pickups.update(dt);
    for (const a of this.addons) a.update(dt, alive);
    if (alive && input.pressed('KeyG')) this.life.recharge();
    this.wantedMeter.update(dt);
    this.sentinels.update(dt, this.wanted);
    this.rig.lateUpdate(dt);
    this.setAlarm(this.wanted > 0);
    this.checkFall();
    this.ctx.fx.update(dt);
  }

  // Multitool: mining beam (LMB) + blaster (RMB); `usable` is false while a combat weapon is out.
  useTools(dt, input, usable) {
    const mined = this.mining.update(dt, usable && input.mouseDown(0));
    if (mined && this.sentinels.present) this.wantedMeter.mined(mined);
    const shot = this.blaster.update(dt, usable && input.mouseDown(2), this.sentinels);
    if (shot) this.rig.toolShot(0x6ff4ff);
    if (shot === 'hit' || shot === 'kill') this.droneShot(shot);
  }

  // Shooting sentinels raises the wanted level.
  droneShot(result) {
    if (result === 'hit') this.wantedMeter.atLeast(1);
    else if (result === 'kill') this.wantedMeter.raise(1);
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
    this.rig.reset();
    this.setAlarm(false);
  }

  dispose() {
    if (!this.ctx) return;
    this.setAlarm(false);
    this.rig.dispose();
    this.mining.dispose();
    this.sentinels.dispose();
    this.pickups.dispose();
    for (const a of this.addons) a.dispose();
    this.addons = [];
    this.ctx.fx.dispose();
    this.ctx = this.mining = this.life = this.sentinels = this.blaster = this.pickups = this.rig = null;
  }
}
