// Take-off from the hangar pad: the ship lifts, retracts its legs and flies out through the
// plan's space door (-Z) while the camera follows. `done` turns true once it is past the door.
import * as THREE from 'three';

const LIFT_TIME = 1.4, LIFT = 2.6, ACCEL = 26;
const CHASE = new THREE.Vector3(0, 3.2, 15);
const _look = new THREE.Vector3(), _goal = new THREE.Vector3();

export class Launch {
  constructor(model, camera, door) {
    this.model = model;
    this.camera = camera;
    this.door = door;
    this.active = false;
    this.done = false;
  }

  start() {
    this.active = true;
    this.done = false;
    this.t = 0;
    this.speed = 0;
    this.baseY = this.model.group.position.y;
    this.model.setLegs(false);
  }

  update(dt) {
    if (!this.active) return;
    const g = this.model.group;
    this.t += dt;
    const lift = Math.min(1, this.t / LIFT_TIME);
    g.position.y = this.baseY + LIFT * (1 - (1 - lift) ** 2);
    if (this.t > LIFT_TIME * 0.7) {
      this.speed += ACCEL * dt;
      g.position.z -= this.speed * dt;
    }
    g.rotation.x = Math.min(0.08, this.speed * 0.004);
    this.model.setThrust(this.t < LIFT_TIME ? 0.35 : Math.min(1, 0.4 + this.speed / 40));
    this.follow(dt);
    if (g.position.z < this.door.z - 25 || this.t > 6) this.done = true;
  }

  // Ease the camera toward a chase position behind the ship; stop at the door so it watches it leave.
  follow(dt) {
    const g = this.model.group, cam = this.camera;
    _goal.copy(g.position).add(CHASE);
    _goal.z = Math.min(Math.max(_goal.z, this.door.z + 6), this.door.back ?? Infinity);
    _goal.y = Math.min(_goal.y, this.door.h - 1);
    cam.position.lerp(_goal, 1 - Math.exp(-2.5 * dt));
    _look.set(g.position.x, g.position.y + 0.5, g.position.z - 6);
    cam.lookAt(_look);
  }
}
