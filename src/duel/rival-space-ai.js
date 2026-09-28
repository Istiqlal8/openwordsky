// How a rival frame flies a duel in space: close the gap, joust at knife range, then commit to a
// boost dash with the sabre drawn. Pure decision-making — it writes a desired velocity and raises
// `shoot` / `swing` flags; src/duel/rival-space.js owns the model, the bolts and the damage.
import * as THREE from 'three';

const KEEP = 110;        // preferred joust radius, in space units
const DASH_RANGE = 170;  // starts a sabre run from inside this
const MELEE = 30;        // the blade lands inside this
const FAR = 280;
const _dir = new THREE.Vector3();

export class RivalSpaceAI {
  constructor(def) {
    this.def = def;
    this.state = 'approach';
    this.t = 0;
    this.gunT = def.gun.gap;
    this.dashT = def.blade.gap;
    this.burst = 0;
    this.burstT = 0;
    this.shoot = false;
    this.swing = false;
    this.axis = new THREE.Vector3().randomDirection();
  }

  // dist/toShip come from the entity; `stage` 0..2 is how hurt it is (it fights harder late).
  think(dt, ctx, pos, dist, toShip, stage, out) {
    const rush = 1 + stage * 0.22;
    this.shoot = false;
    this.swing = false;
    this.t -= dt;
    this.gunT -= dt * rush;
    this.dashT -= dt * rush;
    if (this.state !== 'approach' && this.t <= 0) this.state = 'joust';
    this.aim(dt, ctx, dist, rush);
    this.steer(ctx, pos, dist, toShip, rush, out);
  }

  aim(dt, ctx, dist, rush) {
    const g = this.def.gun;
    if (this.state === 'dash') {
      if (dist < MELEE && this.t < 0.9) this.swing = true;
      return;
    }
    if (this.dashT <= 0 && dist < DASH_RANGE && !ctx.holdFire) { this.dash(); return; }
    if (ctx.holdFire || dist > g.range) return;
    if (this.burst > 0) {
      this.burstT -= dt;
      if (this.burstT > 0) return;
      this.burst--;
      this.burstT = 0.11;
      this.shoot = true;
      return;
    }
    if (this.gunT > 0) return;
    this.gunT = g.gap / rush;
    this.burst = g.burst;
    this.burstT = 0;
  }

  dash() {
    this.state = 'dash';
    this.t = 2.2;
    this.dashT = this.def.blade.gap;
  }

  // Knocked about: break off for a moment instead of standing in the line of fire.
  evade() {
    if (this.state === 'dash') return;
    this.state = 'break';
    this.t = 0.7 + Math.random() * 0.6;
    this.axis.randomDirection();
  }

  steer(ctx, pos, dist, toShip, rush, out) {
    const speed = this.def.speed.space * rush;
    if (this.state === 'dash') return out.copy(toShip).normalize().multiplyScalar(speed * 2.3);
    if (this.state === 'break') {
      out.crossVectors(this.axis, toShip).normalize().multiplyScalar(speed * 1.4);
      return out.addScaledVector(toShip, -speed * 0.5 / Math.max(dist, 1));
    }
    if (dist > FAR) return out.copy(toShip).normalize().multiplyScalar(speed * 1.6);
    // Joust: ride a ring KEEP units across, always turning through the player's line of fire.
    out.crossVectors(this.axis, toShip).normalize().multiplyScalar(KEEP);
    out.add(ctx.shipPos).addScaledVector(toShip, -KEEP / Math.max(dist, 1)).sub(pos);
    return out.normalize().multiplyScalar(speed);
  }
}
