// Artificial satellites and small stations orbiting planets (Earth gets an ISS-like station).
import * as THREE from 'three';
import { Rng } from '../core/rng.js';

const MAT = {
  body: new THREE.MeshStandardMaterial({ color: 0xd8d4c8, metalness: 0.6, roughness: 0.35 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.8, roughness: 0.3 }),
  panel: new THREE.MeshStandardMaterial({ color: 0x1b2f6b, metalness: 0.4, roughness: 0.25, emissive: 0x0a1433, emissiveIntensity: 0.6 }),
  light: new THREE.MeshBasicMaterial({ color: 0xff4040 }),
};
const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

// A small satellite: gold-foil bus, two solar wings, a dish and a blinking beacon.
function buildSatellite(rng) {
  const g = new THREE.Group();
  g.add(box(1, 1, 1.4, rng.chance(0.5) ? MAT.gold : MAT.body));
  const span = rng.range(2, 4);
  for (const side of [-1, 1]) {
    const wing = box(span, 0.05, 1.1, MAT.panel);
    wing.position.x = side * (span / 2 + 0.6);
    g.add(wing);
  }
  const dish = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.3, 12, 1, true), MAT.body);
  dish.position.set(0, 0.2, 0.9);
  dish.rotation.x = Math.PI / 2;
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), MAT.light);
  beacon.position.y = 0.6;
  g.add(dish, beacon);
  g.userData.beacon = beacon;
  return g;
}

// ISS-like station: a truss with modules and big solar arrays.
function buildStation() {
  const g = new THREE.Group();
  g.add(box(22, 0.6, 0.6, MAT.body));
  for (let i = -1; i <= 1; i++) {
    const mod = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 5, 12), MAT.body);
    mod.rotation.x = Math.PI / 2;
    mod.position.set(i * 2.4, 0, 0);
    g.add(mod);
  }
  for (const x of [-10, -7, 7, 10]) {
    for (const z of [-1, 1]) {
      const arr = box(2.2, 0.05, 8, MAT.panel);
      arr.position.set(x, 0, z * 4.8);
      g.add(arr);
    }
  }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 4), MAT.light);
  beacon.position.y = 1.2;
  g.add(beacon);
  g.userData.beacon = beacon;
  return g;
}

function satelliteCount(planet, rng) {
  if (planet.style === 'earth') return 14;
  if (planet.gas || planet.style) return rng.int(2);
  return rng.chance(0.45) ? 1 + rng.int(4) : 0;
}

export class Satellites {
  constructor(parent, bodies) {
    this.group = new THREE.Group();
    parent.add(this.group);
    this.items = [];
    for (const body of bodies) this.addFor(body);
  }

  addFor(body) {
    const rng = new Rng(body.planet.seed ^ 0x5a7e);
    const n = satelliteCount(body.planet, rng);
    for (let i = 0; i < n; i++) {
      const station = body.planet.style === 'earth' && i === 0;
      const mesh = station ? buildStation() : buildSatellite(rng);
      const scale = station ? 0.35 : rng.range(0.25, 0.5);
      mesh.scale.setScalar(scale);
      this.group.add(mesh);
      this.items.push({ body, mesh, dist: body.radius * rng.range(1.35, 2.4), speed: rng.range(0.05, 0.18) * (rng.chance(0.2) ? -1 : 1),
        phase: rng.range(0, Math.PI * 2), tilt: rng.range(-1.2, 1.2), spin: rng.range(-0.3, 0.3), name: station ? 'Stasiun Orbit' : null });
    }
  }

  update(time) {
    for (const s of this.items) {
      const a = s.phase + s.speed * time;
      const c = Math.cos(a) * s.dist, v = Math.sin(a) * s.dist;
      s.mesh.position.set(s.body.pos.x + c, s.body.pos.y + v * Math.sin(s.tilt), s.body.pos.z + v * Math.cos(s.tilt));
      s.mesh.rotation.set(s.tilt, a + s.spin * time, 0);
      s.mesh.userData.beacon.visible = ((time + s.phase) % 1.4) < 0.25;
    }
  }

  // Named ones (stations) for HUD markers.
  get named() { return this.items.filter((s) => s.name); }

  dispose() {
    this.group.removeFromParent();
    this.group.traverse((o) => o.geometry?.dispose());
    this.items = [];
  }
}
