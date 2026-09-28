// Mech weapons on a planet. Everything resolves through WeaponHits — the same path the blaster
// and the hand weapons use — so sentinels, creatures, legendary beasts and raid bosses all take
// damage normally. Rockets reuse the shared RocketPool, the beam reuses the ship beam.
import * as THREE from 'three';
import { WeaponHits } from '../weapons/weapon-hits.js';
import { RocketPool } from '../combat/rockets.js';
import { ShipBeam } from '../ship-systems/ship-beam.js';
import { MechGuns } from './mech-gun-base.js';
import { RIFLE, GATLING, BAZOOKA, CANNON, POD, SABER, modeById } from './mech-weapons.js';
import { cannonSfx, saberHitSfx, bazookaHitSfx } from './mech-sfx.js';
import { spend } from './mech-power.js';

export const STOMP = { damage: 5, radius: 1.9 };
const POD_MODE = modeById(POD);
const SABER_MODE = modeById(SABER);
const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _seg = new THREE.Vector3();
const _back = new THREE.Vector3();

export class MechSurfaceGuns extends MechGuns {
  constructor(ctx, mech) {
    super(mech, ctx.sfx);
    this.ctx = ctx;
    this.hits = new WeaponHits(ctx, () => ctx.gameplay?.sentinels, (r) => ctx.gameplay?.droneShot(r));
    this.ray = new THREE.Raycaster();
    this.cool = 0;
    this.podCd = 0;
    this.beamTick = 0;
    this.beamCue = false;
    this.pools = {};
    this.beam = null;
    this.attachFx(ctx.surface.scene);
  }

  aimHit(range, spread = 0) {
    const cam = this.aimCamera ?? this.ctx.surface.camera;   // frozen chase basis, not the orbit view
    this.ray.ray.origin.copy(cam.position);
    this.ray.ray.direction.set(0, 0, -1).applyQuaternion(cam.quaternion);
    if (spread) {
      const d = this.ray.ray.direction;
      d.set(d.x + jitter(spread), d.y + jitter(spread), d.z + jitter(spread)).normalize();
    }
    return this.hits.cast(this.ray.ray, range);
  }

  update(dt, input, pose) {
    this.cool -= dt;
    this.podCd -= dt;
    const held = this.inputs(input);
    this.load.update(dt, input, held, input.uiCapture);
    this.mech.group.updateMatrixWorld(true);
    this.mech.rifleMuzzle(this.muzzles[0]);
    for (let i = 0; i < 2; i++) this.mech.shoulderMuzzle(i, this.pads[i]);
    this.fireMain(dt, pose);
    this.firePod(pose);
    this.saber(pose);
    this.stepRockets(dt);
    this.tick(dt, pose);
  }

  fireMain(dt, pose) {
    const m = this.load.mode;
    if (m.id === CANNON) { this.cannon(dt, pose, m); return; }
    this.stopBeam();
    if (m.id === SABER) return;
    if (m.id === POD) { if (this.fireClick) this.launch(pose, POD_MODE); return; }
    if (!this.fireHeld || this.cool > 0 || !this.load.ready) return;
    if (m.id === BAZOOKA) this.launch(pose, m);
    else this.hitscan(pose, m);
  }

  // Beam rifle / gatling: a hitscan shot with a visible bolt and an impact splash.
  hitscan(pose, m) {
    const g = m.ground, { player, fx, sfx } = this.ctx;
    if (!spend(player, g.cost)) { sfx?.dryFire?.(); this.cool = 0.4; return; }
    this.cool = g.gap;
    const hit = this.aimHit(g.range, g.spread);
    _from.copy(this.muzzles[0]);
    _dir.subVectors(hit.point, _from).normalize();
    fx?.beam(_from, hit.point, m.color, m.id === GATLING ? 0.05 : 0.08);
    fx?.sparks(hit.point, m.color, m.id === GATLING ? 5 : 10, this.unit * 0.09);
    this.fx?.flash(hit.point, _back.copy(_dir).negate(), this.unit * m.flashSize * 0.6, m.flash, 0.09);
    this.fired(pose, m, _from, _dir, fx, 22);
    this.report(this.hits.apply(hit, g.damage, m.color));
  }

  // Bazooka and missile pod: real rockets with smoke trails, detonating on whatever they touch.
  launch(pose, m) {
    const g = m.ground, { player, sfx } = this.ctx;
    const pod = m.id === POD;
    if (pod && this.podCd > 0) return;
    if (!this.load.canFire(m.id)) { sfx?.dryFire?.(); return; }
    if (!spend(player, g.cost)) { sfx?.dryFire?.(); return; }
    if (pod) this.podCd = g.gap;
    if (m.id === this.load.id) this.cool = g.gap;
    const hit = this.aimHit(600);
    const pool = this.pool(m);
    for (let i = 0; i < g.volley; i++) {
      const from = pod ? this.pads[i % 2] : this.muzzles[0];
      _dir.subVectors(hit.point, from).normalize();
      if (g.volley > 1) _dir.set(_dir.x + jitter(0.3), _dir.y + jitter(0.3) + 0.14, _dir.z + jitter(0.3)).normalize();
      const r = pool.fire(from, _dir, g.speed, null);
      if (!r) continue;
      r.damage = g.damage;
      r.radius = g.radius;
      r.age = -i * 0.05;
    }
    _dir.subVectors(hit.point, pod ? this.pads[0] : this.muzzles[0]).normalize();
    this.fired(pose, m, pod ? this.pads[0] : this.muzzles[0], _dir, this.ctx.fx, 22);
  }

  pool(m) {
    const g = m.ground;
    this.pools[m.id] ??= new RocketPool(this.ctx.surface.scene, { capacity: g.volley * 4, maxSpeed: g.speed * 2.6,
      turn: g.turn, life: 6, scale: g.scale * this.unit * 0.07, flame: m.color,
      trail: 0xb0b0b8, trailGap: 0.035 });
    return this.pools[m.id];
  }

  stepRockets(dt) {
    for (const id in this.pools) this.pools[id].update(dt, this.ctx.fx, this.rocketHit, this.detonate);
  }

  rocketHit = (r) => {
    const len = _seg.subVectors(r.pos, r.prev).length();
    if (len < 1e-4) return false;
    this.ray.ray.origin.copy(r.prev);
    this.ray.ray.direction.copy(_seg).divideScalar(len);
    const h = this.hits.cast(this.ray.ray, len, false);
    if (h.type === 'none') return false;
    r.pos.copy(h.point);
    return true;
  };

  detonate = (r) => {
    this.ctx.fx?.explode(r.pos, { color: 0xffaa55, size: 1 + r.radius * 0.09, debris: true });
    bazookaHitSfx(this.sfx, Math.min(1, 0.45 + r.radius * 0.035));
    this.hits.splash(r.pos, r.radius, r.damage);
    this.onShake?.(Math.min(0.9, r.radius * 0.04));
    this.report('hit');
  };

  // Particle cannon: charge, then a thick sustained beam that melts what it sweeps over.
  cannon(dt, pose, m) {
    const g = m.ground, { player, fx } = this.ctx;
    if (!this.fireHeld || !this.load.ready || !spend(player, g.cost * dt)) { this.stopBeam(); return; }
    if (!this.beamCue) { cannonSfx(this.ctx.sfx); this.beamCue = true; }
    this.beam ??= new ShipBeam(this.ctx.surface.scene, g.color, g.core);
    const hit = this.aimHit(g.range);
    this.beam.show(this.muzzles, hit.point, g.width * this.unit * 0.12, dt);
    this.mech.rack.setCharge(1);
    this.beamTick -= dt;
    if (this.beamTick <= 0) {
      this.beamTick += g.tick;
      this.hits.splash(hit.point, g.radius, g.damage * g.tick);
      this.report(this.hits.apply(hit, g.damage * g.tick, g.color));
      fx?.sparks(hit.point, g.color, 7, this.unit * 0.1);
      fx?.puff(hit.point, 0x40305a, this.unit * 0.16, 0.7);
    }
    this.sustained(dt, pose, m);
  }

  stopBeam() {
    this.beam?.hide();
    this.beamCue = false;
  }

  firePod(pose) {
    if (this.load.id === POD || !this.podClick) return;
    this.launch(pose, POD_MODE);
  }

  saber(pose) {
    if (this.swing(pose, SABER_MODE.ground.cost, (c) => spend(this.ctx.player, c))) this.onShake?.(0.25);
    if (pose.swingHit) this.saberHit(pose);
  }

  saberHit(pose) {
    const s = SABER_MODE.ground, step = pose.swingStep;
    this.mech.group.updateMatrixWorld(true);
    this.mech.saberTip(_to);
    const radius = s.radius[step] ?? s.radius[0];
    this.hits.splash(_to, radius, s.damage[step]);
    this.ctx.fx?.sparks(_to, SABER_MODE.color, 18, this.unit * 0.16);
    this.ctx.fx?.explode(_to, { color: SABER_MODE.color, size: 0.7, debris: false });
    pose.saberImpact();
    saberHitSfx(this.ctx.sfx);
    this.onShake?.(0.35);
    this.report('hit');
  }

  // Crushing whatever is under a footfall.
  stomp(at) {
    this.hits.splash(at, STOMP.radius * this.mech.design.d.footW, STOMP.damage);
  }

  report(res) {
    if (res === 'kill') this.onKill?.();
  }

  dispose() {
    this.stopBeam();
    this.beam?.dispose();
    this.beam = null;
    for (const id in this.pools) this.pools[id].dispose();
    this.pools = {};
    super.dispose();
  }
}

const jitter = (a) => (Math.random() - 0.5) * 2 * a;
export { RIFLE };
