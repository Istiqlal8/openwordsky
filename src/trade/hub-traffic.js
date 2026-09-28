// Spaceport traffic: alien ships parked on the pads (merged into one mesh pair), ships that
// land, wait and take off again, and freighters crossing the sky above the market.
import * as THREE from 'three';
import { Rng, hash32 } from '../core/rng.js';
import { GeoKit } from '../aliens/body-kit.js';
import { buildAlienShip } from '../aliens/alien-ship-models.js';
import { RACES } from '../aliens/races.js';
import { bakeGroup } from './crowd-bake.js';

const LANDERS = 2, FLYOVERS = 3;
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
const bez = (out, s, m, e, t) => out.copy(s).multiplyScalar((1 - t) ** 2).addScaledVector(m, 2 * t * (1 - t)).addScaledVector(e, t * t);

// Ship hull for a race, lifted so its lowest point rests `clear` metres above y = 0.
function hullFor(kit, race, rng, clear = 0.6) {
  const hull = buildAlienShip(kit, race, rng), box = new THREE.Box3().setFromObject(hull.group);
  hull.group.position.y = -box.min.y + clear;
  const g = new THREE.Group();
  g.add(hull.group);
  return { g, hull };
}

export class HubTraffic {
  // pads: world pad tops [{ x, y, z, yaw }] (the player's pad excluded); center: { x, y, z }.
  constructor(scene, pads, seed, center) {
    Object.assign(this, { scene, center, rng: new Rng(hash32(seed, 0x7aff)) });
    this.bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.35 });
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.group = new THREE.Group();
    this.kit = new GeoKit();
    this.solids = [];
    this.parked = this.parkShips(pads.slice(LANDERS));
    this.flyers = [...pads.slice(0, LANDERS).map((p) => this.flyer(p)), ...Array.from({ length: FLYOVERS }, () => this.flyer(null))];
    this.kit.dispose();
    scene.add(this.group);
  }

  meshes(geo) {
    return [new THREE.Mesh(geo.body, this.bodyMat), ...(geo.glow ? [new THREE.Mesh(geo.glow, this.glowMat)] : [])];
  }

  // All parked ships baked together: two draw calls for the whole field.
  parkShips(pads) {
    const tmp = new THREE.Group(), mats = [];
    for (const p of pads) {
      const { g, hull } = hullFor(this.kit, this.rng.pick(RACES), this.rng);
      g.position.set(p.x, p.y, p.z);
      g.rotation.y = this.rng.range(0, Math.PI * 2);
      tmp.add(g);
      mats.push(...hull.mats);
      this.solids.push({ x: p.x, z: p.z, r: 5.5 });
    }
    const geo = bakeGroup(tmp);
    mats.forEach((m) => m.dispose());
    const out = geo.body ? this.meshes(geo) : [];
    this.group.add(...out);
    return out;
  }

  // Lander (pad) or flyover (null) ship with its own small state machine.
  flyer(pad) {
    const race = this.rng.pick(RACES), { g, hull } = hullFor(this.kit, race, this.rng, 0);
    const geo = bakeGroup(g);
    hull.mats.forEach((m) => m.dispose());
    const root = new THREE.Group();
    root.add(...this.meshes(geo));
    root.visible = false;
    this.group.add(root);
    return { root, pad, race, state: 'away', timer: this.rng.range(0, 6), t: 0, dur: 1,
      s: new THREE.Vector3(), m: new THREE.Vector3(), e: new THREE.Vector3(), prev: new THREE.Vector3() };
  }

  update(dt, visible) {
    this.group.visible = visible;
    if (!visible) return;
    for (const f of this.flyers) this.fly(f, dt);
  }

  fly(f, dt) {
    if (f.state === 'away' || f.state === 'parked') {
      if ((f.timer -= dt) > 0) return;
      return f.pad ? (f.state === 'away' ? this.startDescent(f) : this.startAscent(f)) : this.startFlyover(f);
    }
    f.t = Math.min(1, f.t + dt / f.dur);
    const k = f.state === 'descend' ? 1 - (1 - f.t) ** 2 : f.state === 'ascend' ? f.t * f.t : f.t;
    f.prev.copy(f.root.position);
    bez(f.root.position, f.s, f.m, f.e, k);
    _a.subVectors(f.root.position, f.prev);
    if (_a.x * _a.x + _a.z * _a.z > 1e-4) f.root.rotation.y = Math.atan2(-_a.x, -_a.z);
    f.root.rotation.z = Math.sin(f.t * Math.PI) * 0.08;
    if (f.t < 1) return;
    if (f.state === 'descend') Object.assign(f, { state: 'parked', timer: 8 + Math.random() * 10 });
    else Object.assign(f, { state: 'away', timer: 3 + Math.random() * 8 }), (f.root.visible = false);
  }

  // Far point in a random direction, `up` metres above the hub centre.
  farPoint(out, from, dist, up) {
    const a = Math.random() * Math.PI * 2;
    return out.set(from.x + Math.cos(a) * dist, this.center.y + up, from.z + Math.sin(a) * dist);
  }

  startDescent(f) {
    const p = f.pad;
    this.farPoint(f.s, p, 700, 320);
    f.e.set(p.x, p.y, p.z);
    f.m.set(p.x + (f.s.x - p.x) * 0.1, p.y + 70, p.z + (f.s.z - p.z) * 0.1);
    Object.assign(f, { state: 'descend', t: 0, dur: 13 });
    f.root.position.copy(f.s);
    f.root.visible = true;
  }

  startAscent(f) {
    const p = f.pad;
    f.s.set(p.x, p.y, p.z);
    f.m.set(p.x, p.y + 90, p.z);
    this.farPoint(f.e, p, 800, 360);
    Object.assign(f, { state: 'ascend', t: 0, dur: 11 });
  }

  startFlyover(f) {
    const c = this.center, alt = 90 + Math.random() * 90;
    this.farPoint(f.s, c, 900, alt);
    f.e.set(2 * c.x - f.s.x, f.s.y + (Math.random() - 0.5) * 60, 2 * c.z - f.s.z);
    _b.addVectors(f.s, f.e).multiplyScalar(0.5);
    f.m.copy(_b);
    Object.assign(f, { state: 'flyover', t: 0, dur: 25 + Math.random() * 15 });
    f.root.position.copy(f.s);
    f.root.visible = true;
  }

  // Visible flying ships (for the minimap) -> [{ x, z }].
  airborne() {
    return this.flyers.filter((f) => f.root.visible && f.state !== 'parked').map((f) => f.root.position);
  }

  dispose() {
    this.group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    this.group.removeFromParent();
    this.bodyMat.dispose();
    this.glowMat.dispose();
    this.flyers = this.parked = [];
  }
}
