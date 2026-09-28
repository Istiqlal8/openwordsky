// Void fauna: one colossal living thing adrift in a rare star system — bigger than the planets it
// coasts between. It ignores the player entirely; it is a landmark, not an enemy. The only danger
// is flying into one, and the planet devourer's maw is by far the worst place to do that.
import * as THREE from 'three';
import { rngOf } from '../core/rng.js';
import { word } from '../gen/names.js';
import { readyModel, cloneModel, tintedMaterial } from '../view/life/models/model-cache.js';
import { BoneAnimator } from '../view/life/models/bone-animator.js';

// size: height in world units (planets run 30–380 across, so these read as planet-scale).
// graze: hull damage per second inside the body; mode: null leaves the mesh unanimated.
const KINDS = {
  devourer: { label: 'Pemakan Planet', size: 430, speed: 5, graze: 90, spin: 0.03, mode: null, tint: 0xff7a3c },
  voidwhale: { label: 'Paus Kekosongan', size: 300, speed: 20, graze: 6, mode: 'swim', tint: 0x9fd8ff },
  kraken: { label: 'Kraken Angkasa', size: 250, speed: 14, graze: 30, mode: 'swim', tint: 0x7fa0ff },
  hivequeen: { label: 'Ratu Sarang', size: 210, speed: 17, graze: 24, mode: 'swim', tint: 0xffc070 },
  guardian: { label: 'Penjaga Purba', size: 190, speed: 22, graze: 18, mode: 'swim', tint: 0xd8e4ff },
  starleech: { label: 'Lintah Bintang', size: 330, speed: 15, graze: 20, mode: 'swim', tint: 0xff9090 },
};
const SPAWN_CHANCE = 0.12;
const NOTICE_RANGE = 3000;
const _v = new THREE.Vector3();

export function voidFaunaOf(system) {
  const rng = rngOf(system.seed, 0x0f00);
  return rng.chance(SPAWN_CHANCE) ? rng.pick(Object.keys(KINDS)) : null;
}

export class VoidFauna {
  // opts.player + opts.onNotice(text): both optional; without a player nothing takes damage.
  constructor(space, opts = {}) {
    this.space = space;
    this.player = opts.player ?? null;
    this.onNotice = opts.onNotice ?? null;
    this.beast = null;
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
      name: `${word(rng)} ${spec.label}`, radius: spec.size * 0.45,
      orbit: orbits.at(-1) * rng.range(0.55, 1.25) + 900,
      angle: rng.range(0, Math.PI * 2), dir: rng.chance(0.5) ? 1 : -1,
      y: rng.range(-400, 400), bob: rng.range(0, Math.PI * 2), tilt: rng.range(-0.12, 0.12),
    };
    this.space.scene.add(this.beast.group);
  }

  // Builds the mesh once the GLB is ready; until then the system simply looks empty.
  build(b) {
    if (b.inst) return true;
    const tpl = readyModel(b.kind);
    if (!tpl) return false;
    b.mat = tintedMaterial(tpl, b.spec.tint, 0.4);
    b.mat.emissive = new THREE.Color(b.spec.tint);
    b.mat.emissiveIntensity = 0.08; // a hint of self-glow, not enough to flatten the shading
    b.inst = cloneModel(tpl, b.mat);
    b.inst.scene.scale.setScalar(b.spec.size);
    // Out here the star is a pinprick, so the creature carries its own key light to stay readable.
    b.key = new THREE.PointLight(0xfff0dd, 2.2, 0, 0);
    b.key.position.set(b.spec.size * 1.6, b.spec.size * 1.1, b.spec.size * 1.3);
    b.group.add(b.inst.scene, b.key);
    if (b.spec.mode && tpl.profile) b.anim = new BoneAnimator(b.inst, b.rng.next());
    return true;
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
  }

  // Inside the body: the hull takes damage for as long as the ship stays there.
  graze(b, dt, shipPos) {
    const d = _v.copy(shipPos).sub(b.group.position).length();
    if (!b.seen && d < NOTICE_RANGE) {
      b.seen = true;
      this.onNotice?.(`${b.name} terdeteksi`);
    }
    if (d < b.radius) this.player?.damageShip(b.spec.graze * dt);
  }

  update(dt, shipPos) {
    const b = this.beast;
    if (!b || !this.build(b)) return;
    this.drift(b, dt);
    b.anim?.update(dt, { speed: 0.35, mode: b.spec.mode });
    if (shipPos) this.graze(b, dt, shipPos);
  }

  // Nearest void creature to `pos` within range, for the scanner readout.
  nearest(pos, maxDist = 6000) {
    const b = this.beast;
    if (!b?.inst) return null;
    const distance = b.group.position.distanceTo(pos);
    return distance < maxDist ? { name: b.name, distance, position: b.group.position } : null;
  }

  dispose() {
    const b = this.beast;
    if (!b) return;
    this.space.scene.remove(b.group);
    b.inst?.meshes.forEach((m) => m.skeleton?.dispose());
    b.key?.dispose();
    b.mat?.dispose();
    this.beast = null;
  }
}
