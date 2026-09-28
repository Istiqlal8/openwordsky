// Village resident: wanders between buildings, works at them, looks around, and turns to
// wave and talk when the player comes close. The vendor stays at its stall.
import * as THREE from 'three';
import { isDryFlat } from '../npc/terrain-spots.js';

const SPEED = { vorran: 1.1, ksirr: 2.1, blubo: 0.9, mekanid: 1.4, aquor: 1.3 };
const GREET_RANGE = 8, LEAVE_RANGE = 11;
const rand = (a, b) => a + Math.random() * (b - a);

export class AlienResident {
  // info: { id, name, body: AlienBody, home: {x, z}, radius, spots: [{x, z}], vendor, start: {x, z}, yaw }
  constructor(scene, info) {
    Object.assign(this, info);
    this.feet = new THREE.Vector3(info.start.x, 0, info.start.z);
    this.goal = new THREE.Vector3();
    this.speed = SPEED[info.body.race.id] ?? 1.2;
    Object.assign(this, { state: 'idle', timer: rand(0.5, 3), gesture: 'none', moving: 0, playerDist: Infinity });
    scene.add(this.body.group);
  }

  get race() { return this.body.race; }

  setState(state, timer, gesture = 'none') {
    Object.assign(this, { state, timer, gesture });
  }

  update(dt, h, planet, player) {
    this.timer -= dt;
    this.playerDist = Math.hypot(player.x - this.feet.x, player.z - this.feet.z);
    this.moving = 0;
    this.react(player);
    this.act(dt, h, planet, player);
    this.feet.y = h(this.feet.x, this.feet.z);
    const g = this.body.group;
    g.position.copy(this.feet);
    g.rotation.y = this.yaw;
    this.body.update(dt, this.moving, this.gesture);
  }

  // Player close: stop, turn, wave, then chat; resume life when the player leaves.
  react(player) {
    const near = this.playerDist < GREET_RANGE;
    if (near && this.state !== 'greet') this.setState('greet', 2.2, 'wave');
    else if (this.state === 'greet' && this.playerDist > LEAVE_RANGE) this.setState('idle', rand(1, 2));
  }

  act(dt, h, planet, player) {
    const s = this.state;
    if (s === 'greet') {
      this.turnTo(dt, player.x, player.z);
      if (this.timer <= 0) this.gesture = 'talk';
      return;
    }
    if (s === 'walk' && !this.walk(dt, h, planet)) return;
    if ((s === 'idle' || s === 'work') && this.timer > 0) return;
    this.decide(h, planet);
  }

  decide(h, planet) {
    if (this.vendor) return this.setState('work', rand(3, 7), Math.random() < 0.5 ? 'work' : 'look');
    const r = Math.random();
    if (this.state === 'walk' && this.goalIsSpot) return this.setState('work', rand(4, 9), 'work');
    if (r < 0.3) return this.setState('idle', rand(2, 5), Math.random() < 0.5 ? 'look' : 'none');
    this.goalIsSpot = r < 0.65 && this.spots.length > 0;
    if (this.goalIsSpot) {
      const sp = this.spots[Math.floor(Math.random() * this.spots.length)];
      this.goal.set(sp.x, 0, sp.z);
    } else if (!this.randomGoal(h, planet)) return this.setState('idle', 2);
    this.setState('walk', 30);
  }

  randomGoal(h, planet) {
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2, d = rand(4, this.radius);
      const x = this.home.x + Math.cos(a) * d, z = this.home.z + Math.sin(a) * d;
      if (isDryFlat(h, planet, x, z)) { this.goal.set(x, 0, z); return true; }
    }
    return false;
  }

  // Step toward the goal; true on arrival (or timeout).
  walk(dt, h, planet) {
    const dx = this.goal.x - this.feet.x, dz = this.goal.z - this.feet.z, d = Math.hypot(dx, dz);
    if (d < 0.8 || this.timer <= 0) return true;
    this.turnTo(dt, this.goal.x, this.goal.z);
    const step = Math.min(d, this.speed * dt);
    this.feet.x += (dx / d) * step;
    this.feet.z += (dz / d) * step;
    this.moving = this.speed;
    return false;
  }

  turnTo(dt, x, z) {
    const want = Math.atan2(-(x - this.feet.x), -(z - this.feet.z));
    const diff = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw));
    this.yaw += diff * (1 - Math.exp(-5 * dt));
  }

  dispose() {
    this.body.dispose();
  }
}
