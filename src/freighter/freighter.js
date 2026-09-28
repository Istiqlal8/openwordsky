// Freighter: the capital ship "Kapal Induk" parked in every star system. Fly into its lit
// hangar bay (see `dock` / docking()) to go aboard; launch() puts the ship back outside.
import * as THREE from 'three';
import { rngOf, unitOf } from '../core/rng.js';
import { glowTexture } from '../assets/textures.js';
import { textTexture, disposeTree } from './kit.js';
import { buildFreighterModel } from './freighter-model.js';
import { buildSpecFreighter } from '../fleet/spec-model.js';
import { pushOut, inBox } from './freighter-collide.js';

export const FREIGHTER_NAME = 'Kapal Induk';
const MARGIN = 3;           // keep the ship this far from the hull
const REARM = 2.5;          // must fly this many dock radii away before docking can trigger again
const LAUNCH_SPEED = 25;
const OWNED_DIST = 1200;    // how far from the arrival point the player's own ship parks
const ramp = (x, a, b) => THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3(), _m = new THREE.Matrix4();

// Parking spot for the player's own ship: off to one side of the arrival point, clear of planets.
function ownedSpot(at, bodies, radius) {
  const dir = new THREE.Vector3(at.x, 0, at.z);
  if (dir.lengthSq() < 1) dir.set(1, 0, 0);
  dir.normalize();
  const side = new THREE.Vector3(-dir.z, 0.16, dir.x).normalize();
  const out = new THREE.Vector3().copy(at).addScaledVector(side, OWNED_DIST + radius * 0.6);
  for (const b of bodies) {
    const gap = out.distanceTo(b.pos) - b.radius - radius - 400;
    if (gap < 0) out.addScaledVector(side, -gap + 200);
  }
  return out;
}

// Yaw that turns the hangar mouth (local +X) toward `target`.
function bayYaw(from, target) {
  return Math.atan2(-(target.z - from.z), target.x - from.x);
}

function sprite(hex, scale, attenuate = true) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(hex), color: hex, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: attenuate }));
  s.scale.setScalar(scale);
  return s;
}

export class Freighter {
  constructor(space) {
    this.space = space;
    this.model = null;
    this.owned = false;
    this.time = 0;
    this.armed = true;
    this.dockState = { position: new THREE.Vector3(), radius: 0 };
    this.near = { name: FREIGHTER_NAME, distance: Infinity };
  }

  // One freighter per system, parked 1,500-3,000 units from the innermost planet. Call after
  // space.mount(). Passing `spec` mounts the player's own capital ship instead of the system's.
  mount(system, spec = null) {
    this.dispose();
    const bodies = this.space.bodies;
    if (!bodies.length) return;
    if (spec) { this.mountOwned(spec); return; }
    const rng = rngOf(system.seed, 0xf8e1);
    this.model = buildFreighterModel(rng, unitOf(system.seed, 0x5a1b));
    this.owned = false;
    this.near.name = this.model.name;
    const g = this.model.group;
    g.position.copy(this.placement(rng, bodies[0].pos, system.star.size));
    g.rotation.set(rng.range(-0.08, 0.08), rng.range(0, Math.PI * 2), rng.range(-0.05, 0.05));
    this.spin = rng.range(-0.004, 0.004);
    this.finish(g);
  }

  // The player's own capital ship, built from its saved spec (src/fleet/): parked beside the
  // arrival point with its hangar mouth already turned toward the player, so it is always reachable.
  mountOwned(spec, nearPos = null) {
    if (this.model) this.dispose();
    this.model = buildSpecFreighter(spec);
    this.owned = true;
    this.near.name = this.model.name;
    const g = this.model.group;
    g.scale.setScalar(this.model.size);
    const at = nearPos ?? this.space.shipObject.position;
    g.position.copy(ownedSpot(at, this.space.bodies, this.model.bound * this.model.size));
    g.rotation.set(0, bayYaw(g.position, at), 0);
    this.spin = 0;
    this.finish(g);
  }

  finish(g) {
    this.base = g.position.clone();
    this.addSprites();
    this.space.scene.add(g);
    this.armed = true;
  }

  placement(rng, planet, starSize) {
    const dir = _a.set(rng.range(-1, 1), rng.range(-0.25, 0.25), rng.range(-1, 1)).normalize();
    const out = new THREE.Vector3().copy(planet).addScaledVector(dir, rng.range(1500, 3000));
    if (out.length() < starSize * 5) out.copy(planet).addScaledVector(dir, -rng.range(1500, 3000));
    return out;
  }

  addSprites() {
    const { group, lights, engineCores, engineHex, name, top } = this.model;
    this.tex = textTexture(name, { w: 1024, h: 112, font: 'bold 64px system-ui, sans-serif', fg: '#bff0ff' });
    this.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, sizeAttenuation: false }));
    this.label.scale.set(0.32, 0.035, 1);
    this.label.position.set(0, top, 0);
    this.beacon = sprite(0x7fe6ff, 0.05, false);
    this.navs = lights.map(({ p, hex, mode }) => { const s = sprite(hex, mode === 'pulse' ? 10 : 14); s.position.copy(p); s.mode = mode; return s; });
    const engines = engineCores.map(({ p, r }) => { const s = sprite(engineHex, r * 6.5); s.position.copy(p); return s; });
    group.add(this.label, this.beacon, ...this.navs, ...engines);
  }

  update(dt) {
    if (!this.model) return;
    this.time += dt;
    const g = this.model.group, t = this.time;
    g.rotation.y += this.spin * dt;
    for (const s of this.model.spinners) s.obj.rotation[s.axis] += s.speed * dt;
    g.position.y = this.base.y + Math.sin(t * 0.15) * 3;
    this.blink(t);
    const d = this.space.camera.position.distanceTo(g.position);
    this.beacon.material.opacity = ramp(d, 1500, 4500);
    this.label.material.opacity = 0.35 + 0.65 * ramp(d, 250, 700);
    const s = this.space.shipObject.position;
    if (!this.armed && s.distanceTo(this.dock.position) > this.dockState.radius * REARM) this.armed = true;
  }

  blink(t) {
    const on = 0.35 + 0.65 * (Math.sin(t * 2.2) > 0 ? 1 : 0), flash = (t % 1.6) < 0.12 ? 1 : 0.1;
    const pulse = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 1.3));
    for (const s of this.navs) s.material.opacity = s.mode === 'strobe' ? flash : s.mode === 'pulse' ? pulse : on;
    const lead = Math.floor(t * 6) % 10;
    this.model.bay.chevrons.forEach((m, i) => { m.emissiveIntensity = i === 6 - lead ? 3.5 : i === 7 - lead ? 1.4 : 0.35; });
    this.model.bay.field.opacity = 0.08 + Math.sin(t * 3) * 0.03;
  }

  // Hangar mouth in world space: flying within `radius` of `position` means docking.
  get dock() {
    if (!this.model) { this.dockState.radius = 0; return this.dockState; }
    const bay = this.model.bay, g = this.model.group;
    g.updateMatrixWorld();
    this.dockState.position.copy(bay.dock).applyMatrix4(g.matrixWorld);
    this.dockState.radius = bay.radius * g.scale.x;
    return this.dockState;
  }

  // True once when the ship enters the bay (re-arms after flying away).
  docking(shipPos) {
    if (!this.model || !this.armed) return false;
    const d = this.dock;
    if (shipPos.distanceTo(d.position) >= d.radius) return false;
    this.armed = false;
    return true;
  }

  nearest(shipPos) {
    this.near.distance = this.model ? shipPos.distanceTo(this.dock.position) : Infinity;
    return this.near;
  }

  // Put the player's ship just outside the hangar, nose pointing away, drifting out.
  launch(ship, velocity) {
    if (!this.model) return;
    const g = this.model.group, bay = this.model.bay;
    g.updateMatrixWorld();
    ship.position.copy(bay.launch).applyMatrix4(g.matrixWorld);
    const out = _a.copy(bay.normal).transformDirection(g.matrixWorld);
    _m.lookAt(ship.position, _b.copy(ship.position).add(out), g.up);
    ship.quaternion.setFromRotationMatrix(_m);
    velocity?.copy(out).multiplyScalar(LAUNCH_SPEED);
    this.armed = false;
  }

  // Keep the ship out of the hull (the bay stays open). Returns true when it was pushed.
  collide(pos, velocity) {
    if (!this.model) return false;
    const m = this.model, g = m.group, p = g.worldToLocal(_a.copy(pos));
    if (p.lengthSq() > m.bound * m.bound || m.holes.some((h) => inBox(p, h))) return false;
    let hit = false;
    for (const s of m.solids) {
      if (!pushOut(p, s, MARGIN, _n)) continue;
      hit = true;
      _n.transformDirection(g.matrixWorld);
      if (velocity) velocity.addScaledVector(_n, -Math.min(0, velocity.dot(_n)));
    }
    if (hit) pos.copy(g.localToWorld(p));
    return hit;
  }

  dispose() {
    if (!this.model) return;
    disposeTree(this.model.group, [this.tex]);
    this.model = null;
    this.owned = false;
  }
}
