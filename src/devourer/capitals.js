// Allied capital ships ("kapal induk") at the battle: ~340-unit silhouettes built here rather
// than reusing src/freighter/ models, so this file stays independent of that module. They hold
// a firing line, launch fighter waves from their bays, burn and list as they take hits, and
// die in a slow chain of explosions.
import * as THREE from 'three';
import { Rng } from '../core/rng.js';
import { glowTexture } from '../assets/textures.js';

export const CAP_LEN = 340;
const LINE_R = 3900;           // distance they hold from the devourer
const BEAM_GAP = [3.2, 6.5];
const DEATH_TIME = 4.2;
const NAMES = ['Kapal Induk', 'Bentang Vy’keen', 'Wahana Korvax', 'Perisai Gek', 'Tombak Fajar',
  'Nusantara Agung', 'Penjaga Cakrawala', 'Layar Bintang'];

const tmpA = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);
const tmpB = new THREE.Vector3();

function sprite(hex, scale) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(hex), color: hex, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(scale);
  return s;
}

// Shared geometry for every capital: one hull, one fin, one bay plate, one beam tube.
function makeGeometry() {
  const hull = new THREE.BoxGeometry(46, 38, CAP_LEN);
  const prow = new THREE.ConeGeometry(30, 120, 4);
  prow.rotateX(-Math.PI / 2);
  prow.translate(0, 0, -CAP_LEN * 0.5 - 50);
  const fin = new THREE.BoxGeometry(150, 10, 120);
  const bay = new THREE.PlaneGeometry(40, 70);
  const beam = new THREE.CylinderGeometry(9, 9, 1, 8, 1, true);
  beam.rotateX(Math.PI / 2);
  beam.translate(0, 0, 0.5);
  return { hull, prow, fin, bay, beam };
}

export class Capitals {
  constructor(parent, seed, center, count = 5) {
    this.rng = new Rng(seed ^ 0xca91);
    this.geo = makeGeometry();
    this.root = new THREE.Group();
    parent.add(this.root);
    this.ships = [];
    this.launchPoints = [];
    this.center = center;
    this.onDeath = null;       // (name) => void, for the toast
    for (let i = 0; i < count; i++) this.spawn(i, count);
  }

  spawn(i, total) {
    const rng = this.rng;
    const hex = [0x9fe4ff, 0xffd08a, 0xa8ff9c, 0xffa0d0, 0xc0b0ff][i % 5];
    const mat = new THREE.MeshStandardMaterial({ color: 0x7d8794, roughness: 0.7, metalness: 0.4,
      flatShading: true, emissive: new THREE.Color(0x56637a), emissiveIntensity: 1.35 });
    const group = new THREE.Group();
    group.add(new THREE.Mesh(this.geo.hull, mat), new THREE.Mesh(this.geo.prow, mat));
    for (const z of [-40, 90]) {
      const f = new THREE.Mesh(this.geo.fin, mat);
      f.position.z = z;
      group.add(f);
    }
    const bay = new THREE.Mesh(this.geo.bay, new THREE.MeshBasicMaterial({ color: hex, transparent: true,
      opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    bay.position.set(0, -20, 40);
    bay.rotation.x = Math.PI / 2;
    group.add(bay, this.engine(hex));
    const beam = this.makeBeam(hex);
    group.add(beam);
    const a = (i / total) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const pos = new THREE.Vector3(Math.cos(a), rng.range(-0.22, 0.28), Math.sin(a))
      .multiplyScalar(LINE_R * rng.range(0.85, 1.2)).add(this.center);
    group.position.copy(pos);
    this.root.add(group);
    const ship = { name: NAMES[i % NAMES.length], group, mat, bay, beam, hp: 1, hex,
      fire: rng.range(BEAM_GAP[0], BEAM_GAP[1]), beamT: 0, roll: 0, dying: 0, dead: false,
      launch: new THREE.Vector3(), bob: rng.range(0, 6) };
    this.ships.push(ship);
    this.launchPoints.push(ship.launch);
  }

  // Engine flares at the stern plus running lights down the spine, so the hull reads far away.
  engine(hex) {
    const g = new THREE.Group();
    for (const x of [-26, 26]) {
      const s = sprite(hex, 62);
      s.position.set(x, 0, CAP_LEN * 0.52);
      g.add(s);
    }
    for (const z of [-120, -20, 80, 150]) {
      const s = sprite(0xfff0d0, 20);
      s.position.set(0, 22, z);
      g.add(s);
    }
    return g;
  }

  makeBeam(hex) {
    const mesh = new THREE.Mesh(this.geo.beam, new THREE.MeshBasicMaterial({ color: hex, transparent: true,
      opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    mesh.position.z = -CAP_LEN * 0.55;
    mesh.frustumCulled = false;
    return mesh;
  }

  get alive() { return this.ships.filter((s) => !s.dead).length; }

  // hazard 0..1: how hard the devourer is hitting the line this phase.
  update(dt, time, target, hazard, bursts) {
    for (const s of this.ships) {
      if (s.dead) continue;
      if (s.dying > 0) { this.die(s, dt, bursts); continue; }
      this.hold(s, dt, time, target);
      this.shoot(s, dt, target, bursts);
      this.burn(s, dt, hazard, bursts);
    }
  }

  // Nose (-Z) on the devourer: Matrix4.lookAt is the camera convention, which matches the hull.
  hold(s, dt, time, target) {
    s.group.position.y += Math.sin(time * 0.2 + s.bob) * dt * 3;
    tmpM.lookAt(s.group.position, target, UP);
    s.group.quaternion.setFromRotationMatrix(tmpM);
    s.group.rotateZ(s.roll);
    s.group.updateMatrixWorld();
    s.launch.copy(s.bay.position).applyMatrix4(s.group.matrixWorld);
  }

  shoot(s, dt, target, bursts) {
    s.fire -= dt;
    if (s.fire <= 0) {
      s.fire = this.rng.range(BEAM_GAP[0], BEAM_GAP[1]) * (2 - s.hp);
      s.beamT = 0.55;
      bursts?.flare(s.launch, s.hex, 70, 0.3);
    }
    if (s.beamT <= 0) { s.beam.material.opacity = 0; return; }
    s.beamT -= dt;
    const len = s.group.position.distanceTo(target) - CAP_LEN;
    s.beam.scale.set(1, 1, Math.max(1, len));
    s.beam.material.opacity = Math.min(1, s.beamT / 0.25) * 0.85;
  }

  // Hull fires, venting and a growing list as the hp drops; the devourer chews the line down.
  burn(s, dt, hazard, bursts) {
    s.hp -= hazard * dt * this.rng.range(0.006, 0.02);
    if (s.hp <= 0) { this.kill(s); return; }
    s.mat.emissive.setHex(s.hp < 0.55 ? 0x6a2205 : 0x56637a);
    s.roll = (1 - s.hp) * 0.5;
    if (s.hp > 0.6 || Math.random() > dt * 6) return;
    s.group.updateMatrixWorld();
    tmpA.set(this.rng.range(-30, 30), this.rng.range(-20, 20), this.rng.range(-150, 150)).applyMatrix4(s.group.matrixWorld);
    bursts?.flare(tmpA, 0xff7a30, 40, 0.8);
  }

  kill(s) {
    s.dying = DEATH_TIME;
    s.chain = 0;
    this.onDeath?.(s.name);
  }

  // Slow chain: six blasts walking down the hull, then one huge one and the wreck goes dark.
  die(s, dt, bursts) {
    s.dying -= dt;
    s.roll += dt * 0.35;
    s.group.rotateZ(dt * 0.35);
    const step = Math.floor((DEATH_TIME - s.dying) / (DEATH_TIME / 6));
    if (step > s.chain) {
      s.chain = step;
      s.group.updateMatrixWorld();
      tmpB.set(this.rng.range(-25, 25), 0, CAP_LEN * (0.5 - step / 6)).applyMatrix4(s.group.matrixWorld);
      bursts?.blast(tmpB, 0xffa050, 70);
    }
    s.bay.material.opacity = Math.max(0, s.dying / DEATH_TIME) * 0.8;
    if (s.dying > 0) return;
    s.dead = true;
    bursts?.blast(s.group.position, 0xfff0c0, 190);
    s.group.visible = false;
  }

  dispose() {
    for (const s of this.ships) {
      s.mat.dispose();
      s.bay.material.dispose();
      s.beam.material.dispose();
      s.group.traverse((o) => { if (o.isSprite) o.material.dispose(); });
    }
    for (const g of Object.values(this.geo)) g.dispose();
    this.root.removeFromParent();
  }
}
