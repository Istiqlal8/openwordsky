// Friendly base residents: astronauts strolling between the plaza and the building doors.
import * as THREE from 'three';
import { Astronaut } from '../view/astronaut.js';
import { groundY } from './site.js';

const ACCENTS = [0x5fd4ff, 0x9cff6a, 0xff6ab4, 0xffd24a];
const WALK = 1.7;

class Resident {
  constructor(scene, accent, start, seed) {
    this.suit = new Astronaut(accent);
    this.suit.mats.suit.color.lerp(new THREE.Color(accent), 0.3); // tell residents apart from the player
    scene.add(this.suit.group);
    this.feet = new THREE.Vector3(start.x, 0, start.z);
    this.target = start;
    this.hub = { x: 0, z: 0 };
    this.yaw = seed;
    this.pause = seed % 3;
    this.speed = 0;
  }

  // spots: [{x, z}] world waypoints (index 0 = plaza hub); rand: () => [0, 1).
  update(dt, ctx, spots, rand) {
    this.speed = 0;
    if (this.pause > 0) this.pause -= dt;
    else if (this.walk(dt)) this.next(spots, rand);
    this.feet.y = groundY(ctx.h, ctx.planet, this.feet.x, this.feet.z) + 0.1;
    this.suit.update(dt, this.feet, this.yaw, this.speed, true);
  }

  // Doors always route through the plaza hub so residents stay on the paths.
  next(spots, rand) {
    this.pause = 1.5 + rand() * 4;
    if (this.target === this.hub) {
      this.target = spots[1 + Math.floor(rand() * (spots.length - 1))];
      return;
    }
    const a = rand() * Math.PI * 2, r = rand() * 4;
    this.hub.x = spots[0].x + Math.cos(a) * r;
    this.hub.z = spots[0].z + Math.sin(a) * r;
    this.target = this.hub;
  }

  walk(dt) {
    const dx = this.target.x - this.feet.x, dz = this.target.z - this.feet.z, d = Math.hypot(dx, dz);
    if (d < 0.3) return true;
    const want = Math.atan2(-dx, -dz), diff = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw));
    this.yaw += diff * Math.min(1, dt * 5);
    const step = Math.min(d, WALK * dt);
    this.feet.x += (dx / d) * step;
    this.feet.z += (dz / d) * step;
    this.speed = 4; // limb swing rate / amplitude in Astronaut.update
    return false;
  }

  dispose() { this.suit.dispose(); }
}

export class Residents {
  // spots: world waypoints, spots[0] = plaza hub.
  constructor(scene, spots, count = 3) {
    this.spots = spots;
    this.seed = 12345;
    this.list = [];
    for (let i = 0; i < count; i++) {
      const start = spots[(i * 2 + 1) % spots.length];
      this.list.push(new Resident(scene, ACCENTS[i % ACCENTS.length], start, i * 1.7));
    }
    this.rand = () => ((this.seed = (this.seed * 16807) % 2147483647) / 2147483647);
  }

  update(dt, ctx) {
    for (const r of this.list) r.update(dt, ctx, this.spots, this.rand);
  }

  dispose() {
    for (const r of this.list) r.dispose();
    this.list = [];
  }
}
