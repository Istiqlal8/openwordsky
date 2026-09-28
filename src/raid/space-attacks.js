// Telegraphed attacks for the space bosses. Everything fires through the pools SpaceCombat
// already owns (combat.enemyBolts hurts the ship, combat.fx draws), so nothing new has to be
// stepped or disposed here.
import * as THREE from 'three';
import { Pirate } from '../combat/pirate.js';
import { randomDir } from '../combat/geom.js';

const BOLT_SPEED = 150;
const SHELL_SPEED = 70;      // slow enough to sidestep
const BEAM_WARN = 1.4;       // seconds of warning line before the beam bites
const BEAM_RADIUS = 34;      // how close to the beam line still hurts
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();

export class BossAttacks {
  // ctx: { combat, space, player, sfx, boss }
  constructor(ctx) {
    this.c = ctx;
    this.beam = null;
  }

  get shipPos() { return this.c.space.shipObject.position; }

  // Fast, low-damage suppressing fire from every listed part.
  volley(nodes, damage, spread = 0.05) {
    const { combat } = this.c;
    for (const n of nodes) {
      const from = n.pos ?? n;
      tmpA.subVectors(this.shipPos, from).normalize();
      tmpA.x += (Math.random() - 0.5) * spread * 2;
      tmpA.y += (Math.random() - 0.5) * spread * 2;
      tmpA.z += (Math.random() - 0.5) * spread * 2;
      combat.enemyBolts.fire(from, tmpA.normalize().multiplyScalar(BOLT_SPEED), damage, 4);
    }
    this.c.sfx.enemyLaser?.();
  }

  // Heavy slow shells aimed where the ship is heading: visible, and dodgeable by turning.
  artillery(from, count, damage) {
    const { combat, space } = this.c;
    for (let i = 0; i < count; i++) {
      tmpB.copy(this.shipPos).addScaledVector(space.velocity, 1.6 + i * 0.4);
      tmpA.subVectors(tmpB, from).normalize();
      const b = combat.enemyBolts.fire(from, tmpA.multiplyScalar(SHELL_SPEED), damage, 9);
      if (!b) break;
    }
    this.c.sfx.enemyLaser?.();
  }

  // Charge a lance along a fixed line, then fire it. Standing in the line costs a lot of hull.
  startBeam(from, damage) {
    this.beam = { from: from.clone(), dir: tmpA.subVectors(this.shipPos, from).normalize().clone(), t: 0, damage, fired: false };
    this.c.player.emit('notice', { text: 'Sinar pemusnah mengisi daya — menyingkir dari garisnya!' });
  }

  updateBeam(dt) {
    const b = this.beam;
    if (!b) return;
    b.t += dt;
    const { combat, space } = this.c;
    const warn = b.t < BEAM_WARN;
    tmpB.copy(b.from).addScaledVector(b.dir, 4000);
    combat.fx.beam(b.from, tmpB, warn ? 0xffcc44 : 0xff3a2a, 0.09);
    if (warn) return;
    if (!b.fired) {
      b.fired = true;
      this.c.sfx.explosion?.(0.8);
      space.shake?.(0.6);
      this.hitBeam(b);
    }
    if (b.t > BEAM_WARN + 0.7) this.beam = null;
  }

  // Distance from the ship to the beam's infinite line.
  hitBeam(b) {
    tmpC.subVectors(this.shipPos, b.from);
    const along = Math.max(0, tmpC.dot(b.dir));
    tmpC.sub(tmpB.copy(b.dir).multiplyScalar(along));
    if (tmpC.length() > BEAM_RADIUS || this.c.player.dead) return;
    this.c.player.damageShip(b.damage);
    this.c.combat.fx.sparks(this.shipPos, 0xff5533, 14, 1.2);
  }

  // Real pirates from the existing roster: they fight, die and drop loot like any other squad.
  summon(from, kind, count) {
    const { combat } = this.c;
    const out = [];
    for (let i = 0; i < count; i++) {
      randomDir(tmpA).multiplyScalar(30);
      tmpB.copy(from).add(tmpA);
      const p = new Pirate(combat.root, kind, tmpB);
      combat.pirates.push(p);
      out.push(p);
    }
    return out;
  }
}
