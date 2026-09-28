// Asteroids are solid: the ship bounces off them and takes damage from the impact.
import * as THREE from 'three';

const SHIP_R = 1.2;          // player ship hull radius in space units
const BOUNCE = 0.45;         // how much speed is kept along the surface normal
const DMG_PER_SPEED = 0.35;  // hull damage per unit of closing speed
const MIN_DMG_SPEED = 12;

const n = new THREE.Vector3();

// rocks: [{ pos, r, alive }]. Returns the impact speed (0 when nothing was hit).
export function collideRocks(pos, velocity, rocks) {
  let impact = 0;
  for (const rock of rocks) {
    if (!rock.alive) continue;
    const min = rock.r + SHIP_R;
    n.subVectors(pos, rock.pos);
    const d = n.length();
    if (d >= min) continue;
    if (d < 0.001) n.set(0, 1, 0); else n.divideScalar(d); // dead centre: push straight up
    pos.copy(rock.pos).addScaledVector(n, min);
    const closing = -velocity.dot(n);
    if (closing > 0) {
      velocity.addScaledVector(n, closing * (1 + BOUNCE));
      impact = Math.max(impact, closing);
    }
  }
  return impact;
}

export function rockImpactDamage(speed) {
  return speed > MIN_DMG_SPEED ? (speed - MIN_DMG_SPEED) * DMG_PER_SPEED : 0;
}
