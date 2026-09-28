// AtmoGuns: the ship's primary weapon while flying over a planet (surface-flight active).
// LMB fires from the ship's real muzzles toward the crosshair; hits creatures, sentinel drones and
// terrain through WeaponHits (same damage APIs as the multitool), with scorch marks on the ground.
// Homing weapons chase the nearest creature/drone in front. Energy comes from player.ship.energy.
import * as THREE from 'three';
import { GunBattery } from './gun-battery.js';
import { AtmoTargets } from './atmo-targets.js';
import { ScorchPool } from './scorch.js';
import { weaponOf } from './ship-weapons.js';
import { WeaponHits } from '../weapons/weapon-hits.js';

const CONVERGE = 260;   // crosshair convergence distance (m)
const UNIT = 20;        // ship damage per multitool hit unit (one unit = one blaster hit)
const tmpF = new THREE.Vector3();

export class AtmoGuns {
  // ctx: SurfaceGameplay ctx { surface, player, sfx, fx, creatures, gameplay }; sentinelsFn() -> Sentinels
  constructor(ctx, sentinelsFn) {
    this.ctx = ctx;
    const s = ctx.surface;
    this.root = new THREE.Group();
    this.root.name = 'atmo-guns';
    s.scene.add(this.root);
    this.battery = new GunBattery(this.root, { fx: ctx.fx, sfx: ctx.sfx });
    this.hits = new WeaponHits(ctx, sentinelsFn, (r) => ctx.gameplay?.droneShot?.(r));
    this.targets = new AtmoTargets(ctx, sentinelsFn);
    this.scorch = new ScorchPool(this.root, (x, z) => s.floorAt(x, z));
    this.ray = new THREE.Ray();
    this.mz = [];
    this.env = this.buildEnv();
    this.resolve = {
      bolt: (b) => this.boltHit(b),
      seeker: (r) => this.seekerHit(r),
      detonate: (r) => this.explode(r.pos, r.damage, r.radius, 0xffaa55),
    };
  }

  buildEnv() {
    const player = this.ctx.player;
    return {
      weapon: null, muzzles: this.mz, aim: new THREE.Vector3(), baseVel: new THREE.Vector3(), dmgMul: 1,
      spend: (cost) => player.useEnergy(cost),
      pickTargets: (out, n, cone) => this.targets.pick(out, n, cone),
      beamCast: (from, dir, range, amount) => this.beamCast(from, dir, range, amount),
      shake: null,
    };
  }

  update(dt, input, design) {
    if (!this.root) return;
    dt = Math.min(dt, 0.1);
    const s = this.ctx.surface, p = this.ctx.player;
    const armed = s.flying && s.landed?.model && !p.dead;
    if (armed) {
      p.tickShip?.(dt); // shield + energy trickle while the ship is powered
      this.prepare(design);
      this.battery.trigger(dt, input.mouseDown(0), input.clicked(0), this.env);
    } else this.battery.stopBeam();
    this.battery.step(dt, this.resolve);
    this.scorch.update(dt);
  }

  // Muzzles to world space, aim at the crosshair, inherit the ship's velocity.
  prepare(design) {
    const s = this.ctx.surface, model = s.landed.model, env = this.env;
    model.group.updateMatrixWorld();
    const local = model.muzzles;
    while (this.mz.length < local.length) this.mz.push(new THREE.Vector3());
    this.mz.length = Math.max(1, local.length);
    for (let i = 0; i < local.length; i++) this.mz[i].copy(local[i]).applyMatrix4(model.group.matrixWorld);
    if (!local.length) this.mz[0].copy(model.group.position);
    const cam = s.camera;
    env.aim.copy(cam.position).addScaledVector(cam.getWorldDirection(tmpF), CONVERGE);
    env.baseVel.copy(s.flight.velocity ?? env.baseVel.set(0, 0, 0));
    env.weapon = weaponOf(design ?? s.shipDesign);
    env.dmgMul = (design ?? s.shipDesign)?.stats?.damage ?? 1;
  }

  // Sweep the bolt's last step; returns true when it struck something.
  boltHit(b) {
    const len = this.segment(b.prev, b.pos);
    const h = this.hits.cast(this.ray, len, false);
    if (h.type === 'none') return false;
    this.impact(h, b.damage);
    if (b.splash) this.explode(h.point, b.damage * 0.5, b.splash, 0x8dff3a);
    return true;
  }

  seekerHit(r) {
    if (r.target?.alive && r.target.pos.distanceToSquared(r.pos) < 4) return true;
    const len = this.segment(r.prev, r.pos);
    return this.hits.cast(this.ray, len, false).type !== 'none';
  }

  segment(a, b) {
    this.ray.origin.copy(a);
    const len = this.ray.direction.subVectors(b, a).length();
    this.ray.direction.divideScalar(Math.max(len, 1e-5));
    return Math.max(len, 0.01);
  }

  impact(h, damage) {
    this.hits.apply(h, damage / UNIT);
    if (h.type === 'terrain') this.scorch.add(h.point, 0.5 + damage * 0.03);
  }

  // Area blast: fireball, falloff damage to drones/creatures, scorch when close to the ground.
  explode(pos, damage, radius, color) {
    const { fx, sfx } = this.ctx;
    fx.explode(pos, { color, size: 0.4 + radius * 0.08, debris: radius > 6 });
    sfx?.explosion?.(Math.min(0.5, radius * 0.04), pos);
    this.hits.splash(pos, radius, damage / UNIT);
    this.scorch.add(pos, radius * 0.45);
  }

  // Continuous beam: props included (one ray per frame). Returns the hit distance.
  beamCast(from, dir, range, amount) {
    this.ray.origin.copy(from);
    this.ray.direction.copy(dir);
    const h = this.hits.cast(this.ray, range, true);
    if (amount > 0 && h.type !== 'none') this.impact(h, amount);
    return h.dist;
  }

  dispose() {
    if (!this.root) return;
    this.battery.dispose();
    this.scorch.dispose();
    this.root.removeFromParent();
    this.root = null;
  }
}
