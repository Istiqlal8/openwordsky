// Mini-submarine for ocean worlds: summon it to the nearest water, board with E, dive.
// Controls while aboard: mouse look (pointer lock), W/S thrust, A/D strafe (turn without
// pointer lock), Space/C up/down, Shift boost, F headlights, P sonar, E surface & exit.
// Like SurfaceFlight it drives surface.feet/head and the camera (third-person chase).
import * as THREE from 'three';
import { SubModel } from './sub-model.js';
import { Sonar, BubbleTrail } from './sub-fx.js';
import { hasOcean } from './deep-sea.js';

const CRUISE = 9, BOOST = 18, REVERSE = 4, VERT = 5, STRAFE = 4, TURN = 1.4;
const HULL_R = 1.1, TOP = 0.55, BOARD_RANGE = 6, MIN_DEPTH = 3.2, SEARCH = 220;
const CHASE = new THREE.Vector3(0, 2.3, 9);
const _dir = new THREE.Vector3(), _side = new THREE.Vector3(), _off = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _prop = new THREE.Vector3();

export class Submarine {
  constructor(surface) {
    this.surface = surface;
    this.model = null;
    this.placed = false;
    this._active = false;
    this.sonarSources = []; // e.g. [deepSea, wildlife]; anything with sonarTargets(), groups or bodies()
    this.state = { depth: 0, speed: 0, hull: 100, leave: false, prompt: null, sonar: null, lights: false };
  }

  get active() { return this._active; }
  get position() { return this.model?.group.position ?? null; }
  // This planet has water and the sub is not already in use.
  get canSummon() { return Boolean(this.model) && !this._active; }

  mount(planet) {
    this.dispose();
    if (!hasOcean(planet)) return;
    const scene = this.surface.scene;
    this.waterY = planet.terrain.waterY;
    this.model = new SubModel(scene);
    this.model.group.visible = false;
    this.sonar = new Sonar(scene);
    this.trail = new BubbleTrail(scene, this.waterY);
    Object.assign(this, { placed: false, _active: false, hull: 100, speed: 0, bank: 0, leaving: false });
  }

  // Floats the sub at the nearest water deep enough to dive, facing out to sea. False: no water.
  summon(pos) {
    if (!this.model || this._active) return false;
    const spot = this.findWater(pos);
    if (!spot) return false;
    const g = this.model.group;
    g.position.set(spot.x, this.waterY - TOP, spot.z);
    g.rotation.set(0, Math.atan2(-(spot.x - pos.x), -(spot.z - pos.z)), 0);
    g.visible = this.placed = true;
    this.model.setLights(this.model.lightsOn);
    return true;
  }

  findWater(pos) {
    const h = this.surface.h;
    for (let r = 4; r <= SEARCH; r += 4) {
      const n = Math.max(12, Math.round(r / 2));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, x = pos.x + Math.cos(a) * r, z = pos.z + Math.sin(a) * r;
        if (this.waterY - h(x, z) >= MIN_DEPTH) return { x, z };
      }
    }
    return null;
  }

  canBoard(feet) {
    return this.placed && !this._active && feet.distanceTo(this.model.group.position) < BOARD_RANGE;
  }

  board() {
    const v = this.surface, g = this.model.group;
    this._active = true;
    this.leaving = false;
    this.speed = 0;
    v.yaw = g.rotation.y;
    v.pitch = 0;
    if (v.avatar) v.avatar.group.visible = false;
  }

  // Steps out beside the sub onto the water surface (the swimmer takes over).
  exit() {
    const v = this.surface, g = this.model.group;
    this._active = false;
    this.leaving = false;
    g.position.y = this.waterY - TOP;
    _side.set(Math.cos(v.yaw), 0, -Math.sin(v.yaw)).multiplyScalar(2.6);
    v.feet.set(g.position.x + _side.x, this.waterY - 1.4, g.position.z + _side.z);
    v.velY = 0;
    v.pitch = 0;
    v.updateCamera?.(0);
  }

  // E: board when close; aboard, exit at the surface or float up first. → message or null.
  door() {
    if (this._active) {
      if (this.depth() < 1.2) { this.exit(); this.state.leave = true; return 'Keluar dari kapal selam'; }
      this.leaving = true;
      return 'Naik ke permukaan...';
    }
    if (!this.canBoard(this.surface.feet)) return null;
    this.board();
    return 'Kapal selam: W/S maju, Space/C naik-turun, P sonar, F lampu';
  }

  depth() { return this.model ? Math.max(0, this.waterY - TOP - this.model.group.position.y) : 0; }

  update(dt, input) {
    const s = this.state;
    s.leave = false;
    s.sonar = null;
    if (!this.model || !this.placed) { s.prompt = null; return s; }
    this.handleKeys(input);
    if (this._active) this.drive(dt, input);
    else this.idle(dt);
    const g = this.model.group;
    this.model.animate(dt, this._active ? this.speed / BOOST : 0, this._active ? this.climb : 0, this._active ? this.turn : 0);
    this.sonar.update(dt, g.position);
    _prop.set(0, 0, 2.4).applyEuler(g.rotation).add(g.position);
    this.trail.update(dt, _prop, this._active && this.depth() > 0.8 ? 4 + Math.abs(this.speed) * 2.5 : 0);
    Object.assign(s, { depth: this.depth(), speed: Math.abs(this.speed), hull: Math.round(this.hull), lights: this.model.lightsOn });
    s.prompt = this.prompt();
    return s;
  }

  prompt() {
    if (!this._active) return this.canBoard(this.surface.feet) ? 'E  Naik kapal selam' : null;
    if (this.hull <= 0) return 'Lambung rusak! Naik ke permukaan';
    if (this.leaving) return 'Naik ke permukaan...';
    return this.depth() < 1.2 ? 'E  Keluar dari kapal selam' : `Kedalaman ${this.depth().toFixed(0)} m · E naik & keluar`;
  }

  // Parked: rides the swell at the surface.
  idle(dt) {
    const g = this.model.group, t = (this.bobT = (this.bobT ?? 0) + dt);
    const wy = this.surface.waterSurface?.heightAt(g.position.x, g.position.z) ?? this.waterY;
    g.position.y = wy - TOP;
    g.rotation.x = Math.sin(t * 0.9) * 0.03;
    g.rotation.z = Math.sin(t * 0.7) * 0.05;
  }

  drive(dt, input) {
    const v = this.surface, g = this.model.group;
    this.steer(dt, input);
    const boost = input.down('ShiftLeft') || input.down('ShiftRight');
    const target = input.down('KeyW') ? (boost ? BOOST : CRUISE) : input.down('KeyS') ? -REVERSE : 0;
    this.speed += (target - this.speed) * (1 - Math.exp(-1.3 * dt));
    const up = input.down('Space') || this.leaving || this.hull <= 0;
    this.climb = (up ? 1 : 0) - (input.down('KeyC') || input.down('ControlLeft') ? 1 : 0);
    _dir.set(-Math.sin(v.yaw) * Math.cos(v.pitch), Math.sin(v.pitch), -Math.cos(v.yaw) * Math.cos(v.pitch));
    _side.set(Math.cos(v.yaw), 0, -Math.sin(v.yaw));
    _off.copy(_dir).multiplyScalar(this.speed).addScaledVector(_side, this.strafe * STRAFE);
    _off.y += this.climb * VERT * (this.leaving ? 1.3 : 1);
    this.move(dt, _off);
    this.bank += (-this.turn * 0.35 - this.bank) * Math.min(1, dt * 3);
    g.rotation.set(v.pitch * 0.7, v.yaw, this.bank, 'YXZ');
    if (this.depth() < 0.3) this.hull = Math.min(100, this.hull + dt * 5);
    if (this.leaving && this.depth() < 0.3) { this.exit(); this.state.leave = true; return; }
    v.feet.copy(g.position);
    v.head.copy(g.position);
    if (v.avatar) v.avatar.group.visible = false;
    this.placeCamera();
  }

  steer(dt, input) {
    const v = this.surface, turnKeys = (input.down('KeyD') ? 1 : 0) - (input.down('KeyA') ? 1 : 0);
    if (input.locked) v.look(input);
    v.pitch = THREE.MathUtils.clamp(v.pitch, -1.1, 1.1);
    this.strafe = input.locked ? turnKeys : 0;
    if (!input.locked) v.yaw -= turnKeys * TURN * dt;
    this.turn = THREE.MathUtils.clamp(input.locked ? input.mouse.dx * 0.05 + turnKeys * 0.5 : turnKeys, -1, 1);
  }

  // Moves by velocity vel: the floor and the surface bound it; too-shallow water blocks.
  move(dt, vel) {
    const p = this.model.group.position, h = this.surface.h, top = this.waterY - TOP;
    const nx = p.x + vel.x * dt, nz = p.z + vel.z * dt;
    if (h(nx, nz) + HULL_R <= top) { p.x = nx; p.z = nz; } else this.speed *= 0.3;
    p.y += vel.y * dt;
    const floor = h(p.x, p.z) + HULL_R;
    if (p.y < floor) {
      const impact = Math.abs(this.speed) * Math.max(0, -_dir.y) + Math.max(0, -vel.y);
      if (impact > 6) this.hull = Math.max(0, this.hull - (impact - 6) * 4);
      p.y = floor;
    }
    if (p.y > top) p.y = top;
  }

  placeCamera() {
    const v = this.surface, cam = v.camera, g = this.model.group;
    _e.set(v.pitch * 0.6, v.yaw, 0);
    cam.rotation.copy(_e);
    cam.position.copy(g.position).add(_off.copy(CHASE).applyEuler(_e));
    cam.position.y = Math.max(cam.position.y, v.h(cam.position.x, cam.position.z) + 0.6);
    const wy = this.waterY; // never sit right on the water plane (flicker between above/below)
    if (Math.abs(cam.position.y - wy) < 0.3) cam.position.y = this.depth() > 1 ? wy - 0.3 : wy + 0.3;
  }

  // P: sonar ping from the sub (aboard only) → { total, counts, text } or null.
  ping() {
    if (!this._active) return null;
    return this.sonar.ping(this.model.group.position, this.sonarSources);
  }

  handleKeys(input) {
    if (!this._active) return;
    if (input.pressed('KeyF')) this.model.setLights(!this.model.lightsOn);
    if (input.pressed('KeyP')) this.state.sonar = this.ping();
  }

  dispose() {
    if (!this.model) return;
    this.model.dispose();
    this.sonar.dispose();
    this.trail.dispose();
    this.model = this.sonar = this.trail = null;
    this.placed = this._active = false;
  }
}
