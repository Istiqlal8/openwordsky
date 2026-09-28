// Hit resolution for ship primary weapons in space: bolts (with plasma splash), seeker missiles
// and the continuous beam against pirates and asteroids. Damage goes through SpaceCombat.
import * as THREE from 'three';
import { segmentHits } from './geom.js';

const tmpV = new THREE.Vector3();
const tmpE = new THREE.Vector3();

export class SpaceGunHits {
  constructor(combat) {
    this.combat = combat;
    this.bolt = (b) => this.boltHit(b);
    this.seeker = (r) => this.seekerHit(r);
    this.detonate = (r) => this.explode(r.pos, r.damage, r.radius);
  }

  boltHit(b) {
    if (!this.combat.playerBoltHit(b)) return false;
    if (b.splash) this.explode(b.pos, b.damage * 0.5, b.splash, 0x8dff3a);
    return true;
  }

  seekerHit(r) {
    const c = this.combat;
    for (const p of c.pirates) if (p.alive && segmentHits(r.prev, r.pos, p.pos, p.radius + 2)) return true;
    return Boolean(c.asteroids.hitSegment(r.prev, r.pos, 0.5));
  }

  // Area damage: full near the centre, half toward the edge.
  explode(pos, damage, radius, color = 0xffaa55) {
    const c = this.combat;
    c.fx.explode(pos, { color, size: 0.5 + radius * 0.1, debris: radius > 6 });
    c.sfx.explosion?.(Math.min(0.6, radius * 0.05));
    for (const p of c.pirates) {
      const d = p.pos.distanceTo(pos) - p.radius;
      if (p.alive && d < radius) c.damagePirate(p, damage * (d < radius * 0.4 ? 1 : 0.5), p.pos);
    }
    for (const rock of c.asteroids.visible) {
      if (rock.alive && rock.pos.distanceTo(pos) - rock.r < radius * 0.6) c.damageRock(rock, damage, rock.pos);
    }
  }

  // Nearest pirate or asteroid along the ray; applies `amount` damage when > 0. Returns hit distance.
  beamCast(from, dir, range, amount) {
    const c = this.combat;
    let best = range, target = null;
    for (const p of c.pirates) {
      if (!p.alive) continue;
      tmpV.subVectors(p.pos, from);
      const t = tmpV.dot(dir);
      const off2 = tmpV.lengthSq() - t * t, r2 = p.radius * p.radius;
      if (t < 0 || off2 > r2) continue;
      const d = t - Math.sqrt(r2 - off2);
      if (d < best) { best = Math.max(0, d); target = p; }
    }
    tmpE.copy(from).addScaledVector(dir, best);
    const rock = c.asteroids.hitSegment(from, tmpE);
    if (rock) {
      best = Math.max(0, tmpV.subVectors(rock.pos, from).dot(dir) - rock.r * 0.9);
      target = null;
    }
    if (amount <= 0) return best;
    tmpE.copy(from).addScaledVector(dir, best);
    if (target) c.damagePirate(target, amount, tmpE);
    else if (rock) c.damageRock(rock, amount, tmpE);
    return best;
  }
}
