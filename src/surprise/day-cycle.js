// Planet day-night clock: sun path across the sky and derived light factors.
import * as THREE from 'three';
import { rngOf } from '../core/rng.js';

const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v) => v * v * (3 - 2 * v);

// timeOfDay: 0 midnight, 0.25 sunrise, 0.5 noon, 0.75 sunset.
export class DayCycle {
  constructor(planet) {
    const rng = rngOf(planet.seed, 0xda7c);
    this.length = rng.range(240, 600); // real seconds per full day
    this.timeOfDay = rng.range(0.3, 0.62); // landings mostly start in daylight
    const az = rng.range(0, TAU), tilt = rng.range(0.15, 0.65);
    this.east = new THREE.Vector3(Math.sin(az), 0, Math.cos(az));
    // Arc axis: mostly up, leaning toward the horizontal "north" so noon is not always overhead.
    this.arc = new THREE.Vector3(Math.cos(az) * Math.sin(tilt), Math.cos(tilt), -Math.sin(az) * Math.sin(tilt));
    this.sunDir = new THREE.Vector3();
    this.elevation = 0;
    this.nightFactor = 0;
    this.twilight = 0;
    this.daylight = 1;
    this.advance(0);
  }

  advance(dt) {
    this.timeOfDay = (this.timeOfDay + dt / this.length) % 1;
    const a = TAU * (this.timeOfDay - 0.25);
    this.sunDir.copy(this.east).multiplyScalar(Math.cos(a)).addScaledVector(this.arc, Math.sin(a));
    const el = this.sunDir.y;
    this.elevation = el;
    this.nightFactor = smooth(clamp01((0.06 - el) / 0.24));
    this.twilight = smooth(clamp01(1 - Math.abs(el - 0.02) / 0.22));
    this.daylight = smooth(clamp01((el + 0.04) / 0.2));
  }
}
