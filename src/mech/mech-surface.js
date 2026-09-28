// The mech walking on a planet. It replaces the astronaut: the player's feet become the mech's
// feet, the camera rides on its shoulder, and the on-foot tools stand down (the surface view
// reports `flying` while the pilot is inside, exactly as it does in the ship).
import * as THREE from 'three';
import { MechPose } from './mech-pose.js';
import { Transform } from './mech-transform.js';
import { MechSurfaceGuns } from './mech-surface-guns.js';
import { transformSfx, stompSfx } from './mech-sfx.js';
import { stopFlight, launchShip, parkShip, shadowView } from './mech-handover.js';

const WALK = 17, RUN = 36;
const JUMP_V = 24, JET_ACCEL = 34, JET_MAX = 14, JET_TIME = 1.4;
const BOARD_RANGE = 26;
const TURN = 6;                  // yaw follow rate: the body lags the camera
const BODY_YAW = 0.42;           // bladed stance while standing; it straightens out at a run
const CAM_SIDE = 0.34;           // camera sits off the mech's right shoulder so the gun reads
const _off = new THREE.Vector3();
const _foot = new THREE.Vector3();

export class MechSurface {
  constructor({ player, sfx }) {
    Object.assign(this, { player, sfx });
    this.active = false;
    this.pos = new THREE.Vector3();
    this.velY = 0;
    this.jet = 1;
    this.shake = 0;
    this.heading = 0;
    this.bodyYaw = 0;
    this.tr = new Transform();
    this.env = { speed: 0, runSpeed: RUN, airborne: false, root: this.pos, cos: 1, sin: 0, groundAt: null };
  }

  get busy() { return this.tr.busy; }
  get weapon() { return this.guns?.weapon ?? '—'; }
  get weaponHud() { return this.guns?.hud() ?? null; }

  // Either flying the ship (it transforms in mid-air) or standing next to it on foot.
  canEnter(surface) {
    if (surface?.flight?.active) return true;
    const ship = surface?.shipPosition;
    return Boolean(ship) && ship.distanceTo(surface.feet) < BOARD_RANGE;
  }

  enter(mech, ctx) {
    const s = ctx.surface;
    this.mech = mech;
    this.ctx = ctx;
    this.view = s;
    this.pose = new MechPose(mech);
    this.pose.onStep = (i) => this.footfall(i);
    this.guns = new MechSurfaceGuns(ctx, mech);
    this.guns.onShake = (a) => { this.shake = Math.min(1.6, this.shake + a); };
    this.guns.onFov = (a) => { this.fovKick = Math.min(11, this.fovKick + a); };
    this.fovKick = 0;
    this.baseFov = s.camera.fov;
    this.env.groundAt = (x, z) => s.floorAt(x, z);
    this.fromFlight = Boolean(s.flight?.active);
    const at = s.shipPosition ?? s.feet;
    if (this.fromFlight) this.pos.copy(s.landed.model.group.position);
    else this.pos.set(at.x, s.floorAt(at.x, at.z), at.z);
    this.heading = s.yaw;
    this.velY = this.fromFlight ? Math.min(0, s.flight.velocity.y) : 0;
    this.dropJets = this.fromFlight ? 1.2 : 0;
    this.crouchT = 0;
    this.jet = 1;
    if (this.fromFlight) stopFlight(s);
    mech.group.scale.setScalar(1);
    mech.setWorldScale(1);
    mech.group.position.copy(this.pos);
    mech.group.rotation.set(0, this.heading, 0);
    s.scene.add(mech.group);
    if (s.landed) s.landed.model.setLegs(false);
    this.active = true;
    this.shadow(true);
    this.tr.t = 0;
    this.tr.start(1);
    transformSfx(this.sfx, true);
  }

  leave() {
    this.tr.start(-1);
    transformSfx(this.sfx, false);
  }

  // Fold back into the ship where the mech stands and drop the pilot beside it.
  detach() {
    const s = this.view;
    if (s?.planet && s.landed) this.handOver(s);
    this.shadow(false);
    if (s?.camera && this.baseFov) { s.camera.fov = this.baseFov; s.camera.updateProjectionMatrix(); }
    this.mech?.group.removeFromParent();
    this.pose?.dispose();
    this.guns?.dispose();
    this.guns = null;
    this.mech = null;
    this.ctx = null;
    this.view = null;
    this.active = false;
    this.tr.finish(false);
  }

  // High enough and the ship comes back flying; otherwise it parks where the mech stands.
  handOver(s) {
    const h = this.mech.design.d.H;
    if (this.pos.y > s.floorAt(this.pos.x, this.pos.z) + h * 0.4) launchShip(s, this.pos, this.heading, h * 0.45);
    else parkShip(s, this.pos, this.heading);
  }

  shadow(on) {
    this.shadowed = shadowView(this.view, on, this.shadowed, () => this.active);
  }

  update(dt, input) {
    if (!this.active) return;
    const s = this.ctx.surface;
    this.tr.update(dt);
    this.mech.group.visible = this.tr.mechVisible;
    this.mech.setDeploy(this.tr.deploy);
    if (this.tr.busy) this.morphShip(s);
    if (this.tr.t <= 0 && !this.tr.busy) { this.detach(); return; }
    const live = this.tr.t >= 1 && !this.player.dead;
    this.move(dt, live ? input : IDLE, s);
    this.animate(dt, s);
    if (live) {
      this.pose.weapons(dt, this.guns.ctlFor(s.pitch * 0.8, yawGap(s.yaw, this.heading), this.bodyYaw));
      this.guns.update(dt, input, this.pose);
      if (this.ctx.gameplay?.rig) this.ctx.gameplay.rig.wheel = 0; // the wheel belongs to the mech
    } else {
      this.pose.weapons(dt);
    }
    this.takeOver(s, dt);
  }

  // During the sequence the ship stands where the mech does and folds away as it unfolds.
  morphShip(s) {
    const model = s.landed?.model;
    if (!model) return;
    model.group.visible = this.tr.shipVisible;
    model.group.scale.setScalar(Math.max(0.001, this.tr.shipScale));
    model.group.position.set(this.pos.x, this.pos.y + model.groundOffset, this.pos.z);
    model.group.rotation.set((1 - this.tr.shipScale) * -0.9, this.heading, 0);
  }

  move(dt, input, s) {
    const sprint = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = sprint ? RUN : WALK;
    let f = (input.down('KeyW') ? 1 : 0) - (input.down('KeyS') ? 1 : 0);
    let r = (input.down('KeyD') ? 1 : 0) - (input.down('KeyA') ? 1 : 0);
    const len = Math.hypot(f, r);
    if (len > 0) { f /= len; r /= len; }
    const sin = Math.sin(s.yaw), cos = Math.cos(s.yaw);
    this.pos.x += (-sin * f + cos * r) * speed * dt;
    this.pos.z += (-cos * f - sin * r) * speed * dt;
    this.env.speed = len > 0 ? speed : 0;
    this.gravity(dt, input, s);
    this.heading = turnToward(this.heading, s.yaw, dt * TURN);
  }

  gravity(dt, input, s) {
    const g = s.planet?.gravity || 9.8;
    const floor = s.floorAt(this.pos.x, this.pos.z);
    const grounded = this.pos.y <= floor + 0.05;
    if (grounded && input.pressed('Space')) { this.velY = JUMP_V; this.jet = 1; this.sfx.jump?.(); }
    this.velY -= g * dt * 1.7;   // heavy: it comes down fast
    if (!grounded && input.down('Space') && this.jet > 0) {
      this.velY = Math.min(JET_MAX, this.velY + JET_ACCEL * dt);
      this.jet = Math.max(0, this.jet - dt / JET_TIME);
      this.jets = true;
    } else this.jets = false;
    this.pos.y += this.velY * dt;
    if (this.pos.y <= floor) {
      if (this.velY < -14) this.land(-this.velY);
      this.pos.y = floor;
      this.velY = 0;
      if (grounded) this.jet = Math.min(1, this.jet + dt / 1.6);
    }
    this.env.airborne = this.pos.y > floor + 0.4;
  }

  land(impact) {
    this.crouchT = Math.min(1, 0.35 + impact * 0.03);
    this.shake = Math.min(1.6, this.shake + impact * 0.03);
    stompSfx(this.sfx, 1.4);
    this.ctx.fx?.puff(this.pos, 0x9a8f7e, this.mech.design.d.footW * 4, 1.2);
    this.guns?.stomp(this.pos);
  }

  animate(dt, s) {
    this.env.cos = Math.cos(this.heading);
    this.env.sin = Math.sin(this.heading);
    this.pose.walk(dt, this.env);
    this.bodyYaw = BODY_YAW * (1 - this.pose.move * 0.72);
    const g = this.mech.group;
    g.position.copy(this.pos);
    g.rotation.y = this.heading + this.bodyYaw;
    const d = this.mech.design.d;
    const fwd = s.floorAt(this.pos.x - this.env.sin * d.footL, this.pos.z - this.env.cos * d.footL);
    const back = s.floorAt(this.pos.x + this.env.sin * d.footL, this.pos.z + this.env.cos * d.footL);
    g.rotation.x += (Math.atan2(fwd - back, d.footL * 2) * 0.5 - g.rotation.x) * Math.min(1, dt * 4);
    this.dropJets = Math.max(0, this.dropJets - dt);
    this.crouchT = Math.max(0, this.crouchT - dt * 2.1);
    this.pose.crouch = Math.min(1.2, this.pose.crouch + this.crouchT * 0.8);
    this.mech.setThrust(this.jets || this.dropJets > 0 ? 1 : this.env.speed / RUN * 0.5);
  }

  // Footfall: dust, a heavy thud, camera shake and a crushing hit under the foot.
  footfall(i) {
    this.mech.footWorld(i, _foot);
    this.ctx.fx?.puff(_foot, 0x9a8f7e, this.mech.design.d.footW * 2.4, 0.9);
    stompSfx(this.sfx, 0.9 + this.pose.run * 0.4);
    this.shake = Math.min(1.2, this.shake + 0.16 + this.pose.run * 0.16);
    this.guns?.stomp(_foot);
  }

  // The mech becomes the player: feet, camera and grounded state all follow it.
  takeOver(s, dt) {
    const d = this.mech.design.d;
    s.feet.copy(this.pos);
    s.velY = 0;
    s.onGround = true;
    if (s.avatar) s.avatar.group.visible = false;
    s.head.set(this.pos.x, this.pos.y + d.shoulderY, this.pos.z);
    const cam = s.camera;
    cam.rotation.set(s.pitch, s.yaw, 0);
    _off.set(d.H * CAM_SIDE, d.H * 0.88, d.H * 1.82 + this.tr.kick * d.H * 0.55).applyEuler(cam.rotation);
    cam.position.copy(this.pos).add(_off);
    this.shake = Math.max(0, this.shake - dt * 3);
    if (this.shake > 0.001) {
      const a = this.shake * this.shake * d.H * 0.035;
      cam.position.x += (Math.random() * 2 - 1) * a;
      cam.position.y += (Math.random() * 2 - 1) * a;
    }
    const floor = s.floorAt(cam.position.x, cam.position.z) + 2;
    if (cam.position.y < floor) cam.position.y = floor;
    this.fovPulse(cam, dt);
  }

  // A short FOV punch per shot; heavy weapons push it hardest.
  fovPulse(cam, dt) {
    this.fovKick *= Math.exp(-7 * dt);
    if (this.fovKick < 0.02) this.fovKick = 0;
    const want = this.baseFov + this.fovKick;
    if (Math.abs(cam.fov - want) < 0.02) return;
    cam.fov = want;
    cam.updateProjectionMatrix();
  }
}

// Signed shortest angle from `a` to `b`, used for the torso twist onto the aim line.
function yawGap(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Shortest-way yaw follow.
function turnToward(a, b, k) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, k);
}

const IDLE = { down: () => false, pressed: () => false, mouseDown: () => false, clicked: () => false,
  mouse: { dx: 0, dy: 0 }, locked: false };
