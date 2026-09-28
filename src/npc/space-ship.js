// One NPC ship in space: model at the player's scale, a screen-space running light so it
// reads from far away, a pulse streak and a warp/landing flash. Decisions live in space-brain.js.
import * as THREE from 'three';
import { buildShip } from '../view/ship/ship-model.js';
import { glowTexture } from '../assets/textures.js';

export const SHIP_SCALE = 0.14;   // same as ShipRig: model meters -> space units
const BEACON = 0.035;             // screen-space size of the running light
const NEAR_FADE = [8, 30];        // beacon fades in between these distances (model takes over)
const FAR_FADE = [4500, 9000];    // and fades out between these
const TURN_RATE = 1.1;            // rad/s
const STREAK_TIME = 0.14;         // seconds of travel drawn as the pulse streak
const UP = new THREE.Vector3(0, 1, 0);
const FWD = new THREE.Vector3(0, 0, -1);
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();

function glowSprite(hex) {
  const mat = new THREE.SpriteMaterial({ map: glowTexture(hex), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: false });
  return new THREE.Sprite(mat);
}

function buildStreak(hex) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const mat = new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: 0.85,
    depthWrite: false, blending: THREE.AdditiveBlending });
  const line = new THREE.Line(geo, mat);
  line.frustumCulled = false;
  line.visible = false;
  return line;
}

const ramp = (x, a, b) => THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);

export class SpaceNpc {
  // info: { id, seed, design, name, captain, cruise }
  constructor(parent, info) {
    Object.assign(this, info);
    this.parent = parent;
    this.root = new THREE.Group();
    this.model = buildShip(info.design);
    this.model.setLegs(false);
    this.model.group.scale.setScalar(SHIP_SCALE);
    this.beacon = glowSprite(info.design.palette.glow);
    this.beacon.scale.setScalar(BEACON);
    this.root.add(this.model.group, this.beacon);
    this.flashSprite = glowSprite(info.design.palette.glow);
    this.flashSprite.visible = false;
    this.streak = buildStreak(info.design.palette.glow);
    parent.add(this.root, this.flashSprite, this.streak);
    this.velocity = new THREE.Vector3();
    this.landDir = new THREE.Vector3(0, 1, 0);
    this.waypoint = new THREE.Vector3();
    this.slot = new THREE.Vector3();
    Object.assign(this, { speed: 0, glow: 0, flashT: 0, flashDur: 1, flashSize: 0, pulsing: false,
      state: 'cruise', timer: 0, pulseCd: 10, target: null, wingmen: [] });
  }

  get position() { return this.root.position; }
  get visible() { return this.root.visible; }

  setVisible(on) {
    this.root.visible = on;
    if (!on) this.pulsing = false;
  }

  // Point the nose (-Z) along a direction immediately.
  face(dir) {
    tmpM.lookAt(this.root.position, tmpV.copy(this.root.position).add(dir), UP);
    this.root.quaternion.setFromRotationMatrix(tmpM);
  }

  // Turn smoothly toward `dir` (unit) and ease speed toward `speed`.
  fly(dt, dir, speed, accel = 1.2) {
    tmpM.lookAt(this.root.position, tmpV.copy(this.root.position).add(dir), UP);
    tmpQ.setFromRotationMatrix(tmpM);
    this.root.quaternion.rotateTowards(tmpQ, TURN_RATE * dt);
    this.speed += (speed - this.speed) * (1 - Math.exp(-accel * dt));
    this.velocity.copy(FWD).applyQuaternion(this.root.quaternion).multiplyScalar(this.speed);
    this.root.position.addScaledVector(this.velocity, dt);
    this.setGlow(dt, Math.min(1, 0.25 + this.speed / 400));
  }

  setGlow(dt, target) {
    this.glow += (target - this.glow) * (1 - Math.exp(-4 * dt));
    this.model.setThrust(this.glow);
  }

  // Wingman: hold a slot in the leader's frame.
  follow(leader, time) {
    this.root.visible = leader.root.visible;
    this.pulsing = leader.pulsing;
    this.speed = leader.speed;
    this.velocity.copy(leader.velocity);
    this.root.quaternion.copy(leader.root.quaternion);
    tmpV.copy(this.slot);
    tmpV.y += Math.sin(time * 0.8 + this.id) * 0.12;
    this.root.position.copy(leader.root.position).add(tmpV.applyQuaternion(leader.root.quaternion));
    this.glow = leader.glow;
    this.model.setThrust(this.glow);
  }

  // Screen-space burst at the current position (size in screen units).
  flash(size, dur) {
    this.flashSprite.position.copy(this.root.position);
    Object.assign(this, { flashSize: size, flashT: dur, flashDur: dur });
    this.flashSprite.visible = true;
  }

  updateFx(dt, camPos) {
    this.updateFlash(dt);
    const d = camPos.distanceTo(this.root.position);
    this.beacon.material.opacity = ramp(d, NEAR_FADE[0], NEAR_FADE[1]) * (1 - ramp(d, FAR_FADE[0], FAR_FADE[1]));
    this.streak.visible = this.pulsing && this.root.visible;
    if (!this.streak.visible) return;
    const arr = this.streak.geometry.attributes.position.array;
    const p = this.root.position, v = this.velocity;
    arr[0] = p.x; arr[1] = p.y; arr[2] = p.z;
    arr[3] = p.x - v.x * STREAK_TIME; arr[4] = p.y - v.y * STREAK_TIME; arr[5] = p.z - v.z * STREAK_TIME;
    this.streak.geometry.attributes.position.needsUpdate = true;
  }

  updateFlash(dt) {
    if (this.flashT <= 0) return;
    this.flashT -= dt;
    const k = Math.max(0, this.flashT / this.flashDur);
    this.flashSprite.visible = k > 0;
    this.flashSprite.scale.setScalar(this.flashSize * (0.4 + (1 - k) * 0.9));
    this.flashSprite.material.opacity = k;
  }

  dispose() {
    this.parent.remove(this.root, this.flashSprite, this.streak);
    this.model.dispose();
    this.beacon.material.dispose();
    this.flashSprite.material.dispose(); // glow textures are cached in textures.js, kept alive
    this.streak.geometry.dispose();
    this.streak.material.dispose();
  }
}
