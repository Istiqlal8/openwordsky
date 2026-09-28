// Moving things aboard: crew walking patrol routes, hovering maintenance drones, floor robots
// and the gantry crane.
import * as THREE from 'three';
import { Astronaut } from '../view/astronaut.js';
import { box, cyl } from './kit.js';

const ACCENTS = [0x40c8ff, 0xff5a3a, 0x60ff90, 0xffd040, 0xc070ff, 0xff90c0];
const SUITS = [0xd8dde4, 0xf0d9a8, 0xb9c6d6, 0xe9e4d8, 0xcfd6e0];
const WALK = 1.6;
const _d = new THREE.Vector3();

// route: [[x, z, y?], ...]; one point = a console watcher. suits: optional uniform colours.
function crewMember(g, route, i, suits) {
  const a = new Astronaut(ACCENTS[i % ACCENTS.length]);
  a.mats.suit.color.setHex(suits[i % suits.length]);
  g.add(a.group);
  const [x, z, y = 0] = route[0];
  return { a, route, leg: 0, wait: i * 0.7, feet: new THREE.Vector3(x, y, z), yaw: Math.PI };
}

function stepCrew(c, dt) {
  let speed = 0;
  if (c.route.length > 1 && (c.wait -= dt) <= 0) {
    const [tx, tz, ty = 0] = c.route[(c.leg + 1) % c.route.length];
    _d.set(tx - c.feet.x, ty - c.feet.y, tz - c.feet.z);
    const len = _d.length();
    if (len < 0.1) { c.leg = (c.leg + 1) % c.route.length; c.wait = 1 + Math.random() * 2; }
    else {
      c.feet.addScaledVector(_d, Math.min(len, WALK * dt) / len);
      if (Math.abs(_d.x) + Math.abs(_d.z) > 0.01) c.yaw = Math.atan2(-_d.x, -_d.z);
      speed = WALK;
    }
  } else if (c.route.length === 1) c.yaw = Math.sin(performance.now() * 0.0003) * 0.6; // console watcher
  c.a.update(dt, c.feet, c.yaw, speed, true);
}

function drone(g, mats, hex) {
  const d = new THREE.Group();
  d.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), mats.metal));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 6, 20), mats.dark);
  ring.rotation.x = Math.PI / 2;
  d.add(ring);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: hex }));
  eye.position.set(0, -0.05, -0.25);
  d.add(eye);
  g.add(d);
  return d;
}

function robot(g, mats) {
  const r = new THREE.Group();
  box(r, mats.orange, 0.8, 0.45, 1.1, 0, 0.45, 0);
  box(r, mats.dark, 0.5, 0.3, 0.4, 0, 0.82, -0.3);
  for (const x of [-0.42, 0.42]) for (const z of [-0.35, 0.35]) cyl(r, mats.dark, 0.18, 0.18, 0.12, x, 0.18, z, 10).rotation.z = Math.PI / 2;
  const lamp = box(r, mats.red, 0.14, 0.14, 0.14, 0, 1.03, -0.3);
  g.add(r);
  return { r, lamp };
}

export class InteriorLife {
  // plan: { crew: routes, suits?, robots: [[x0, z0, x1, z1]] }; anchors: [{ x, z }] ships the drones
  // circle; animators: [{ update(t, dt) }] from the layout (cranes, holo, fish, veins...).
  constructor(g, mats, anchors, plan, animators = []) {
    this.crew = plan.crew.map((route, i) => crewMember(g, route, i, plan.suits ?? SUITS));
    this.drones = [0x40d0ff, 0xffb040, 0x60ff90].map((hex) => drone(g, mats, hex));
    this.robots = (plan.robots ?? []).map((seg) => ({ ...robot(g, mats), seg }));
    this.anchors = anchors;
    this.animators = animators;
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    for (const c of this.crew) stepCrew(c, dt);
    this.drones.forEach((d, i) => {
      const a = this.anchors[i % this.anchors.length], ang = t * (0.4 + i * 0.13) + i * 2;
      d.position.set(a.x + Math.cos(ang) * 5.5, 3.2 + Math.sin(t * 1.3 + i) * 0.8, a.z + Math.sin(ang) * 4.5);
      d.rotation.y = -ang;
    });
    this.robots.forEach((b, i) => this.moveRobot(b, t * (0.2 + i * 0.05)));
    for (const a of this.animators) a.update(t, dt);
  }

  // Ping-pong along the robot's floor segment, facing its direction of travel.
  moveRobot({ r, lamp, seg: [x0, z0, x1, z1] }, s) {
    const k = 0.5 + 0.5 * Math.sin(s), dir = Math.cos(s) > 0 ? 1 : -1;
    r.position.set(x0 + (x1 - x0) * k, 0, z0 + (z1 - z0) * k);
    r.rotation.y = Math.atan2(-(x1 - x0) * dir, -(z1 - z0) * dir);
    lamp.visible = (this.t % 1) < 0.5;
  }

  dispose() {
    for (const c of this.crew) c.a.dispose();
    this.crew = [];
  }
}
