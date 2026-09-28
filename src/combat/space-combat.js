// SpaceCombat: weapons, asteroids, pirates and death handling for the space view.
import * as THREE from 'three';
import { FxSystem } from '../fx/explosion.js';
import { BoltPool } from './bolts.js';
import { RocketPool } from './rockets.js';
import { AsteroidField } from './asteroids.js';
import { Pirate } from './pirate.js';
import { PirateWaves } from './waves.js';
import { PlayerWeapons } from './weapons.js';
import { rockLoot, pirateLoot } from './loot.js';
import { segmentHits, pushOut, randomDir } from './geom.js';
import { shipObject, setShipVisible } from './ship-ref.js';

const SHIP_RADIUS = 2.4;
const BOOST_DRAIN = 4;
const ROCKET_DAMAGE = 45;
const ROCKET_RADIUS = 16;
const RESPAWN_GRACE = 5;
const tmpN = new THREE.Vector3();
const tmpV = new THREE.Vector3();

export class SpaceCombat {
  constructor(space, player, sfx) {
    this.space = space;
    this.player = player;
    this.sfx = sfx ?? {};
    this.fx = null; // null = not built (before first mount / after dispose)
    this.pirates = [];
    this.asteroids = null;
    this.system = null;
    this.dead = player.dead;
    this.grace = 0;
    this.bumpCd = 0;
    this.alarm = false;
    this.nearest = { position: null, distance: 0 };
    this.bindCallbacks();
  }

  // Scene objects and pools; created on mount, freed by dispose, rebuilt on the next mount.
  build() {
    const { space, player } = this;
    this.root = new THREE.Group();
    this.root.name = 'combat';
    space.scene.add(this.root);
    this.fx = new FxSystem(space.scene);
    this.playerBolts = new BoltPool(this.root, { color: 0x44ccff, length: 7, width: 0.32 });
    this.enemyBolts = new BoltPool(this.root, { color: 0xff2a18, capacity: 120, length: 2.6, width: 0.2 });
    this.rockets = new RocketPool(this.root);
    this.weapons = new PlayerWeapons({ space, player, sfx: this.sfx, fx: this.fx, bolts: this.playerBolts, rockets: this.rockets });
    this.ctx = { shipPos: null, shipVel: space.velocity, bolts: this.enemyBolts, bodies: [], holdFire: false,
      onFire: () => this.sfx.enemyLaser?.() };
    player.on('shipDestroyed', this.onDestroyed);
  }

  // Pre-bound callbacks so the per-frame loops allocate nothing.
  bindCallbacks() {
    this.onDestroyed = () => this.handleDeath();
    this.onPlayerBolt = (b) => this.playerBoltHit(b);
    this.onEnemyBolt = (b) => this.enemyBoltHit(b);
    this.onRocketHit = (r) => this.rocketHit(r);
    this.onRocketBlast = (r) => this.blast(r.pos);
  }

  mount(system) {
    if (this.fx) this.clearSystem();
    else this.build();
    this.system = system;
    this.dead = this.player.dead;
    const orbits = (this.space.bodies ?? []).map((b) => b.planet?.orbit?.radius ?? 0);
    this.asteroids = new AsteroidField(this.root, system, orbits);
    this.waves = new PirateWaves(system.seed);
  }

  update(dt, input) {
    if (!this.system) return;
    dt = Math.min(dt, 0.1);
    const shipPos = shipObject(this.space).position;
    this.player.tickShip(dt);
    this.drainBoost(dt, input);
    this.grace -= dt;
    this.asteroids.update(dt, shipPos);
    if (!this.dead) this.weapons.update(dt, input, this.pirates);
    this.updatePirates(dt, shipPos);
    this.playerBolts.update(dt, this.onPlayerBolt);
    this.enemyBolts.update(dt, this.onEnemyBolt);
    this.rockets.update(dt, this.fx, this.onRocketHit, this.onRocketBlast);
    if (!this.dead) this.bumpAsteroids(dt, shipPos);
    if (!this.dead) this.spawnWaves(dt, shipPos);
    this.fx.update(dt);
  }

  drainBoost(dt, input) {
    if (!input.down('ShiftLeft') || this.space.velocity.length() < 35) return;
    this.player.ship.energy = Math.max(0, this.player.ship.energy - BOOST_DRAIN * dt);
  }

  get boostAllowed() {
    return this.player.ship.energy > 1;
  }

  get hostiles() {
    return this.pirates.length;
  }

  get lockTarget() {
    return this.weapons?.lockTarget ?? null;
  }

  nearestHostile() {
    const shipPos = shipObject(this.space).position;
    let best = null;
    let bestD = Infinity;
    for (const p of this.pirates) {
      const d = p.pos.distanceTo(shipPos);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (!best) return null;
    this.nearest.position = best.pos;
    this.nearest.distance = bestD;
    return this.nearest;
  }

  updatePirates(dt, shipPos) {
    const ctx = this.ctx;
    ctx.shipPos = shipPos;
    ctx.bodies = this.space.bodies ?? [];
    ctx.holdFire = this.dead || this.grace > 0;
    for (let i = this.pirates.length - 1; i >= 0; i--) {
      const p = this.pirates[i];
      if (p.alive && !p.gone) p.update(dt, ctx);
      if (p.alive && !p.gone) continue;
      p.dispose();
      this.pirates.splice(i, 1);
    }
    if (this.alarm && !this.pirates.length) this.setAlarm(false);
  }

  spawnWaves(dt, shipPos) {
    const kinds = this.waves.tick(dt, this.pirates.length);
    if (!kinds) return;
    const base = randomDir(tmpV).multiplyScalar(520).add(shipPos);
    for (const kind of kinds) {
      const at = randomDir(tmpN).multiplyScalar(40).add(base);
      this.pirates.push(new Pirate(this.root, kind, at));
    }
    this.setAlarm(true);
    this.player.emit('pirates', { count: kinds.length });
  }

  setAlarm(on) {
    this.alarm = on;
    this.sfx.alarm?.(on);
  }

  playerBoltHit(b) {
    for (const p of this.pirates) {
      if (!p.alive || !segmentHits(b.prev, b.pos, p.pos, p.radius)) continue;
      this.damagePirate(p, b.damage, b.pos);
      return true;
    }
    const rock = this.asteroids.hitSegment(b.prev, b.pos);
    if (!rock) return false;
    this.damageRock(rock, b.damage, b.pos);
    return true;
  }

  enemyBoltHit(b) {
    if (this.asteroids.hitSegment(b.prev, b.pos)) {
      this.fx.sparks(b.pos, 0xff5533, 4, 0.4);
      return true;
    }
    const shipPos = shipObject(this.space).position;
    if (this.dead || !segmentHits(b.prev, b.pos, shipPos, SHIP_RADIUS)) return false;
    this.hurtShip(b.damage, b.pos);
    return true;
  }

  rocketHit(r) {
    for (const p of this.pirates) if (p.alive && segmentHits(r.prev, r.pos, p.pos, p.radius + 3)) return true;
    return Boolean(this.asteroids.hitSegment(r.prev, r.pos, 0.5));
  }

  // Rocket detonation: full damage near the centre, half at the edge of the blast.
  blast(pos) {
    const mult = this.weapons.damageMult;
    this.fx.explode(pos, { color: 0xffaa55, size: 1.6 });
    this.sfx.explosion?.(0.6);
    for (const p of this.pirates) {
      const d = p.pos.distanceTo(pos) - p.radius;
      if (p.alive && d < ROCKET_RADIUS) this.damagePirate(p, ROCKET_DAMAGE * mult * (d < 6 ? 1 : 0.5), p.pos);
    }
    for (const rock of this.asteroids.visible) {
      if (rock.alive && rock.pos.distanceTo(pos) - rock.r < ROCKET_RADIUS * 0.6) this.damageRock(rock, ROCKET_DAMAGE, rock.pos);
    }
    if (shipObject(this.space).position.distanceTo(pos) < 40) this.space.shake?.(0.4);
  }

  damagePirate(p, dmg, at) {
    this.fx.sparks(at, 0xffc080, 6, 0.6);
    this.player.emit('hitMarker', { kill: false });
    this.sfx.hit?.();
    if (!p.hit(dmg)) return;
    this.fx.explode(p.pos, { color: 0xff6633, size: 2.2 });
    this.sfx.explosion?.(0.7);
    pirateLoot(this.player);
    this.player.emit('kill', { what: p.kind.name });
    this.player.emit('act', { type: 'pirate' });
  }

  damageRock(rock, dmg, at) {
    this.fx.sparks(at, 0xd8c0a0, 4, 0.5);
    if (!this.asteroids.damage(rock, dmg)) return;
    this.fx.explode(rock.pos, { color: 0xc89060, size: 0.4 + rock.r * 0.25 });
    this.sfx.explosion?.(0.25);
    rockLoot(this.player, rock.r);
    this.player.emit('act', { type: 'asteroid' });
    this.sfx.pickup?.();
  }

  hurtShip(dmg, at) {
    const shielded = this.player.ship.shield > 0;
    this.player.damageShip(dmg);
    if (shielded) this.sfx.shieldHit?.();
    else this.sfx.hit?.();
    this.fx.sparks(at, shielded ? 0x66ccff : 0xffaa55, 8, 0.5);
    this.space.shake?.(0.35);
  }

  // Ship vs rocks: push out, bounce, and hurt on hard impacts.
  bumpAsteroids(dt, shipPos) {
    this.bumpCd -= dt;
    const vel = this.space.velocity;
    for (const rock of this.asteroids.visible) {
      if (!rock.alive || pushOut(shipPos, rock.pos, rock.r * 0.95 + SHIP_RADIUS * 0.75, tmpN) <= 0) continue;
      const vn = vel.dot(tmpN);
      if (vn >= 0) continue;
      vel.addScaledVector(tmpN, -1.5 * vn);
      if (this.bumpCd > 0 || -vn < 4) continue;
      this.bumpCd = 0.5;
      this.hurtShip(Math.min(35, -vn * 0.45), tmpV.copy(shipPos).addScaledVector(tmpN, -SHIP_RADIUS));
    }
  }

  handleDeath() {
    if (this.dead || !this.fx) return;
    this.dead = true;
    const pos = shipObject(this.space).position;
    this.fx.explode(pos, { color: 0xffaa55, size: 3.5 });
    this.fx.explode(pos, { color: 0xff4422, size: 2, debris: false });
    this.space.setControlsEnabled?.(false);
    setShipVisible(this.space, false);
    this.space.shake?.(2);
    this.sfx.explosion?.(1);
    this.weapons.setLock(null);
  }

  // Called by main after player.respawn().
  onRespawn() {
    this.dead = false;
    this.grace = RESPAWN_GRACE;
    this.enemyBolts?.clear();
    const shipPos = shipObject(this.space).position;
    for (const p of this.pirates) p.relocate(shipPos, 700);
    this.space.setControlsEnabled?.(true);
    setShipVisible(this.space, true);
  }

  clearSystem() {
    for (const p of this.pirates) p.dispose();
    this.pirates.length = 0;
    this.playerBolts.clear();
    this.enemyBolts.clear();
    this.rockets.clear();
    this.fx.clear();
    this.asteroids?.dispose();
    this.asteroids = null;
    this.weapons.setLock(null);
    if (this.alarm) this.setAlarm(false);
  }

  // Frees everything; safe to call repeatedly. A later mount() rebuilds.
  dispose() {
    if (!this.fx) return;
    this.clearSystem();
    const list = this.player.listeners?.shipDestroyed;
    if (list?.includes(this.onDestroyed)) list.splice(list.indexOf(this.onDestroyed), 1);
    this.playerBolts.dispose();
    this.enemyBolts.dispose();
    this.rockets.dispose();
    this.fx.dispose();
    this.root.removeFromParent();
    this.fx = this.root = this.playerBolts = this.enemyBolts = this.rockets = this.weapons = this.ctx = null;
    this.system = null;
  }
}
