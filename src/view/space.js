// SpaceView: 3D star system with a free-flying player ship (chase or cockpit camera).
import * as THREE from 'three';
import { Rng, unitOf } from '../core/rng.js';
import { nebulaTexture } from '../assets/textures.js';
import { release } from '../assets/canvas.js';
import { buildBlackHole } from './cosmos/black-hole.js';
import { Satellites } from './satellites.js';
import { PlanetBody, buildStar } from './space-planet.js';
import { shipDesign } from './ship/ship-design.js';
import { ShipRig } from './ship/ship-rig.js';
import { steer, thrust, speedCap, collide, PULSE_SPEED } from './ship/ship-flight.js';

const LOOK_ANGLE = THREE.MathUtils.degToRad(6);
const DUST_COUNT = 400;
const DUST_RANGE = 40;
const SKY_RADIUS = 12000;
const ORIGIN = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const STAR_HUES = [[0.6, 0.5], [0.08, 0.1], [0.13, 0.55], [0.02, 0.6], [0.55, 0.2]];
const DEFAULT_SHIP_SEED = 1;
const IDLE = { down: () => false, pressed: () => false, mouse: { dx: 0, dy: 0 }, locked: false };

const tmpM = new THREE.Matrix4();
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();

function starLayer(rng, count, size) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const u = rng.next() * 2 - 1;
    const th = rng.next() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u) * SKY_RADIUS;
    pos.set([Math.cos(th) * s, u * SKY_RADIUS, Math.sin(th) * s], i * 3);
    const [h, sat] = rng.pick(STAR_HUES);
    c.setHSL(h, sat, rng.range(0.55, 0.95));
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, depthWrite: false });
  return new THREE.Points(geo, mat);
}

function buildStarfield(seed) {
  const rng = new Rng(seed ^ 0x51a2);
  const group = new THREE.Group();
  group.add(starLayer(rng, 2200, 1.2), starLayer(rng, 650, 2), starLayer(rng, 150, 3.2));
  return group;
}

// Dust motes drawn as short streaks along the velocity, wrapped around the camera.
function buildDust() {
  const rng = new Rng(0xd057);
  const points = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < points.length; i++) points[i] = rng.range(-DUST_RANGE, DUST_RANGE);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST_COUNT * 6), 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xcfe0ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  return { points, lines };
}

function updateDust(dust, cam, vel) {
  const span = DUST_RANGE * 2;
  const out = dust.lines.geometry.attributes.position.array;
  const k = Math.min(0.04, 30 / Math.max(1, vel.length())); // long streaks in pulse, capped
  const tail = [vel.x * k, vel.y * k, vel.z * k];
  const c = [cam.x, cam.y, cam.z];
  for (let i = 0; i < DUST_COUNT; i++) {
    for (let k = 0; k < 3; k++) {
      const j = i * 3 + k;
      const rel = ((((dust.points[j] - c[k] + DUST_RANGE) % span) + span) % span) - DUST_RANGE;
      dust.points[j] = c[k] + rel;
      out[i * 6 + k] = dust.points[j];
      out[i * 6 + 3 + k] = dust.points[j] - tail[k];
    }
  }
  dust.lines.geometry.attributes.position.needsUpdate = true;
  dust.lines.material.opacity = THREE.MathUtils.clamp((vel.length() - 6) / 60, 0, 0.8);
}

function disposeTree(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) m.dispose(); // textures are cached in textures.js, not disposed here
  });
}

export class SpaceView {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.3, 200000);
    this.velocity = new THREE.Vector3();
    this.time = 0;
    this.root = null;
    this.bodies = [];
    this.system = null;
    this.controls = true;
    this.rig = new ShipRig(this.camera);
    this.ship = this.rig.ship;
    this.scene.add(this.ship);
    this.setShip(shipDesign(DEFAULT_SHIP_SEED));
  }

  // Swap the player's ship model; flight stats follow the design.
  setShip(design) {
    this.design = design;
    this.rig.setDesign(design);
  }

  get shipObject() { return this.ship; }
  get forward() { return new THREE.Vector3(0, 0, -1).applyQuaternion(this.ship.quaternion); }
  get cameraMode() { return this.rig.mode; }
  muzzleWorldPositions() { return this.rig.muzzleWorldPositions(); }
  shake(amount) { this.rig.shake(amount); }
  setControlsEnabled(on) { this.controls = Boolean(on); }

  // Pulse drive: auto-forward at high speed until a planet or the star gets close.
  setPulse(on, reason = on ? 'start' : 'stop') {
    if (this.pulse === on) return;
    this.pulse = on;
    this.pulseArmed = false;
    this.onPulse?.(on, reason);
  }

  get pulsing() { return Boolean(this.pulse); }

  mount(system, planets, opts = {}) {
    this.dispose();
    this.system = system;
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.buildEnvironment(system);
    this.bodies = planets.map((p) => new PlanetBody(p));
    for (const b of this.bodies) b.parentBody = this.bodies[b.planet.orbit.parent] ?? null;
    this.satellites = new Satellites(this.root, this.bodies);
    for (const b of this.bodies) {
      b.update(this.time);
      this.root.add(b.group);
    }
    this.velocity.set(0, 0, 0);
    this.pulse = false;
    this.spawn(opts?.spawnNear ?? null);
  }

  buildEnvironment(system) {
    const light = new THREE.PointLight(system.star.color, 3, 0, 0);
    this.bh = system.star.blackHole ? buildBlackHole(system.star) : null;
    this.root.add(light, new THREE.AmbientLight(0x8090a8, 0.45), this.bh ? this.bh.group : buildStar(system.star));
    const bg = nebulaTexture(system.seed, unitOf(system.seed, 911));
    bg.mapping = THREE.EquirectangularReflectionMapping;
    const old = this.scene.background;
    if (old && old !== bg) release(old); // one nebula (~16 MB GPU) per visited system otherwise
    this.scene.background = bg;
    this.scene.backgroundIntensity = 0.85;
    this.starfield = buildStarfield(system.seed);
    this.dust = buildDust();
    this.root.add(this.starfield, this.dust.lines);
  }

  spawn(index) {
    const ship = this.ship;
    const body = typeof index === 'number' ? this.bodies[index] : null;
    if (body) {
      // Day side, above the orbit plane: looking back shows the lit face of the planet.
      const away = tmpA.copy(body.pos).normalize().negate().add(tmpC.set(0, 0.7, 0)).normalize();
      ship.position.copy(body.pos).addScaledVector(away, body.radius * 3.2);
      this.face(tmpB.copy(ship.position).add(away));
    } else {
      // Arrive near the innermost planet, on its day side, looking at it.
      const first = this.bodies[0];
      const toStar = tmpA.copy(first.pos).normalize().negate().add(tmpC.set(0.35, 0.25, 0)).normalize();
      ship.position.copy(first.pos).addScaledVector(toStar, Math.max(first.radius * 7, 500));
      this.face(first.pos);
    }
    this.rig.snap();
  }

  // Point the ship's nose (-Z) at a world point.
  face(target) {
    tmpM.lookAt(this.ship.position, target, UP);
    this.ship.quaternion.setFromRotationMatrix(tmpM);
  }

  update(dt, input) {
    if (!this.root) return;
    dt = Math.min(dt, 0.1);
    if (input.pressed('KeyV')) this.rig.toggleMode();
    if (!this.controls) input = IDLE;
    const carried = this.nearestBody(4);
    if (carried) tmpC.copy(carried.pos);
    this.time += dt;
    for (const b of this.bodies) b.update(this.time);
    this.satellites.update(this.time);
    if (carried) this.ship.position.add(tmpC.subVectors(carried.pos, tmpC));
    const throttle = this.fly(dt, input);
    this.rig.update(dt, throttle, this.speed);
    this.bh?.update(dt, this.camera);
    this.starfield.position.copy(this.camera.position);
    updateDust(this.dust, this.camera.position, this.velocity);
  }

  fly(dt, input) {
    const stats = this.design.stats;
    const q = this.ship.quaternion;
    steer(q, dt, input, stats.agility);
    const pulse = this.pulse && this.controls;
    const cap = speedCap(this.ship.position, this.bodies, this.system.star.size, input.down('ShiftLeft'), stats.speed, pulse);
    // Arm once clear of the departure planet; drop out when the next body gets close.
    if (pulse && cap >= PULSE_SPEED * 0.15) this.pulseArmed = true;
    else if (pulse && this.pulseArmed) this.setPulse(false, 'arrive');
    const throttle = thrust(q, this.velocity, dt, input, cap, pulse);
    if (this.bh) this.velocity.addScaledVector(this.bh.gravityAt(this.ship.position, tmpB), dt);
    this.ship.position.addScaledVector(this.velocity, dt);
    collide(this.ship.position, this.velocity, this.bodies, this.system.star.size);
    if (this.ship.position.length() < this.system.star.size * 1.6) this.onStarBurn?.(dt);
    return throttle;
  }

  // Nearest body whose surface is within radius * factor.
  nearestBody(factor) {
    let best = null;
    let bestGap = Infinity;
    for (const b of this.bodies) {
      const gap = this.ship.position.distanceTo(b.pos) - b.radius;
      if (gap < b.radius * factor && gap < bestGap) {
        best = b;
        bestGap = gap;
      }
    }
    return best;
  }

  targetPlanet() {
    const b = this.nearestBody(4);
    if (!b) return null;
    return { planet: b.planet, distance: this.ship.position.distanceTo(b.pos) - b.radius };
  }

  lookedPlanet() {
    const fwd = tmpA.set(0, 0, -1).applyQuaternion(this.ship.quaternion);
    let best = null;
    let bestAngle = Infinity;
    for (const b of this.bodies) {
      const dir = tmpB.subVectors(b.pos, this.ship.position);
      const len = dir.length();
      const angle = Math.acos(THREE.MathUtils.clamp(dir.dot(fwd) / len, -1, 1));
      const allowed = Math.max(LOOK_ANGLE, Math.asin(Math.min(1, b.radius / len)));
      if (angle <= allowed && angle < bestAngle) {
        bestAngle = angle;
        best = { planet: b.planet, distance: len - b.radius };
      }
    }
    return best;
  }

  get speed() {
    return this.velocity.length();
  }

  render(renderer) {
    renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Frees the system scene; the ship model survives (freed by setShip on swap).
  dispose() {
    if (!this.root) return;
    this.bh?.dispose();
    this.bh = null;
    this.satellites?.dispose();
    disposeTree(this.root);
    this.scene.remove(this.root);
    this.root = null;
    this.bodies = [];
    this.starfield = null;
    this.dust = null;
  }
}
