// Surface view (first or third person): infinite terrain patch that follows the player.
import * as THREE from 'three';
import { heightFn } from '../gen/terrain.js';
import { TerrainPatch, painter } from '../earth/terrain-patch.js';
import { FarTerrain } from '../earth/far-terrain.js';
import { EarthWorld } from '../earth/earth-world.js';
import { Swimmer, SWIM_SPEED, SWIM_SPRINT } from '../earth/swimming.js';
import { buffMul } from '../craft/buffs.js';
import { WaterSurface } from '../earth/water-surface.js';
import { SurfaceSky } from './surface-sky.js';
import { SurfaceProps } from './surface-props.js';
import { shipDesign } from './ship/ship-design.js';
import { LandedShip, findDrySpawn } from './ship/landed-ship.js';
import { ShipLights } from './ship/ship-lights.js';
import { Avatar } from '../character/avatar.js';
import { SurfaceFlight } from './surface-flight.js';
import { CameraOrbit } from './camera-orbit.js';

const SIZE = 440, SEG = 110;
const SNAP = 8;         // recenter granularity (multiple of STEP and detail tile)
const RECENTER = 24;    // distance from patch center that triggers a rebuild
const EYE = 1.7, WALK = 7, SPRINT = 15;
const JUMP_V = Math.sqrt(2 * 9.8 * 2.5); // ~2.5 units high at 9.8 gravity
const JET_ACCEL = 24, JET_MAX_V = 8, JET_TIME = 2.5; // jetpack: hold Space in the air
const SENS = 0.0022, PITCH_MAX = 1.5;
const _off = new THREE.Vector3();
const CHASE = new THREE.Vector3(0.7, 0.7, 4.6); // third-person camera offset (right, up, back)

export class SurfaceView {
  constructor() {
    this.scene = new THREE.Scene();
    const aspect = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1;
    this.camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 6000);
    this.camera.rotation.order = 'YXZ';
    this.feet = new THREE.Vector3();
    this.head = new THREE.Vector3();
    this.thirdPerson = true;
    this.avatar = null;
    this.moveSpeed = 0;
    this.jet = 1;
    this.flight = new SurfaceFlight(this);
    this.orbit = new CameraOrbit(); // hold Alt to swing the view around the explorer
    this.velY = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.bobT = 0;
    this.onGround = true;
    this.center = { x: 0, z: 0 };
    this._planet = null;
    this.shipDesign = shipDesign(1);
    this.landed = null;
    this.spawn = { x: 0, z: 0 };
    this.vehicle = null; // submarine (src/ocean/submarine.js): drives feet/camera like flight
  }

  get planet() { return this._planet; }
  get position() { return this.head; }
  // Riding something (ship or submarine): the on-foot systems all stand down.
  get flying() { return this.flight.active || Boolean(this.vehicle?.active); }
  get inShip() { return this.flight.active; }
  get shipPosition() { return this.landed ? this.landed.position : null; }
  get swimming() { return Boolean(this.swim?.active) && !this.flying; }
  // Camera below a (non-lava) water surface.
  get underwater() { return Boolean(this.swim) && this.camera.position.y < this.swim.waterY; }
  // Feet at or below the lava surface of a volcanic world (the floor keeps them from sinking).
  get inLava() {
    const p = this._planet;
    return Boolean(p?.terrain.hasWater) && p.biome.id === 'volcanic' && !this.flight.active && this.feet.y <= p.terrain.waterY + 0.05;
  }

  // Player's ship design; parked near the spawn on every mount.
  setShip(design) {
    this.shipDesign = design;
    if (this._planet) this.placeShip();
  }

  // The player's character (species, face, clothes) from the character creator.
  setLook(look) {
    this.charLook = look; // `look()` is the mouse-look method, so the character look needs its own name.
    if (!this.avatar) return;
    const casual = this.avatar.casual;
    this.avatar.dispose();
    this.avatar = new Avatar(look);
    this.avatar.setCasual(casual);
    this.scene.add(this.avatar.group);
  }

  placeShip() {
    this.landed?.dispose();
    this.landed = new LandedShip(this.scene, this.shipDesign, this.h, this._planet, this.spawn);
    this.shipLights?.dispose();
    this.shipLights = new ShipLights(this.landed.model.group, this.landed.model.length ?? 8);
    this.props.clearZone = { x: this.landed.position.x, z: this.landed.position.z, r: 9 };
    this.props.rebuild(this.center.x, this.center.z);
  }

  mount(planet, system) {
    this.dispose();
    this._planet = planet;
    this.h = heightFn(planet);
    this.spawn = findDrySpawn(this.h, planet);
    this.sky = new SurfaceSky(this.scene, planet, system);
    this.patch = new TerrainPatch(this.scene, planet, this.h, { size: SIZE, seg: SEG, snap: SNAP });
    this.terrain = this.patch.mesh;
    this.buildFar(planet);
    this.buildWater(planet);
    this.props = new SurfaceProps(this.scene, planet, this.h, this.patch);
    this.earth = planet.style === 'earth' ? new EarthWorld(this) : null;
    this.swim = planet.terrain.hasWater && planet.biome.id !== 'volcanic' ? new Swimmer(this, EYE) : null;
    this.avatar = new Avatar(this.charLook);
    this.scene.add(this.avatar.group);
    this.flight.active = false;
    this.resetPlayer();
    this.recenter(this.spawn.x, this.spawn.z);
    this.placeShip();
    this.sky.update(0, this.camera.position);
  }

  // Kilometres of coarse terrain around the patch: Earth and airless worlds have clear skies.
  buildFar(planet) {
    const clear = planet.style === 'earth' || planet.atmosphereDensity < 0.05;
    this.far = clear ? new FarTerrain(this.scene, this.h, painter(planet), SIZE / 2) : null;
    this.camera.far = clear ? 9000 : 6000;
    this.camera.updateProjectionMatrix();
  }

  buildWater(planet) {
    if (!planet.terrain.hasWater) return;
    this.waterSurface = new WaterSurface(this.scene, planet);
    this.water = this.waterSurface.mesh;
  }

  recenter(px, pz) {
    const c = this.patch.recenter(px, pz);
    this.center.x = c.x;
    this.center.z = c.z;
    if (this.flight.active) this.propsDue = true; // spread flight work: props next frame
    else this.props.rebuild(c.x, c.z);
    this.waterSurface?.setDepth(this.patch);
    this.earth?.recenter(c.x, c.z);
  }

  floorAt(x, z) {
    const g = this.h(x, z), t = this._planet.terrain;
    return t.hasWater ? Math.max(g, t.waterY - 1.0) : g; // wade, never sink below
  }

  resetPlayer() {
    const { x, z } = this.spawn;
    this.feet.set(x, this.floorAt(x, z), z);
    this.velY = 0;
    this.yaw = 0.35; // off-axis: looking straight down a mesh grid line shows a seam
    this.pitch = 0;
    this.bobT = 0;
    this.onGround = true;
    this.updateCamera(0);
  }

  update(dt, input) {
    if (!this._planet) return;
    dt = Math.min(dt, 0.1);
    if (this.vehicle?.active) {
      this.avatar.group.visible = false; // the submarine already placed feet/head/camera
    } else if (this.flight.active) {
      this.flight.update(dt, input);
      this.avatar.group.visible = false;
    } else {
      if (input.pressed('KeyV')) this.thirdPerson = !this.thirdPerson;
      this.look(input, dt);
      this.move(dt, input);
      this.avatar.group.visible = this.thirdPerson || this.orbit.live;
      this.avatar.update(dt, this.feet, this.yaw, this.moveSpeed, this.onGround);
    }
    const dx = this.feet.x - this.center.x, dz = this.feet.z - this.center.z;
    const reach = this.flight.active ? RECENTER * 2.5 : RECENTER; // fast flight: fewer, larger shifts
    if (dx * dx + dz * dz > reach * reach) this.recenter(this.feet.x, this.feet.z);
    else if (this.propsDue) { this.propsDue = false; this.props.rebuild(this.center.x, this.center.z); }
    this.waterSurface?.update(dt, this.camera.position.x, this.camera.position.z, this.scene.background);
    this.sky.update(dt, this.camera.position, this.underwater);
    this.shipLights?.update(dt, this.sky.nightFactor ?? 0);
    this.props.update(dt, this.camera.position);
    this.far?.update(this.feet.x, this.feet.z, this.center);
    this.earth?.update(dt, this.camera.position);
  }

  look(input, dt = 0) {
    if (this.orbit.update(dt, input)) return; // orbiting: the mouse turns the camera, not the player
    if (!input.locked) return;
    this.yaw -= input.mouse.dx * SENS;
    this.pitch -= input.mouse.dy * SENS;
    this.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, this.pitch));
  }

  move(dt, input) {
    const sprint = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = this.swim?.active ? (sprint ? SWIM_SPRINT : SWIM_SPEED) : sprint ? SPRINT * buffMul('sprint') : WALK;
    let f = (input.down('KeyW') ? 1 : 0) - (input.down('KeyS') ? 1 : 0);
    let s = (input.down('KeyD') ? 1 : 0) - (input.down('KeyA') ? 1 : 0);
    const len = Math.hypot(f, s);
    if (len > 0) { f /= len; s /= len; }
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    this.feet.x += (-sin * f + cos * s) * speed * dt;
    this.feet.z += (-cos * f - sin * s) * speed * dt;
    this.applyGravity(dt, input);
    this.moveSpeed = len > 0 ? speed : 0;
    const moving = len > 0 && this.onGround;
    this.bobT = moving ? this.bobT + dt * speed * 1.1 : 0;
    this.updateCamera(moving ? Math.sin(this.bobT) * 0.05 * (speed / WALK) : 0);
  }

  applyGravity(dt, input) {
    if (this.swim?.step(dt, input)) return;
    const g = this._planet.gravity || 9.8;
    const floor = this.floorAt(this.feet.x, this.feet.z);
    if (this.onGround && input.pressed('Space')) {
      this.velY = JUMP_V;
      this.onGround = false;
    }
    this.velY -= g * dt;
    this.jetpack(dt, input);
    this.feet.y += this.velY * dt;
    const snap = this.onGround && this.velY <= 0 && this.feet.y - floor < 0.8; // follow slopes down
    if (this.feet.y <= floor || snap) {
      this.feet.y = floor;
      this.velY = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }

  jetpack(dt, input) {
    if (this.onGround) { this.jet = Math.min(1, this.jet + dt / 1.5); return; }
    if (!input.down('Space') || this.jet <= 0) return;
    this.velY = Math.min(JET_MAX_V, this.velY + JET_ACCEL * dt);
    this.jet = Math.max(0, this.jet - dt / JET_TIME);
  }

  updateCamera(bob) {
    this.head.set(this.feet.x, this.feet.y + EYE + bob, this.feet.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    this.camera.position.copy(this.head);
    if ((!this.thirdPerson && !this.orbit.live) || !this.h) return;
    if (this.orbit.live) this.orbit.apply(this.camera, this.head, this.camera.quaternion, CHASE);
    else this.camera.position.add(_off.copy(CHASE).applyEuler(this.camera.rotation));
    const cx = this.camera.position.x, cz = this.camera.position.z;
    const ground = (this.swim ? this.h(cx, cz) : this.floorAt(cx, cz)) + 0.4;
    if (this.camera.position.y < ground) this.camera.position.y = ground; // never under the terrain
  }

  // Tool muzzle in world space: the suit's right hand in third person, else near the camera.
  muzzle(out) {
    if (this.thirdPerson && this.avatar) return this.avatar.arms[1].localToWorld(out.set(0, -0.55, -0.1));
    return this.camera.localToWorld(out.set(0.28, -0.22, -0.5));
  }

  nearestCreature() {
    return this.props ? this.props.nearestCreature(this.camera.position) : null;
  }

  render(renderer) {
    renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    if (!this._planet) return;
    this.patch.dispose();
    this.far?.dispose();
    this.earth?.dispose();
    this.waterSurface?.dispose();
    this.sky.dispose();
    this.props.dispose();
    this.landed?.dispose();
    this.shipLights?.dispose();
    this.shipLights = null;
    this.flight.dispose();
    this.avatar?.dispose();
    this.terrain = this.patch = this.far = this.earth = this.swim = this.waterSurface = this.water = this.sky = this.props = this.landed = this.avatar = null;
    this.vehicle = null;
    this._planet = null;
  }
}
