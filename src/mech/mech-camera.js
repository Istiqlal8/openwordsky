// Every camera move the mech makes: the over-the-shoulder chase framing on a planet, the free-look
// orbit on top of it, the transformation arc shot, the impact shake and the per-shot FOV punch.
// Also holds the frozen aim basis — the guns raycast along that instead of the live camera, so
// swinging the view around the frame never drags the crosshair with it. Allocates nothing.
import * as THREE from 'three';
import { MechOrbit } from './mech-orbit.js';

const SIDE = 0.34;               // camera sits off the mech's right shoulder so the gun reads
const UP = 0.88;
const BACK = 1.82;
const ORBIT_UP = 0.52;
const ORBIT_BACK = 1.95;
const _off = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _arc = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');

export class MechCamera {
  constructor() {
    this.orbit = new MechOrbit();
    this.aim = new THREE.Object3D();   // chase transform, untouched by the orbit
  }

  // Keeps the view's yaw/pitch where they were while the player is orbiting, so the mech's
  // heading (which follows them) stays put.
  holdView(view) {
    if (!this.orbit.held) { this.locked = false; return; }
    if (this.locked) { view.yaw = this.yaw; view.pitch = this.pitch; return; }
    this.locked = true;
    this.yaw = view.yaw;
    this.pitch = view.pitch;
  }

  // Same, for the ship rig the mech rides in space: its heading is the ship's own quaternion.
  holdHeading(rig) {
    if (!this.orbit.held) { this.lockQ = null; return; }
    if (this.lockQ) { rig.ship.quaternion.copy(this.lockQ); rig.camQ.copy(this.lockQ); return; }
    this.lockQ = rig.ship.quaternion.clone();
  }

  // Planet chase framing, then the orbit blended over it.
  ground(cam, pos, d, view, kick) {
    cam.rotation.set(view.pitch, view.yaw, 0);
    _off.set(d.H * SIDE, d.H * UP, d.H * BACK + kick * d.H * 0.55).applyEuler(cam.rotation);
    cam.position.copy(pos).add(_off);
    this.aim.position.copy(cam.position);
    this.aim.quaternion.copy(cam.quaternion);
    if (!this.orbit.live) return;
    _mid.set(pos.x, pos.y + d.H * 0.5, pos.z);
    _q.setFromEuler(_e.set(view.pitch + this.orbit.pitch, view.yaw + this.orbit.yaw, 0));
    _arc.set(0, d.H * ORBIT_UP, d.H * ORBIT_BACK).applyQuaternion(_q).add(_mid);
    cam.position.lerp(_arc, this.orbit.t);
    cam.quaternion.slerp(_q, this.orbit.t);
  }

  // Space: the ship rig has already placed the camera; swing it around the mech on top of that.
  // The caller snapshots `aim` earlier in the frame, before its guns raycast.
  space(cam, rig, mech, unit) {
    if (!this.orbit.live) return;
    mech.group.getWorldPosition(_mid);
    _mid.y += unit * 0.5;
    _q.setFromEuler(_e.set(this.orbit.pitch, this.orbit.yaw, 0)).premultiply(rig.camQ);
    _arc.set(0, unit * 0.3, unit * 2.3).applyQuaternion(_q).add(_mid);
    cam.position.lerp(_arc, this.orbit.t);
    cam.quaternion.slerp(_q, this.orbit.t);
  }

  // Transformation shot: the camera swings around the frame, pulls back and settles into the
  // normal chase framing exactly as the mech finishes standing up.
  arc(cam, pos, d, view, tr) {
    const w = tr.cine;
    if (w <= 0.001) return;
    const a = view.yaw + tr.arc, dist = d.H * (1.25 + tr.kick * 0.55);
    _arc.set(pos.x + Math.sin(a) * dist, pos.y + d.H * (0.46 + tr.kick * 0.34), pos.z + Math.cos(a) * dist);
    cam.position.lerp(_arc, w);
    if (w > 0.03) cam.lookAt(_mid.set(pos.x, pos.y + d.H * 0.52, pos.z));
  }

  shake(cam, amount) {
    cam.position.x += (Math.random() * 2 - 1) * amount;
    cam.position.y += (Math.random() * 2 - 1) * amount;
  }

  // A short FOV punch per shot; heavy weapons push it hardest. Returns the decayed kick.
  fov(cam, dt, base, kick) {
    const next = kick * Math.exp(-7 * dt) < 0.02 ? 0 : kick * Math.exp(-7 * dt);
    const want = base + next;
    if (Math.abs(cam.fov - want) > 0.02) { cam.fov = want; cam.updateProjectionMatrix(); }
    return next;
  }
}
