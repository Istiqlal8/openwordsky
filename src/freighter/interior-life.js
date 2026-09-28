// Moving things aboard: crew walking patrol routes, hovering maintenance drones, floor robots
// and the gantry crane.
import * as THREE from 'three';
import { Astronaut } from '../view/astronaut.js';
import { box, cyl } from './kit.js';

const CREW = [
  { accent: 0x40c8ff, suit: 0xd8dde4, route: [[-10, 9], [-10, -11], [-23, -11], [-23, 4]] },
  { accent: 0xff5a3a, suit: 0xf0d9a8, route: [[11, -11], [11, 5], [21, 5], [21, -11]] },
  { accent: 0x60ff90, suit: 0xb9c6d6, route: [[0.9, 17], [0.9, 38]] },
  { accent: 0xffd040, suit: 0xe9e4d8, route: [[6, 25], [11.5, 25], [11.5, 30.5]] },
  { accent: 0xc070ff, suit: 0xcfd6e0, route: [[-7, 52.6]] },
];
const WALK = 1.6;
const _d = new THREE.Vector3();

function crewMember(g, info, i) {
  const a = new Astronaut(info.accent);
  a.mats.suit.color.setHex(info.suit);
  g.add(a.group);
  const [x, z] = info.route[0];
  return { a, route: info.route, leg: 0, wait: i * 0.7, feet: new THREE.Vector3(x, 0, z), yaw: Math.PI };
}

function stepCrew(c, dt) {
  let speed = 0;
  if (c.route.length > 1 && (c.wait -= dt) <= 0) {
    const [tx, tz] = c.route[(c.leg + 1) % c.route.length];
    _d.set(tx - c.feet.x, 0, tz - c.feet.z);
    const len = _d.length();
    if (len < 0.1) { c.leg = (c.leg + 1) % c.route.length; c.wait = 1 + Math.random() * 2; }
    else {
      c.feet.addScaledVector(_d, Math.min(len, WALK * dt) / len);
      c.yaw = Math.atan2(-_d.x, -_d.z);
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
  constructor(g, mats, anchors) {
    this.crew = CREW.map((info, i) => crewMember(g, info, i));
    this.drones = [0x40d0ff, 0xffb040, 0x60ff90].map((hex) => drone(g, mats, hex));
    this.robots = [robot(g, mats), robot(g, mats)];
    this.anchors = anchors; // [{ x, z }] ships the drones circle
    this.crane = null;
    this.holo = null;
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
    this.moveRobot(this.robots[0], Math.sin(t * 0.25) * 7, -11.5, Math.cos(t * 0.25) > 0 ? -Math.PI / 2 : Math.PI / 2);
    this.moveRobot(this.robots[1], -8.5, Math.sin(t * 0.18) * 10, Math.cos(t * 0.18) > 0 ? Math.PI : 0);
    if (this.crane) {
      this.crane.bridge.position.x = Math.sin(t * 0.1) * 20;
      this.crane.trolley.position.z = Math.sin(t * 0.23) * 7;
    }
    if (this.holo) this.holo.rotation.y = t * 0.15;
  }

  moveRobot({ r, lamp }, x, z, rot) {
    r.position.set(x, 0, z);
    r.rotation.y = rot;
    lamp.visible = (this.t % 1) < 0.5;
  }

  dispose() {
    for (const c of this.crew) c.a.dispose();
    this.crew = [];
  }
}
