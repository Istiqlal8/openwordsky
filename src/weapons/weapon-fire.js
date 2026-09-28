// Fire modes for combat weapons: projectile bolts/ice/grenades, pellet spread, continuous beam
// and the charged piercing railgun. Heat bookkeeping lives in the caller's `st` ({ heat, locked }).
import * as THREE from 'three';
import { Projectiles } from './projectiles.js';
import { BeamVisual } from '../gameplay/beam-visual.js';
import { Tracers } from './tracers.js';
import { playWeaponSfx } from './weapon-sfx.js';

const CENTER = new THREE.Vector2(0, 0);
const _from = new THREE.Vector3(), _to = new THREE.Vector3(), _dir = new THREE.Vector3();
const _ray = new THREE.Ray(), _side = new THREE.Vector3(), _up = new THREE.Vector3();
const RECOIL = { bolt: 0.3, ice: 0.45, spread: 1.1, grenade: 0.9, rail: 1.5 };
const MIN_CHARGE = 0.25;

export class WeaponFire {
  constructor(ctx, hits, viewmodel, frost) {
    Object.assign(this, { ctx, hits, viewmodel, frost });
    this.projectiles = new Projectiles(ctx, hits, (p, hit, pt) => this.impact(p, hit, pt));
    this.beam = new BeamVisual(ctx.surface.scene, 0xff3a2a);
    this.tracers = new Tracers(ctx.surface.scene);
    this.caster = new THREE.Raycaster();
    Object.assign(this, { cool: 0, charge: 0, beamOn: false, tickT: 0 });
  }

  // Returns true on the frames a shot leaves the barrel.
  update(dt, spec, held, st) {
    this.cool -= dt;
    this.projectiles.update(dt);
    this.tracers.update(dt);
    if (spec.fire !== 'beam') this.stopBeam();
    if (spec.fire !== 'rail') this.charge = 0;
    if (st.locked) { this.stopBeam(); this.charge = 0; return false; }
    if (spec.fire === 'beam') return this.fireBeam(dt, spec, held, st);
    if (spec.fire === 'rail') return this.fireRail(dt, spec, held, st);
    if (!held || this.cool > 0) return false;
    this.cool = 1 / spec.rate;
    if (spec.fire === 'spread') this.fireSpread(spec);
    else this.launch(spec);
    return this.shot(spec, st);
  }

  shot(spec, st) {
    st.heat += spec.heat;
    this.viewmodel.fire(RECOIL[spec.fire] ?? 0.5, spec.color);
    this.ctx.fx?.sparks(this.muzzle(_from), spec.color, 3, 0.4);
    playWeaponSfx(this.ctx.sfx, spec.id);
    return true;
  }

  aim() {
    this.caster.setFromCamera(CENTER, this.ctx.surface.camera);
    return this.caster.ray;
  }

  muzzle(out) {
    return this.viewmodel.muzzleWorld(out) ?? this.aim().at(0.6, out);
  }

  // Projectiles leave the muzzle towards whatever the crosshair covers.
  launch(spec) {
    const ray = this.aim(), from = this.muzzle(_from);
    if (spec.fire === 'grenade') _dir.copy(ray.direction);
    else _dir.subVectors(this.hits.cast(ray, spec.range, false).point, from).normalize();
    this.projectiles.spawn(from, _dir, spec, spec.fire === 'ice' ? 'ice' : spec.fire === 'grenade' ? 'grenade' : 'bolt');
  }

  fireSpread(spec) {
    const base = this.aim(), from = this.muzzle(_from);
    _side.set(1, 0, 0).applyQuaternion(this.ctx.surface.camera.quaternion);
    _up.set(0, 1, 0).applyQuaternion(this.ctx.surface.camera.quaternion);
    for (let i = 0; i < spec.pellets; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spec.spread;
      _dir.copy(base.direction).addScaledVector(_side, Math.cos(a) * r).addScaledVector(_up, Math.sin(a) * r).normalize();
      _ray.set(base.origin, _dir);
      const hit = this.hits.cast(_ray, spec.range);
      this.tracers.show(from, hit.point, spec.color, 0.012, 0.09);
      this.hits.apply(hit, spec.damage, spec.color);
    }
  }

  fireBeam(dt, spec, held, st) {
    if (!held) { this.stopBeam(); return false; }
    const hit = this.hits.cast(this.aim(), spec.range);
    this.beam.glow.material.color.set(spec.color);
    this.beam.show(this.muzzle(_from), hit.point, dt, hit.type !== 'none');
    this.beamOn = true;
    st.heat += spec.heat * dt;
    this.hits.apply(hit, spec.damage * dt, spec.color);
    this.tickT -= dt;
    if (this.tickT > 0) return false;
    this.tickT = 0.08;
    playWeaponSfx(this.ctx.sfx, 'beam');
    this.viewmodel.fire(0.08, spec.color);
    return true;
  }

  stopBeam() {
    if (!this.beamOn) return;
    this.beamOn = false;
    this.beam.hide();
  }

  // Hold to charge, release to fire; damage scales with charge.
  fireRail(dt, spec, held, st) {
    if (held && this.cool <= 0) {
      this.charge = Math.min(1, this.charge + dt / spec.charge);
      this.tickT -= dt;
      if (this.tickT <= 0) { this.tickT = 0.09; playWeaponSfx(this.ctx.sfx, 'charge', this.charge); }
      return false;
    }
    const k = this.charge;
    this.charge = 0;
    if (k < MIN_CHARGE) return false;
    this.cool = 1 / spec.rate;
    this.pierce(spec, k);
    return this.shot(spec, st);
  }

  // Up to 3 targets along the line, stopping at terrain or rocks.
  pierce(spec, k) {
    const from = this.muzzle(_from).clone();
    _ray.copy(this.aim());
    let end = _to.copy(_ray.direction).multiplyScalar(spec.range).add(_ray.origin);
    for (let n = 0; n < 4; n++) {
      const hit = this.hits.cast(_ray, spec.range);
      if (hit.type === 'none') break;
      end = _to.copy(hit.point);
      this.hits.apply(hit, spec.damage * k, spec.color);
      this.ctx.fx?.sparks(end, spec.color, 14, 1);
      if (hit.type === 'terrain' || hit.type === 'prop') break;
      _ray.origin.copy(end).addScaledVector(_ray.direction, 2.5);
    }
    this.tracers.show(from, end, spec.color, 0.06, 0.45);
    this.tracers.show(from, end, 0xffffff, 0.018, 0.25);
  }

  impact(p, hit, point) {
    const { fx, sfx } = this.ctx, spec = p.spec;
    if (p.kind === 'grenade') {
      fx?.explode(point, { color: 0xffa040, size: 1.1, debris: true });
      sfx?.explosion?.(0.5);
      this.hits.splash(point, spec.radius, spec.damage);
      return;
    }
    fx?.sparks(point, spec.color, p.kind === 'ice' ? 10 : 6, 0.6);
    if (!hit) return;
    this.hits.apply(hit, spec.damage, spec.color);
    if (p.kind === 'ice' && (hit.type === 'drone' || hit.type === 'creature')) {
      this.frost.freeze(hit, spec.freeze);
      playWeaponSfx(sfx, 'freeze');
    }
  }

  reset() {
    this.stopBeam();
    this.charge = 0;
    this.projectiles.clear();
    this.tracers.clear();
  }

  dispose() {
    this.stopBeam();
    this.projectiles.dispose();
    this.tracers.dispose();
    this.beam.dispose();
  }
}
