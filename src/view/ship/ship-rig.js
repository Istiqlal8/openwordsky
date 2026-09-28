// Player ship in space: owns the model and drives the camera (chase or cockpit), FOV kick and shake.
import * as THREE from 'three';
import { buildShip } from './ship-model.js';
import { ShipDamage } from './ship-damage.js';
import { BASE_SPEED, BOOST_SPEED } from './ship-flight.js';

const SCALE = 0.14;            // model meters -> space-view units (planets are 2.5..7 units)
const CHASE_UP = 0.55;
const CHASE_BACK = 2.4;
const CHASE_PITCH = -0.07;     // tilt the view down so the ship sits below the crosshair
const FOV_KICK = 14;
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const PITCH_Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), CHASE_PITCH);

export class ShipRig {
  constructor(camera) {
    this.camera = camera;
    this.ship = new THREE.Group();
    this.ship.name = 'player-ship';
    const fill = new THREE.PointLight(0xcfdcff, 2.5, 4, 1); // short-range fill so the hull never goes black
    fill.position.set(0, 1.2, 1.6);
    this.ship.add(fill);
    this.model = null;
    this.mode = 'chase';
    this.camQ = new THREE.Quaternion();
    this.shakeAmt = 0;
    this.glow = 0;
    this.baseFov = camera.fov;
  }

  setDesign(design) {
    this.disposeModel();
    this.design = design;
    this.model = buildShip(design);
    this.model.group.scale.setScalar(SCALE);
    this.model.setLegs(false);
    this.model.group.visible = this.mode === 'chase';
    this.ship.add(this.model.group);
    this.damage?.dispose();
    // Attached to the unscaled ship so the smoke reads at the space model's size.
    this.damage = new ShipDamage(this.ship, (this.model.length ?? 8) * SCALE);
  }

  // hull 0..100 from PlayerState; smoke/fire show the ship taking a beating.
  setHull(hull) {
    this.hull = hull;
  }

  toggleMode() {
    this.mode = this.mode === 'chase' ? 'cockpit' : 'chase';
    if (this.model) this.model.group.visible = this.mode === 'chase';
  }

  // Jump the camera straight to its target (after spawn / teleport).
  snap() {
    this.camQ.copy(this.ship.quaternion);
    this.follow(0, 0);
  }

  shake(amount) {
    this.shakeAmt = Math.min(2, this.shakeAmt + amount);
  }

  update(dt, throttle, speed) {
    this.glow += (Math.max(throttle, Math.min(1, speed / BOOST_SPEED)) - this.glow) * (1 - Math.exp(-6 * dt));
    this.model?.setThrust(this.glow);
    this.damage?.update(dt, this.hull ?? 100);
    this.camQ.slerp(this.ship.quaternion, 1 - Math.exp(-9 * dt));
    this.follow(dt, speed);
    this.updateFov(dt, speed);
  }

  follow(dt, speed) {
    const cam = this.camera;
    if (this.mode === 'cockpit') {
      cam.quaternion.copy(this.ship.quaternion);
      cam.position.copy(tmpV.set(0, 0.08, -0.25).applyQuaternion(this.ship.quaternion).add(this.ship.position));
    } else {
      const back = CHASE_BACK + Math.min(1.2, speed / BOOST_SPEED * 1.2);
      cam.quaternion.copy(this.camQ).multiply(PITCH_Q);
      cam.position.copy(tmpV.set(0, CHASE_UP, back).applyQuaternion(this.camQ).add(this.ship.position));
    }
    this.applyShake(dt);
  }

  applyShake(dt) {
    if (this.shakeAmt < 0.001) return;
    const a = this.shakeAmt * this.shakeAmt;
    const r = () => (Math.random() * 2 - 1) * a;
    this.camera.position.add(tmpV.set(r(), r(), r()).multiplyScalar(0.08));
    this.camera.quaternion.multiply(tmpQ.setFromEuler(tmpE.set(r() * 0.02, r() * 0.02, r() * 0.03)));
    this.shakeAmt *= Math.exp(-5 * dt);
  }

  updateFov(dt, speed) {
    const boost = THREE.MathUtils.clamp((speed - BASE_SPEED) / (BOOST_SPEED - BASE_SPEED), 0, 1);
    const target = this.baseFov + boost * FOV_KICK;
    const fov = this.camera.fov + (target - this.camera.fov) * (1 - Math.exp(-4 * dt));
    if (Math.abs(fov - this.camera.fov) < 0.01) return;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  muzzleWorldPositions() {
    if (!this.model) return [];
    this.ship.updateMatrixWorld(true);
    return this.model.muzzles.map((m) => m.clone().applyMatrix4(this.model.group.matrixWorld));
  }

  disposeModel() {
    this.damage?.dispose();
    this.damage = null;
    if (!this.model) return;
    this.ship.remove(this.model.group);
    this.model.dispose();
    this.model = null;
  }
}
