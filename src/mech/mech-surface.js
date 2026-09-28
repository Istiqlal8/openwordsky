// The mech walking on a planet. It replaces the astronaut: the player's feet become the mech's
// feet, the camera rides on its shoulder, and the on-foot tools stand down (the surface view
// reports `flying` while the pilot is inside, exactly as it does in the ship).
import * as THREE from 'three';
import { MechPose } from './mech-pose.js';
import { Transform } from './mech-transform.js';
import { MechSurfaceGuns } from './mech-surface-guns.js';
import { transformSfx, stompSfx } from './mech-sfx.js';
import { stopFlight, launchShip, parkShip, shadowView, FLIGHT_CHASE_UP, BOARD_LIFT } from './mech-handover.js';
import { MorphFx } from './mech-morph-fx.js';
import { MechCamera } from './mech-camera.js';
import { FlightAttitude } from './mech-flight.js';

const WALK = 17, RUN = 36;
const JUMP_V = 24, JET_ACCEL = 34, JET_MAX = 14, JET_TIME = 1.4;
const BOARD_RANGE = 26;
const TURN = 6;                  // yaw follow rate: the body lags the camera
const BODY_YAW = 0.42;           // bladed stance while standing; it straightens out at a run
const _foot = new THREE.Vector3();
const _mid = new THREE.Vector3();

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
    this.cam = new MechCamera();
    this.att = new FlightAttitude();
    this.fwd = 0;
    this.side = 0;
    this.env = { speed: 0, runSpeed: RUN, airborne: false, root: this.pos, cos: 1, sin: 0,
      groundAt: null, fwd: 1, side: 0 };
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
    this.guns.aimCamera = this.cam.aim;    // the crosshair ignores the free-look orbit
    mech.att = this.att;                   // inspectable through window.__mech
    this.guns.onShake = (a) => { this.shake = Math.min(1.6, this.shake + a); };
    this.guns.onFov = (a) => { this.fovKick = Math.min(11, this.fovKick + a); };
    this.fovKick = 0;
    this.baseFov = s.camera.fov;
    this.env.groundAt = (x, z) => s.floorAt(x, z);
    this.spawn(s);
    mech.group.scale.setScalar(1);
    mech.setWorldScale(1);
    mech.group.position.copy(this.pos);
    mech.group.rotation.set(0, this.heading, 0);
    s.scene.add(mech.group);
    if (s.landed) s.landed.model.setLegs(false);
    this.morph = new MorphFx(s.scene, mech.design.palette?.glow ?? 0x9fd8ff);
    this.active = true;
    this.shadow(true);
    this.tr.t = 0;
    this.tr.start(1);
    transformSfx(this.sfx, true);
  }

  // Either dropping out of a flying ship or standing up where it was parked.
  spawn(s) {
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
    this.morph?.dispose();
    this.morph = null;
    this.pose?.dispose();
    this.guns?.dispose();
    this.guns = null;
    this.mech = null;
    this.ctx = null;
    this.view = null;
    this.active = false;
    this.tr.finish(false);
  }

  // Off the ground at all and the ship comes back flying, placed so the camera does not drop;
  // only a mech actually standing on its feet parks the ship and puts the pilot back on foot.
  handOver(s) {
    const d = this.mech.design.d;
    if (this.pos.y <= s.floorAt(this.pos.x, this.pos.z) + d.footH * 1.5) {
      parkShip(s, this.pos, this.heading);
      return;
    }
    const lift = d.H * 0.88 - FLIGHT_CHASE_UP - BOARD_LIFT;   // shoulder camera height, kept
    launchShip(s, this.pos, this.heading, lift, this.env.speed);
  }

  shadow(on) {
    this.shadowed = shadowView(this.view, on, this.shadowed, () => this.active);
  }

  update(dt, input) {
    if (!this.active) return;
    const s = this.ctx.surface;
    this.cam.orbit.update(dt, input);
    this.cam.holdView(s);
    this.tr.update(dt);
    this.mech.group.visible = this.tr.mechVisible;
    this.mech.setDeploy(this.tr.deploy);
    if (this.tr.busy) this.morphShip(s);
    this.drawMorph(dt, s);
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
    this.mech.sync?.();          // the GLB skin copies the rig it has just been posed into
    this.takeOver(s, dt);
  }

  // During the sequence the hull rears up over the spot, spins down and bursts into the mech.
  morphShip(s) {
    const model = s.landed?.model, tr = this.tr;
    if (!model) return;
    const d = this.mech.design.d, k = Math.max(0.001, tr.shipScale);
    model.group.visible = tr.shipVisible;
    model.group.scale.set(k, k, k * tr.shipStretch);
    model.group.position.set(this.pos.x, this.pos.y + model.groundOffset + d.H * 0.3 * tr.charge, this.pos.z);
    model.group.rotation.set(-tr.shipPitch, this.heading, tr.shipSpin);
    model.setLegs?.(tr.shipLegs);
    model.setThrust?.(tr.charge);
  }

  drawMorph(dt, s) {
    const tr = this.tr;
    if (!this.morph) return;
    const d = this.mech.design.d;
    _mid.set(this.pos.x, this.pos.y + d.H * 0.5, this.pos.z);
    this.morph.update(dt, tr, _mid, d.H, this.ctx.fx);
    this.mech.group.rotation.y = this.heading + this.bodyYaw + tr.spinIn;
    if (tr.burst) { this.shake = 1.5; this.ctx.fx?.puff(this.pos, 0xb9c8d8, d.H * 0.7, 1.2); }
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
    this.env.fwd = len > 0 ? f : 1;   // unit movement direction in the mech's own frame
    this.env.side = len > 0 ? r : 0;
    this.fwd = f * speed;             // signed, in the frame's own axes: what the attitude leans into
    this.side = r * speed;
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
    this.att.reset();
    this.crouchT = Math.min(1, 0.35 + impact * 0.03);
    this.shake = Math.min(1.6, this.shake + impact * 0.03);
    stompSfx(this.sfx, 1.4);
    this.ctx.fx?.puff(this.pos, 0x9a8f7e, this.mech.design.d.footW * 4, 1.2);
    this.guns?.stomp(this.pos);
  }

  animate(dt, s) {
    this.env.cos = Math.cos(this.heading);
    this.env.sin = Math.sin(this.heading);
    const air = this.env.airborne || this.dropJets > 0;
    this.att.update(dt, { fwd: air ? this.fwd : 0, side: this.side, climb: this.velY,
      cap: RUN * 0.8, boost: this.jets, air,
      turn: yawGap(this.heading, this.lastYaw ?? this.heading) / Math.max(dt, 0.01) });
    this.lastYaw = this.heading;
    if (air) this.pose.fly(dt, this.jets ? 1 : 0.4, this.att);
    else this.pose.walk(dt, this.env);
    this.bodyYaw = BODY_YAW * (1 - this.pose.move * 0.72) * (1 - this.att.air);
    this.attitudeGroup(s, dt);
    this.dropJets = Math.max(0, this.dropJets - dt);
    this.crouchT = Math.max(0, this.crouchT - dt * 2.1);
    this.pose.crouch = Math.min(1.2, this.pose.crouch + this.crouchT * 0.8);
    const jet = this.jets || this.dropJets > 0;
    this.mech.setThrust(jet ? 1 : Math.max(this.att.flare * this.att.air, this.env.speed / RUN * 0.5), this.att.boost);
    this.mech.pack.group.rotation.x = this.att.nozzle;
  }

  // Standing: the frame rolls with the ground under its feet. Airborne: it takes the flight
  // attitude instead, so a jet hop reads as a hop and not a statue sliding through the air.
  attitudeGroup(s, dt) {
    const g = this.mech.group, d = this.mech.design.d, a = this.att;
    g.position.copy(this.pos);
    g.position.y += a.bob * d.H;
    g.rotation.order = 'YXZ';
    g.rotation.y = this.heading + this.bodyYaw + a.yaw;
    g.rotation.z = a.roll;
    const ahead = s.floorAt(this.pos.x - this.env.sin * d.footL, this.pos.z - this.env.cos * d.footL);
    const back = s.floorAt(this.pos.x + this.env.sin * d.footL, this.pos.z + this.env.cos * d.footL);
    const slope = Math.atan2(ahead - back, d.footL * 2) * 0.5 * (1 - a.air);
    g.rotation.x += (slope + a.pitch - g.rotation.x) * Math.min(1, dt * (a.air > 0.5 ? 12 : 4));
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
    const d = this.mech.design.d, cam = s.camera;
    s.feet.copy(this.pos);
    s.velY = 0;
    s.onGround = true;
    if (s.avatar) s.avatar.group.visible = false;
    s.head.set(this.pos.x, this.pos.y + d.shoulderY, this.pos.z);
    this.cam.ground(cam, this.pos, d, s, this.tr.kick);
    this.cam.arc(cam, this.pos, d, s, this.tr);
    this.shake = Math.max(0, this.shake - dt * 3);
    if (this.shake > 0.001) this.cam.shake(cam, this.shake * this.shake * d.H * 0.035);
    const floor = s.floorAt(cam.position.x, cam.position.z) + 2;
    if (cam.position.y < floor) cam.position.y = floor;
    this.fovKick = this.cam.fov(cam, dt, this.baseFov, this.fovKick);
  }
}

// Signed shortest angle from `a` to `b`: the torso twist onto the aim line and the turn rate.
function yawGap(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Shortest-way yaw follow.
const turnToward = (a, b, k) => a + yawGap(b, a) * Math.min(1, k);

const IDLE = { down: () => false, pressed: () => false, mouseDown: () => false, clicked: () => false,
  mouse: { dx: 0, dy: 0 }, locked: false };
