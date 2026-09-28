// Freighter: the capital ship "Kapal Induk" parked in every star system. Fly into its lit
// hangar bay (see `dock` / docking()) to go aboard; launch() puts the ship back outside.
import * as THREE from 'three';
import { rngOf } from '../core/rng.js';
import { glowTexture } from '../assets/textures.js';
import { textTexture, disposeTree } from './kit.js';
import { buildFreighterModel, freighterMaterials, HULL } from './freighter-model.js';
import { BAY } from './freighter-bay.js';

export const FREIGHTER_NAME = 'Kapal Induk';
const ACCENTS = [0x2f7fd0, 0xd0662f, 0x3aa87a, 0xc9b23a, 0x8a5ad0];
const REARM = 2.5;          // must fly this many dock radii away before docking can trigger again
const LAUNCH_SPEED = 25;
const ramp = (x, a, b) => THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Matrix4();

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
    this.time = 0;
    this.armed = true;
    this.dockState = { position: new THREE.Vector3(), radius: 0 };
    this.near = { name: FREIGHTER_NAME, distance: Infinity };
  }

  // One freighter per system, parked 1,500-3,000 units from the innermost planet. Call after space.mount().
  mount(system) {
    this.dispose();
    const bodies = this.space.bodies;
    if (!bodies.length) return;
    const rng = rngOf(system.seed, 0xf8e1);
    this.mats = freighterMaterials(rng.pick(ACCENTS));
    this.model = buildFreighterModel(rng, this.mats);
    const g = this.model.group;
    g.position.copy(this.placement(rng, bodies[0].pos, system.star.size));
    g.rotation.set(rng.range(-0.08, 0.08), rng.range(0, Math.PI * 2), rng.range(-0.05, 0.05));
    this.spin = rng.range(-0.004, 0.004);
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
    const { group, lights, engineCores } = this.model;
    this.tex = textTexture(FREIGHTER_NAME, { w: 512, h: 112, font: 'bold 64px system-ui, sans-serif', fg: '#bff0ff' });
    this.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, sizeAttenuation: false }));
    this.label.scale.set(0.16, 0.035, 1);
    this.label.position.set(0, HULL.H / 2 + 95, 60);
    this.beacon = sprite(0x7fe6ff, 0.05, false);
    this.navs = [[lights.port, 0xff3a2a], [lights.starboard, 0x3aff6a], [lights.strobe, 0xffffff], [lights.bow, 0xffffff]]
      .map(([p, hex]) => { const s = sprite(hex, 14); s.position.copy(p); return s; });
    const engines = engineCores.map((p) => { const s = sprite(0x6ad0ff, 34); s.position.copy(p); return s; });
    group.add(this.label, this.beacon, ...this.navs, ...engines);
  }

  update(dt) {
    if (!this.model) return;
    this.time += dt;
    const g = this.model.group, t = this.time;
    g.rotation.y += this.spin * dt;
    g.position.y = this.base.y + Math.sin(t * 0.15) * 3;
    this.blink(t);
    const d = this.space.camera.position.distanceTo(g.position);
    this.beacon.material.opacity = ramp(d, 1500, 4500);
    this.label.material.opacity = 0.35 + 0.65 * ramp(d, 250, 700);
    const s = this.space.shipObject.position;
    if (!this.armed && s.distanceTo(this.dock.position) > this.dockState.radius * REARM) this.armed = true;
  }

  blink(t) {
    const [port, star, strobe, bow] = this.navs;
    port.material.opacity = star.material.opacity = 0.35 + 0.65 * (Math.sin(t * 2.2) > 0 ? 1 : 0);
    strobe.material.opacity = bow.material.opacity = (t % 1.6) < 0.12 ? 1 : 0.1;
    const lead = Math.floor(t * 6) % 10;
    this.model.bay.chevrons.forEach((m, i) => { m.emissiveIntensity = i === 6 - lead ? 3.5 : i === 7 - lead ? 1.4 : 0.35; });
    this.model.bay.field.opacity = 0.08 + Math.sin(t * 3) * 0.03;
  }

  // Hangar mouth in world space: flying within `radius` of `position` means docking.
  get dock() {
    if (!this.model) { this.dockState.radius = 0; return this.dockState; }
    const bay = this.model.bay;
    this.model.group.updateMatrixWorld();
    this.dockState.position.copy(bay.dock).applyMatrix4(this.model.group.matrixWorld);
    this.dockState.radius = bay.radius;
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
    const g = this.model.group, p = g.worldToLocal(_a.copy(pos));
    const hx = HULL.W / 2 + 2, hy = HULL.H / 2 + 4, z0 = -186, z1 = 170;
    if (Math.abs(p.x) > hx || Math.abs(p.y) > hy || p.z < z0 || p.z > z1) return false;
    if (p.x > HULL.W / 2 - BAY.depth && Math.abs(p.y) < BAY.half - 1 && p.z > BAY.z0 + 1 && p.z < BAY.z1 - 1) return false;
    const pen = [hx - Math.abs(p.x), hy - Math.abs(p.y), Math.min(p.z - z0, z1 - p.z)];
    const axis = pen.indexOf(Math.min(...pen));
    if (axis === 0) p.x = Math.sign(p.x) * hx; else if (axis === 1) p.y = Math.sign(p.y) * hy;
    else p.z = p.z - z0 < z1 - p.z ? z0 : z1;
    pos.copy(g.localToWorld(p));
    const n = _b.set(axis === 0 ? 1 : 0, axis === 1 ? 1 : 0, axis === 2 ? 1 : 0).transformDirection(g.matrixWorld);
    if (velocity) velocity.addScaledVector(n, -velocity.dot(n));
    return true;
  }

  dispose() {
    if (!this.model) return;
    disposeTree(this.model.group, [this.tex]);
    this.model = null;
  }
}
