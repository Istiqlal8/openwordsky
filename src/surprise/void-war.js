// The battle around a void creature. A system defence squadron is already fighting it when the
// player arrives, the creature answers with plasma, and it can be killed — which stops it feeding
// and leaves the world it was eating alive.
import * as THREE from 'three';
import { BoltPool } from '../combat/bolts.js';
import { Pirate } from '../combat/pirate.js';
import { segmentHits, randomDir } from '../combat/geom.js';

const SQUAD = [3, 6]; // defenders on station
const RESPAWN = [14, 26]; // seconds before the navy sends another
const PLASMA_SPEED = 240;
const PLASMA_LIFE = 6;
const FIRE_GAP = [1.1, 2.4];
const REACH = 1700; // the creature only bothers with targets this close
const AGGRO_TIME = 12; // seconds it stays fixed on whoever shot it
const SHIP_R = 2.4;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const ZERO = new THREE.Vector3();

export class VoidWar {
  // deps: { space, player, fx: () => FxSystem|null, sfx, onNotice }
  constructor(deps) {
    Object.assign(this, deps);
    this.beast = null;
    this.defenders = [];
    this.root = null;
  }

  mount(beast) {
    this.dispose();
    this.beast = beast;
    this.root = new THREE.Group();
    this.root.name = 'void-war';
    this.space.scene.add(this.root);
    this.navy = new BoltPool(this.root, { color: 0x66ddff, capacity: 120, length: 6, width: 0.3 });
    this.plasma = new BoltPool(this.root, { color: beast.spec.tint, capacity: 60, length: 14, width: 3, shape: 'ball' });
    this.ctx = { shipPos: beast.at, shipVel: ZERO, bolts: this.navy, bodies: [], holdFire: false };
    this.cooldown = 1;
    this.respawn = 0;
    this.aggro = 0;
    for (let n = SQUAD[0] + beast.rng.int(SQUAD[1] - SQUAD[0] + 1); n > 0; n--) this.addDefender();
  }

  addDefender() {
    const r = this.beast.rng;
    const at = randomDir(_a).multiplyScalar(this.beast.hitR * r.range(2.5, 5)).add(this.beast.at);
    this.defenders.push(new Pirate(this.root, r.chance(0.6) ? 'fighter' : 'drone', at));
  }

  // Defenders orbit the creature and shoot it; the navy replaces its losses.
  flyDefenders(dt) {
    this.ctx.shipPos = this.beast.at;
    for (let i = this.defenders.length - 1; i >= 0; i--) {
      const d = this.defenders[i];
      if (d.alive && !d.gone) { d.update(dt, this.ctx); continue; }
      d.dispose();
      this.defenders.splice(i, 1);
    }
    this.respawn -= dt;
    if (this.respawn > 0 || this.defenders.length >= SQUAD[1]) return;
    this.respawn = this.beast.rng.range(...RESPAWN);
    this.addDefender();
  }

  // Navy bolts: moved and tested against the body in the same pass.
  navyHits(dt) {
    this.navy.update(dt, (b) => {
      if (!segmentHits(b.prev, b.pos, this.beast.at, this.beast.hitR)) return false;
      this.hurt(b.damage, b.pos);
      return true;
    });
  }

  // Who it shoots at. Hitting it makes it turn on the player for a while — that is the whole
  // point of shooting a thing this size.
  pickTarget(shipPos) {
    const inReach = shipPos && shipPos.distanceTo(this.beast.at) < REACH;
    const live = this.defenders.filter((d) => d.alive && d.pos.distanceTo(this.beast.at) < REACH);
    if (inReach && (this.aggro > 0 || !live.length || Math.random() < 0.4)) return shipPos;
    return live.length ? live[Math.floor(Math.random() * live.length)].pos : null;
  }

  // Plasma is slow and heavy: it leads the target and hurts, but it can be flown around.
  shoot(dt, shipPos) {
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const target = this.pickTarget(shipPos);
    if (!target) return;
    this.cooldown = FIRE_GAP[0] + Math.random() * (FIRE_GAP[1] - FIRE_GAP[0]);
    const dir = _a.subVectors(target, this.beast.at).normalize();
    const from = _b.copy(this.beast.at).addScaledVector(dir, this.beast.hitR);
    this.plasma.fire(from, _c.copy(dir).multiplyScalar(PLASMA_SPEED), 0, PLASMA_LIFE);
    this.sfx?.enemyLaser?.();
  }

  // Plasma hitting the player or a defender.
  plasmaHits(dt, shipPos) {
    const dmg = this.beast.spec.graze * 0.35;
    this.plasma.update(dt, (b) => {
      if (shipPos && segmentHits(b.prev, b.pos, shipPos, SHIP_R * 3)) {
        this.player?.damageShip(dmg);
        this.space.shake?.(0.45);
        this.fx?.()?.explode(b.pos, { color: this.beast.spec.tint, size: 0.7, debris: false });
        return true;
      }
      for (const d of this.defenders) {
        if (!d.alive || !segmentHits(b.prev, b.pos, d.pos, d.radius + 2)) continue;
        if (d.hit(dmg)) this.fx?.()?.explode(d.pos, { color: 0xff6633, size: 1.6 });
        return true;
      }
      return false;
    });
  }

  // Damage from any source. Returns true when the creature dies.
  hurt(amount, at) {
    const b = this.beast;
    if (b.hp <= 0) return false;
    b.hp -= amount;
    this.fx?.()?.sparks(at, b.spec.tint, 5, 1.4);
    if (b.hp > 0) return false;
    this.kill();
    return true;
  }

  kill() {
    const b = this.beast;
    const fx = this.fx?.();
    for (let i = 0; i < 6; i++) {
      randomDir(_a).multiplyScalar(b.hitR * Math.random());
      fx?.explode(_b.copy(b.at).add(_a), { color: b.spec.tint, size: 3 + Math.random() * 4 });
    }
    this.space.shake?.(2.5);
    this.sfx?.explosion?.(1);
    this.onNotice?.(`${b.name} tewas`);
    this.player?.addItem?.('Nanit', 400 + Math.floor(Math.random() * 400));
    this.onKill?.();
  }

  // A player bolt (from SpaceCombat) against the body. Returns true when it connected.
  boltHit(bolt) {
    const b = this.beast;
    if (!b?.inst || b.hp <= 0 || !segmentHits(bolt.prev, bolt.pos, b.at, b.hitR)) return false;
    this.aggro = AGGRO_TIME; // it now hunts whoever just shot it
    this.cooldown = Math.min(this.cooldown, 0.3);
    this.hurt(bolt.damage, bolt.pos);
    this.player?.emit('hitMarker', { kill: false });
    this.sfx?.hit?.();
    return true;
  }

  update(dt, shipPos) {
    if (!this.beast?.inst || this.beast.hp <= 0) return;
    this.aggro -= dt;
    this.flyDefenders(dt);
    this.navyHits(dt);
    this.shoot(dt, shipPos);
    this.plasmaHits(dt, shipPos);
  }

  dispose() {
    for (const d of this.defenders) d.dispose();
    this.defenders.length = 0;
    this.navy?.dispose();
    this.plasma?.dispose();
    this.root?.removeFromParent();
    this.root = this.navy = this.plasma = null;
    this.beast = null;
  }
}
