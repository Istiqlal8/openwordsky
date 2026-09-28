// Seeded pirate wave schedule: ~35% of systems are dangerous and get recurring squads.
import { rngOf } from '../core/rng.js';

const WAVE_GAP = 90;

export class PirateWaves {
  constructor(seed) {
    this.rng = rngOf(seed, 0x9a7e);
    this.dangerous = this.rng.chance(0.35);
    const rare = this.rng.chance(0.25);
    this.timer = this.dangerous ? this.rng.range(20, 40) : rare ? this.rng.range(60, 150) : Infinity;
  }

  // Returns the list of ship kinds to spawn now, or null.
  tick(dt, alive) {
    this.timer -= dt;
    if (this.timer > 0) return null;
    if (alive >= 2) { this.timer = 15; return null; }
    this.timer = this.dangerous ? WAVE_GAP + this.rng.range(-10, 10) : Infinity;
    const n = this.dangerous ? 2 + this.rng.int(4) : 1 + this.rng.int(2);
    const kinds = [];
    for (let i = 0; i < n; i++) kinds.push(this.rng.chance(0.55) ? 'fighter' : 'drone');
    return kinds;
  }
}
