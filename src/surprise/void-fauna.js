// Void fauna: one colossal living thing adrift in a rare star system — bigger than the planets it
// coasts between. It ignores the player entirely; it is a landmark, not an enemy. The only danger
// is flying into one, and the planet devourer's maw is by far the worst place to do that.
import * as THREE from 'three';
import { rngOf } from '../core/rng.js';
import { word } from '../gen/names.js';
import { readyModel, cloneModel, tintedMaterial } from '../view/life/models/model-cache.js';
import { BoneAnimator } from '../view/life/models/bone-animator.js';
import { collideRocks, rockImpactDamage } from '../game/rock-collision.js';
import { VoidFeed } from './void-feed.js';
import { VoidWar } from './void-war.js';
import { VoidBrood } from './void-brood.js';

// size: height in world units (planets run 30–380 across, so these read as planet-scale).
// graze: hull damage per second inside the body; mode: null leaves the mesh unanimated.
const KINDS = {
  devourer: { label: 'Pemakan Planet', size: 430, speed: 5, graze: 90, feeds: true, mode: null, tint: 0xff7a3c },
  voidwhale: { label: 'Paus Kekosongan', size: 300, speed: 20, graze: 6, mode: 'swim', tint: 0x9fd8ff },
  kraken: { label: 'Kraken Angkasa', size: 250, speed: 14, graze: 30, mode: 'swim', tint: 0x7fa0ff },
  hivequeen: { label: 'Ratu Sarang', size: 210, speed: 17, graze: 24, mode: 'swim', tint: 0xffc070 },
  guardian: { label: 'Penjaga Purba', size: 190, speed: 22, graze: 18, mode: 'swim', tint: 0xd8e4ff },
  starleech: { label: 'Lintah Bintang', size: 330, speed: 15, graze: 20, mode: 'swim', tint: 0xff9090 },
};
const SPAWN_CHANCE = 0.12;
const NOTICE_RANGE = 3000;
const GRAZE_REACH = 1.2; // damage aura as a multiple of the solid core
const _v = new THREE.Vector3();
const _dir = new THREE.Vector3(), _core = new THREE.Vector3(), _x = new THREE.Vector3(1, 0, 0);
const _q = new THREE.Quaternion(), _roll = new THREE.Quaternion();

export function voidFaunaOf(system) {
  const rng = rngOf(system.seed, 0x0f00);
  return rng.chance(SPAWN_CHANCE) ? rng.pick(Object.keys(KINDS)) : null;
}

export class VoidFauna {
  // opts.player + opts.onNotice(text): both optional; without a player nothing takes damage.
  constructor(space, opts = {}) {
    this.space = space;
    this.player = opts.player ?? null;
    this.fx = opts.fx ?? null;
    this.sfx = opts.sfx ?? null;
    this.war = null;
    this.brood = null;
    this.onNotice = opts.onNotice ?? null;
    this.onImpact = opts.onImpact ?? null;
    this.beast = null;
    this.feed = null;
  }

  // Call after space.mount(), so the planet orbits are known.
  mount(system) {
    this.dispose();
    const kind = voidFaunaOf(system);
    if (!kind || !this.space.bodies.length) return;
    const rng = rngOf(system.seed, 0x0f01);
    const spec = KINDS[kind];
    const orbits = this.space.bodies.map((b) => b.planet.orbit.radius).sort((a, b) => a - b);
    this.beast = {
      kind, spec, rng, group: new THREE.Group(), inst: null, anim: null, mat: null, seen: false,
      name: `${word(rng)} ${spec.label}`,
      orbit: orbits.at(-1) * rng.range(0.55, 1.25) + 900,
      angle: rng.range(0, Math.PI * 2), dir: rng.chance(0.5) ? 1 : -1,
      y: rng.range(-400, 400), bob: rng.range(0, Math.PI * 2), tilt: rng.range(-0.12, 0.12),
      at: new THREE.Vector3(), core: new THREE.Vector3(), hitR: 0, hit: null, meal: null, roll: 0,
      hp: Math.round(spec.size * 10), maxHp: Math.round(spec.size * 10),
    };
    this.space.scene.add(this.beast.group);
    if (spec.feeds) this.startFeeding(system, rng, spec.tint);
    const deps = { space: this.space, player: this.player, fx: this.fx, sfx: this.sfx };
    this.war = new VoidWar({ ...deps, onNotice: this.onNotice });
    this.war.onKill = () => this.onDeath();
    // Only the feeding mother has a brood; a drifting whale travels alone.
    if (spec.feeds) this.brood = new VoidBrood(deps);
  }

  // The devourer does not wander: it picks a world and settles in to eat it.
  startFeeding(system, rng, color) {
    this.feed = new VoidFeed(this.space);
    const body = this.feed.mount(system, rng, color);
    if (!body) { this.feed = null; return; }
    this.beast.meal = body;
    this.beast.at.copy(this.feed.anchor(_v));
  }

  // Builds the mesh once the GLB is ready; until then the system simply looks empty.
  build(b) {
    if (b.inst) return true;
    const tpl = readyModel(b.kind);
    if (!tpl) return false;
    b.mat = tintedMaterial(tpl, b.spec.tint, 0.4);
    b.mat.emissive = new THREE.Color(b.spec.tint);
    b.mat.emissiveIntensity = b.spec.feeds ? 0.3 : 0.08; // the devourer's cracks glow as it feeds
    b.inst = cloneModel(tpl, b.mat);
    b.inst.scene.scale.setScalar(b.spec.size);
    // Out here the star is a pinprick, so the creature carries its own key light to stay readable.
    b.key = new THREE.PointLight(0xfff0dd, b.spec.feeds ? 5 : 2.2, 0, 0);
    b.key.position.set(b.spec.size * 1.6, b.spec.size * 1.1, b.spec.size * 1.3);
    b.group.add(b.inst.scene, b.key);
    if (b.spec.mode && tpl.profile) b.anim = new BoneAnimator(b.inst, b.rng.next());
    // The model is normalized to height 1, centred on X/Z with its feet at the origin, so the solid
    // core sits half a body above b.group.position. Box3 is no use here: it follows the bind-pose
    // skeleton and comes out far too big. The inscribed sphere leaves tentacles and fins passable.
    b.core.set(0, b.spec.size * 0.5, 0);
    b.hitR = Math.min(tpl.length, 1, tpl.width) * b.spec.size * 0.5;
    b.hit = [{ pos: b.at, r: b.hitR, alive: true }]; // reused by collideRocks every frame
    return true;
  }

  // Holds station over its meal, mouth (model +X) pointed down at the crust.
  hover(b, dt) {
    const anchor = this.feed.anchor(_v);
    b.roll += dt * 0.25;
    _dir.subVectors(b.meal.pos, anchor).normalize();
    _q.setFromUnitVectors(_x, _dir);
    _roll.setFromAxisAngle(_dir, b.roll);
    b.group.quaternion.copy(_roll).multiply(_q);
    // group.position is the model's foot, not its middle, so back off by the rotated core offset.
    b.group.position.copy(anchor).sub(_core.copy(b.core).applyQuaternion(b.group.quaternion));
    b.group.updateMatrixWorld(true);
    b.at.copy(anchor);
  }

  // Coasts around the star on its own wide, tilted orbit, nose along the direction of travel.
  drift(b, dt) {
    b.angle += (b.spec.speed / b.orbit) * dt * b.dir;
    b.bob += dt * 0.15;
    const x = Math.cos(b.angle) * b.orbit, z = Math.sin(b.angle) * b.orbit;
    b.group.position.set(x, b.y + Math.sin(b.bob) * 120 + z * b.tilt * 0.02, z);
    const hx = -Math.sin(b.angle) * b.dir, hz = Math.cos(b.angle) * b.dir;
    b.group.rotation.y = Math.atan2(-hz, hx);
    if (b.spec.spin) b.group.rotation.x += b.spec.spin * dt;
    b.group.updateMatrixWorld(true);
    b.at.copy(b.core).applyMatrix4(b.group.matrixWorld);
  }

  // Solid: the ship bounces off the body instead of flying through it, and a hard hit hurts.
  solid(b, shipPos) {
    const impact = collideRocks(shipPos, this.space.velocity, b.hit);
    if (!impact) return;
    this.space.shake?.(Math.min(1.2, impact / 50));
    this.onImpact?.();
    // A planet devourer's bite costs far more than brushing a drifting whale.
    this.player?.damageShip(b.spec.graze * 0.5 + rockImpactDamage(impact) * 2);
  }

  // Skin contact: scraping along the body keeps hurting even when you are not ramming it.
  graze(b, dt, shipPos) {
    const d = _v.copy(shipPos).sub(b.at).length();
    if (!b.seen && d < NOTICE_RANGE) {
      b.seen = true;
      this.onNotice?.(`${b.name} terdeteksi`);
    }
    if (d < b.hitR * GRAZE_REACH) this.player?.damageShip(b.spec.graze * dt);
  }

  // Killed: it lets go of the planet and drifts as a husk.
  onDeath() {
    this.feed?.stop();
    this.brood?.killAll();
    const b = this.beast;
    b.meal = null;
    if (b.mat) { b.mat.emissiveIntensity = 0; b.mat.color.multiplyScalar(0.35); }
    b.spec = { ...b.spec, graze: 0 };
  }

  update(dt, shipPos) {
    const b = this.beast;
    if (!b || !this.build(b)) return;
    if (!b.warMounted) { this.war.mount(b); this.brood?.mount(b); b.warMounted = true; }
    if (b.meal) { this.hover(b, dt); this.feed.update(dt, b.at, b.roll * 4); } else this.drift(b, dt);
    b.anim?.update(dt, { speed: 0.35, mode: b.spec.mode });
    if (!shipPos) return;
    this.solid(b, shipPos);
    this.graze(b, dt, shipPos);
    this.war.update(dt, shipPos);
    this.brood?.update(dt, shipPos, this.war.aggro);
  }

  // Player laser against the body; SpaceCombat routes its bolts here.
  // The young are smaller and closer, so they soak the shot before the mother does.
  boltHit(bolt) {
    if (this.brood?.boltHit(bolt)) { this.war.aggro = 12; return true; }
    return this.war?.boltHit(bolt) ?? false;
  }

  // Nearest void creature to `pos` within range, for the scanner readout.
  nearest(pos, maxDist = 6000) {
    const b = this.beast;
    if (!b?.inst) return null;
    const distance = b.group.position.distanceTo(pos);
    return distance < maxDist ? { name: b.name, distance, position: b.group.position } : null;
  }

  dispose() {
    this.feed?.dispose();
    this.war?.dispose();
    this.brood?.dispose();
    this.feed = this.war = this.brood = null;
    const b = this.beast;
    if (!b) return;
    this.space.scene.remove(b.group);
    b.inst?.meshes.forEach((m) => m.skeleton?.dispose());
    b.key?.dispose();
    b.mat?.dispose();
    this.beast = null;
  }
}
