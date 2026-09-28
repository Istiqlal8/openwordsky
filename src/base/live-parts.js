// Animated / special parts of the base: beacon sprites, lamp halos, robot arm, flag, spare ship.
import * as THREE from 'three';
import { glowTexture } from '../assets/textures.js';
import { buildShip } from '../view/ship/ship-model.js';
import { shipDesign } from '../view/ship/ship-design.js';
import { makeRobotArm } from './workshop.js';
import { makeFlag } from './extras.js';

const SPARE_SEED = 0x5eb1;

function beaconSprite(size, attenuate) {
  const mat = new THREE.SpriteMaterial({ map: glowTexture(0xff5040), color: 0xff6050, fog: false,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: attenuate });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(size);
  return s;
}

export class LiveParts {
  // anchors: from assembleBase(); mats: base materials (halo for lamp points).
  constructor(scene, anchors, mats) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.makeBeacon(anchors.beacon);
    this.makeHalos(anchors.lampHeads, mats.halo);
    this.arm = makeRobotArm();
    this.arm.group.position.set(anchors.arm.x, anchors.workshop.floor, anchors.arm.z);
    this.arm.group.rotation.y = anchors.workshop.yaw;
    this.flag = makeFlag();
    this.flag.mesh.position.set(anchors.flag.x, anchors.flag.y + 5.9, anchors.flag.z);
    this.flag.mesh.rotation.y = anchors.flag.yaw + 0.6;
    this.group.add(this.arm.group, this.flag.mesh);
    this.makeSpareShip(anchors);
  }

  makeBeacon(p) {
    this.near = beaconSprite(5, true);
    this.far = beaconSprite(0.024, false); // constant screen size: visible from the air
    for (const s of [this.near, this.far]) { s.position.set(p.x, p.y, p.z); this.group.add(s); }
  }

  makeHalos(heads, mat) {
    this.haloGeo = new THREE.BufferGeometry();
    this.haloGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(heads), 3));
    this.group.add(new THREE.Points(this.haloGeo, mat));
  }

  // A second ship waiting inside the hangar, nose toward the open doors.
  makeSpareShip(a) {
    this.spare = buildShip(shipDesign(SPARE_SEED));
    this.spare.setLegs(true);
    this.spare.setThrust(0);
    const g = this.spare.group;
    g.position.set(a.shipSpot.x, a.hangar.floor + 0.1 + this.spare.groundOffset, a.shipSpot.z);
    g.rotation.y = a.hangar.yaw + Math.PI;
    this.group.add(g);
  }

  update(t, night) {
    const blink = (t % 1.6) < 0.35 ? 1 : 0.15;
    this.near.material.opacity = blink * (0.6 + 0.4 * night);
    this.far.material.opacity = blink * (0.35 + 0.65 * night);
    this.arm.update(t);
    this.flag.update(t);
  }

  dispose() {
    this.scene.remove(this.group);
    this.near.material.dispose();
    this.far.material.dispose();
    this.haloGeo.dispose();
    this.arm.dispose();
    this.flag.dispose();
    this.spare.dispose();
  }
}
