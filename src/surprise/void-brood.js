// A hive queen's brood: smaller, faster copies of her that circle while she drifts and peel off to
// ram anything that provokes her. They share her mesh at a fraction of the scale, so the whole
// swarm costs one extra material and nothing else.
import * as THREE from 'three';
import { readyModel, cloneModel, tintedMaterial } from '../view/life/models/model-cache.js';
import { collideRocks } from '../game/rock-collision.js';

const COUNT = [3, 6];
const SCALE = [0.16, 0.26]; // of the mother's size
const ORBIT = [1.7, 2.9]; // of the mother's solid radius
const CHARGE_RANGE = 2200; // they come a long way for you once the mother is provoked
const CHARGE_SPEED = 130;
const ORBIT_SPEED = 0.35; // radians per second
const BITE = 26; // hull damage per ram
const BITE_GAP = 2.2;
const HP_PER_UNIT = 3.5; // a few seconds of fire each: a swarm to clear, not six bosses
const _a = new THREE.Vector3(), _b = new THREE.Vector3();

export class VoidBrood {
  // deps: { space, player, fx: () => FxSystem|null, sfx }
  constructor(deps) {
    Object.assign(this, deps);
    this.young = [];
    this.root = null;
    this.mat = null;
  }

  mount(mother) {
    this.dispose();
    this.mother = mother;
    this.root = new THREE.Group();
    this.root.name = 'void-brood';
    this.space.scene.add(this.root);
    const r = mother.rng;
    for (let n = COUNT[0] + r.int(COUNT[1] - COUNT[0] + 1); n > 0; n--) this.spawn(r);
  }

  spawn(r) {
    const m = this.mother;
    const size = m.spec.size * r.range(...SCALE);
    this.young.push({
      group: new THREE.Group(), inst: null, size,
      hitR: size * 0.5, hp: Math.round(size * HP_PER_UNIT), pos: new THREE.Vector3(),
      angle: r.range(0, Math.PI * 2), tilt: r.range(-0.5, 0.5), dir: r.chance(0.5) ? 1 : -1,
      orbit: m.hitR * r.range(...ORBIT), spin: r.range(0.4, 1.2), biteCd: 0, alive: true,
      hit: null, // filled on build, reused by collideRocks
    });
  }

  // Meshes appear as soon as the mother's model is in the cache. Safe to call before mount().
  build() {
    if (!this.mother) return false;
    const tpl = readyModel(this.mother.kind);
    if (!tpl) return false;
    if (!this.mat) {
      this.mat = tintedMaterial(tpl, this.mother.spec.tint, 0.55);
      this.mat.emissive = new THREE.Color(this.mother.spec.tint);
      this.mat.emissiveIntensity = 0.35; // small and far off: they need their own glow to be seen
    }
    for (const y of this.young) {
      if (y.inst) continue;
      y.inst = cloneModel(tpl, this.mat);
      y.inst.scene.scale.setScalar(y.size);
      y.inst.scene.position.y = -y.size * 0.5; // centre the feet-at-origin model on its group
      y.group.add(y.inst.scene);
      y.hit = [{ pos: y.pos, r: y.hitR, alive: true }];
      this.root.add(y.group);
    }
    return true;
  }

  // Circling the mother, mouth outward.
  hold(y, dt) {
    y.angle += ORBIT_SPEED * dt * y.dir;
    const c = this.mother.at;
    y.pos.set(c.x + Math.cos(y.angle) * y.orbit, c.y + Math.sin(y.angle * 2 + y.tilt) * y.orbit * 0.3,
      c.z + Math.sin(y.angle) * y.orbit);
  }

  // Straight at the target, and it keeps going past — no braking, no circling.
  charge(y, dt, target) {
    _a.subVectors(target, y.pos);
    const d = _a.length();
    if (d < 0.001) return;
    y.pos.addScaledVector(_a.divideScalar(d), Math.min(d, CHARGE_SPEED * dt));
    y.biteCd -= dt;
    if (d > y.hitR + 6 || y.biteCd > 0) return;
    y.biteCd = BITE_GAP;
    this.player?.damageShip(BITE);
    this.space.shake?.(0.5);
    this.sfx?.hit?.();
  }

  // Solid: the ship bounces off a pup the same way it bounces off the mother.
  bump(y, shipPos) {
    if (!collideRocks(shipPos, this.space.velocity, y.hit)) return;
    this.space.shake?.(0.3);
    this.player?.damageShip(BITE * 0.5);
  }

  // Returns true when the bolt hit one of the young (and kills it if the damage finishes it).
  boltHit(bolt) {
    for (const y of this.young) {
      if (!y.alive || !y.inst) continue;
      _b.copy(y.pos);
      if (_b.distanceTo(bolt.pos) > y.hitR && _b.distanceTo(bolt.prev) > y.hitR) continue;
      y.hp -= bolt.damage;
      this.fx?.()?.sparks(bolt.pos, this.mother.spec.tint, 4, 0.9);
      if (y.hp <= 0) this.killYoung(y);
      return true;
    }
    return false;
  }

  killYoung(y) {
    y.alive = false;
    y.group.visible = false;
    y.hit[0].alive = false;
    this.fx?.()?.explode(y.pos, { color: this.mother.spec.tint, size: 1.4 + y.size * 0.01 });
    this.sfx?.explosion?.(0.5);
    this.player?.addItem?.('Nanit', 40 + Math.floor(Math.random() * 60));
  }

  update(dt, shipPos, aggro) {
    if (!this.young.length || !this.build()) return;
    const hunting = aggro > 0 && shipPos;
    for (const y of this.young) {
      if (!y.alive) continue;
      const near = hunting && shipPos.distanceTo(this.mother.at) < CHARGE_RANGE;
      if (near) this.charge(y, dt, shipPos); else this.hold(y, dt);
      y.group.position.copy(y.pos);
      y.group.rotation.y += y.spin * dt;
      y.group.rotation.x += y.spin * 0.4 * dt;
      if (shipPos) this.bump(y, shipPos);
    }
  }

  // The mother is dead: the brood goes with her, one blast each.
  killAll() {
    for (const y of this.young) if (y.alive) this.killYoung(y);
  }

  get alive() {
    return this.young.filter((y) => y.alive).length;
  }

  dispose() {
    for (const y of this.young) y.inst?.meshes.forEach((m) => m.skeleton?.dispose());
    this.young.length = 0;
    this.mat?.dispose();
    this.root?.removeFromParent();
    this.root = this.mat = null;
  }
}
