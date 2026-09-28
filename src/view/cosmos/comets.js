// Comets on long elliptical orbits through the system: glowing nucleus and coma,
// a straight blue ion tail pointing away from the star and a curved dusty tail.
import * as THREE from 'three';
import { Rng } from '../../core/rng.js';
import { glowTexture } from '../../assets/textures.js';
import { buildBeam } from './beam.js';
import { glowSprite, disposeTree } from './util.js';

const MAX_R = 48000;
const tmpX = new THREE.Vector3();
const tmpY = new THREE.Vector3();
const tmpZ = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpD = new THREE.Vector3();
const tmpM = new THREE.Matrix4();

function orbitOf(rng) {
  const q = rng.range(2500, 9000);
  const e = rng.range(0.78, 0.93);
  const p = q * (1 + e);
  const thetaMax = Math.acos(Math.max(-1, Math.min(1, (p / MAX_R - 1) / e)));
  const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.9, 0.9), rng.range(0, 6.28), rng.range(-0.5, 0.5)));
  return { p, e, h: rng.range(140, 280) * q, theta: rng.range(-1.7, 1.7), thetaMax, tilt };
}

// Orient a beam: local +Y along `axis`, local +X toward `bendTo` (made perpendicular).
function orient(beam, axis, bendTo) {
  tmpY.copy(axis).normalize();
  tmpX.copy(bendTo).addScaledVector(tmpY, -bendTo.dot(tmpY));
  if (tmpX.lengthSq() < 1e-6) tmpX.set(1, 0, 0).addScaledVector(tmpY, -tmpY.x);
  tmpX.normalize();
  tmpZ.crossVectors(tmpX, tmpY);
  beam.quaternion.setFromRotationMatrix(tmpM.makeBasis(tmpX, tmpY, tmpZ));
}

class Comet {
  constructor(rng) {
    this.orbit = orbitOf(rng);
    this.group = new THREE.Group();
    this.pos = this.group.position;
    this.vel = new THREE.Vector3();
    this.nucleus = glowSprite(glowTexture(0xbff4ff));
    this.coma = glowSprite(glowTexture(0x7fd8ff));
    this.nucleus.visible = this.coma.visible = true;
    this.nucleus.scale.setScalar(700);
    this.coma.material.opacity = 0.45;
    this.baseLen = rng.range(6000, 10000);
    this.ion = buildBeam({ color: 0x3f9cff, core: 0xcfe8ff, len: this.baseLen, w0: 50, w1: 420, speed: 0.8, streaks: 5, fade: 1.1 });
    this.dust = buildBeam({ color: 0xffd9a0, core: 0xfff4dc, len: this.baseLen * 0.8, w0: 90, w1: 1500, bend: 0.35, speed: 0.25, streaks: 3, fade: 1.6 });
    this.dust.material.uniforms.uIntensity.value = 0.8;
    this.group.add(this.coma, this.nucleus, this.ion, this.dust);
  }

  place(out, theta) {
    const o = this.orbit;
    const r = o.p / (1 + o.e * Math.cos(theta));
    return out.set(Math.cos(theta) * r, 0, Math.sin(theta) * r).applyQuaternion(o.tilt);
  }

  update(dt, time) {
    const o = this.orbit;
    const r = this.pos.length() || o.p;
    o.theta += (o.h / (r * r)) * dt;
    if (o.theta > o.thetaMax) o.theta = -o.thetaMax; // re-enter far away on the inbound leg
    this.place(this.vel, o.theta + 0.001).sub(this.place(this.pos, o.theta));
    const near = THREE.MathUtils.clamp(9000 / r, 0.45, 1.8);
    this.ion.material.uniforms.uLen.value = this.baseLen * near;
    this.dust.material.uniforms.uLen.value = this.baseLen * 0.8 * near;
    this.coma.scale.setScalar(1800 * Math.sqrt(near));
    const away = tmpV.copy(this.pos).normalize();
    const back = tmpB.copy(this.vel).normalize().negate();
    orient(this.ion, away, back);
    orient(this.dust, tmpD.copy(away).multiplyScalar(0.7).addScaledVector(back, 0.3), back);
    this.ion.material.uniforms.uTime.value = time;
    this.dust.material.uniforms.uTime.value = time;
  }
}

export class Comets {
  constructor(seed) {
    const rng = new Rng(seed ^ 0xc0e7);
    const count = rng.weighted([{ w: 3, n: 0 }, { w: 5, n: 1 }, { w: 2, n: 2 }]).n;
    this.list = Array.from({ length: count }, () => new Comet(rng));
    this.group = new THREE.Group();
    this.group.name = 'comets';
    for (const c of this.list) this.group.add(c.group);
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
    for (const c of this.list) c.update(dt, this.time);
  }

  dispose() {
    disposeTree(this.group);
  }
}
