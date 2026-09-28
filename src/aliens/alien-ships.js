// AlienShips: 1-4 alien vessels in ~50% of systems (always some where a planet hosts an
// outpost). Some hover around their outpost planet, others cruise between planets.
// Spawn choices come from the system seed; the flight itself uses Math.random.
import * as THREE from 'three';
import { Rng, hash32 } from '../core/rng.js';
import { glowTexture } from '../assets/textures.js';
import { GeoKit } from './body-kit.js';
import { buildAlienShip } from './alien-ship-models.js';
import { RACES, hasOutpost, raceFor, alienName } from './races.js';

const SALT = 0xa15c;
const SCALE = 0.14;             // same metres -> space units factor as the player's ship
const BEACON = 0.06;            // screen-space size of the running light
const NEAR_FADE = [8, 30], FAR_FADE = [4500, 9000];
const TURN = 1.2;
const UP = new THREE.Vector3(0, 1, 0);
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3(), tmpD = new THREE.Vector3();
const lighten = (hex) => new THREE.Color(hex).lerp(new THREE.Color(0xffffff), 0.35).getHex();
const ramp = (x, a, b) => THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);

export class AlienShips {
  constructor(space) {
    this.space = space;
    this.group = new THREE.Group();
    this.group.name = 'alien-ships';
    this.ships = [];
    this.items = [];
    this.kit = null;
    this.time = 0;
  }

  mount(system) {
    this.dispose();
    const rng = new Rng(hash32(system.seed, SALT));
    const bodies = this.space.bodies ?? [];
    const homes = bodies.filter((b) => hasOutpost(b.planet));
    let count = rng.chance(0.5) ? 1 + rng.int(4) : 0;
    if (homes.length && !count) count = 1 + rng.int(2);
    if (!count || !bodies.length) return;
    this.kit = new GeoKit();
    this.space.scene.add(this.group);
    for (let i = 0; i < count; i++) {
      const home = i < homes.length && (i === 0 || rng.chance(0.6)) ? homes[i] : null;
      this.spawn(hash32(system.seed, SALT, i), home, bodies, rng);
    }
  }

  spawn(seed, home, bodies, rng) {
    const srng = new Rng(seed);
    const race = home ? raceFor(home.planet) : srng.pick(RACES);
    const hull = buildAlienShip(this.kit, race, srng);
    hull.group.scale.setScalar(SCALE);
    const root = new THREE.Group();
    const beaconMat = new THREE.SpriteMaterial({ map: glowTexture(lighten(race.glow)), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: false });
    const beacon = new THREE.Sprite(beaconMat);
    beacon.scale.setScalar(BEACON);
    root.add(hull.group, beacon);
    this.group.add(root);
    const name = `${alienName(race, srng)} (${race.name})`;
    const ship = { id: `alien-ship-${seed}`, name, race, root, hull, beaconMat, position: root.position,
      mode: home ? 'hover' : 'cruise', target: home ?? bodies[rng.int(bodies.length)], timer: 0,
      angle: rng.range(0, Math.PI * 2), speed: srng.range(90, 260), orbitR: 0, bob: rng.range(0, 6) };
    ship.entry = { id: ship.id, name, position: root.position };
    this.placeInitial(ship, rng);
    this.ships.push(ship);
  }

  placeInitial(ship, rng) {
    const b = ship.target;
    ship.orbitR = b.radius * 1.6 + rng.range(18, 45);
    if (ship.mode === 'hover') return this.hover(ship, 0);
    tmpD.set(rng.range(-1, 1), rng.range(-0.15, 0.15), rng.range(-1, 1)).normalize();
    ship.position.copy(b.pos).addScaledVector(tmpD, b.radius * 3 + rng.range(300, 1500));
    this.pickNext(ship);
  }

  // Next planet to fly to (a different one when possible).
  pickNext(ship) {
    const bodies = this.space.bodies;
    const options = bodies.filter((b) => b !== ship.target);
    ship.target = options.length ? options[Math.floor(Math.random() * options.length)] : bodies[0];
    ship.orbitR = ship.target.radius * 1.6 + 20 + Math.random() * 30;
    ship.mode = 'cruise';
  }

  update(dt) {
    if (!this.ships.length) return;
    dt = Math.min(dt, 0.1);
    this.time += dt;
    const cam = this.space.camera.position;
    for (const s of this.ships) {
      if (s.mode === 'cruise') this.cruise(s, dt);
      else this.hover(s, dt);
      this.animate(s, dt, cam);
    }
  }

  // Slow circle around the target planet with a gentle bob; 'linger' leaves after a while.
  hover(s, dt) {
    const b = s.target;
    s.angle += dt * (18 / s.orbitR);
    const y = Math.sin(this.time * 0.4 + s.bob) * s.orbitR * 0.15;
    tmpV.set(Math.cos(s.angle) * s.orbitR, y, Math.sin(s.angle) * s.orbitR).add(b.pos);
    tmpD.subVectors(tmpV, s.position);
    if (dt > 0 && tmpD.lengthSq() > 1e-6) this.turn(s, tmpD.normalize(), dt * 3);
    s.position.copy(tmpV);
    if (s.mode === 'linger' && (s.timer -= dt) <= 0) this.pickNext(s);
  }

  cruise(s, dt) {
    const b = s.target;
    tmpD.subVectors(b.pos, s.position);
    const dist = tmpD.length() - s.orbitR;
    tmpD.normalize();
    this.turn(s, tmpD, dt);
    const v = s.speed * THREE.MathUtils.clamp(dist / 400, 0.15, 1);
    tmpV.set(0, 0, -1).applyQuaternion(s.root.quaternion);
    s.position.addScaledVector(tmpV, v * dt);
    if (dist > 5) return;
    s.mode = 'linger';
    s.timer = 20 + Math.random() * 30;
    s.angle = Math.atan2(s.position.z - b.pos.z, s.position.x - b.pos.x);
  }

  turn(s, dir, dt) {
    tmpM.lookAt(s.position, tmpV.copy(s.position).add(dir), UP);
    tmpQ.setFromRotationMatrix(tmpM);
    s.root.quaternion.rotateTowards(tmpQ, TURN * dt);
  }

  animate(s, dt, cam) {
    for (const p of s.hull.spin) p.rotation.y += dt * 0.9;
    for (const f of s.hull.flaps) f.rotation.z = f.userData.side * Math.sin(this.time * 3 + s.bob) * 0.25;
    const d = cam.distanceTo(s.position);
    s.beaconMat.opacity = ramp(d, NEAR_FADE[0], NEAR_FADE[1]) * (1 - ramp(d, FAR_FADE[0], FAR_FADE[1]));
    s.root.children[1].scale.setScalar(BEACON * (1 + 0.3 * Math.sin(this.time * 2.5 + s.bob))); // alien pulse
  }

  // [{ id, name, position }] for HUD markers / minimap (reused array and entries).
  list() {
    const out = this.items;
    out.length = 0;
    for (const s of this.ships) out.push(s.entry);
    return out;
  }

  dispose() {
    for (const s of this.ships) {
      s.hull.mats.forEach((m) => m.dispose());
      s.beaconMat.dispose(); // glow texture is cached by textures.js
    }
    this.group.clear();
    this.group.removeFromParent();
    this.kit?.dispose();
    this.kit = null;
    this.ships = [];
    this.items.length = 0;
  }
}
