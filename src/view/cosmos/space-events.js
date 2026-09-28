// SpaceEvents: occasional spectacle in a star system — distant supernovae, shooting stars,
// comets, twinkling stars and nearby rock explosions (with a screen-shake hook).
import * as THREE from 'three';
import { Rng } from '../../core/rng.js';
import { rand } from './util.js';
import { TwinkleStars } from './twinkle-stars.js';
import { ShootingStars } from './shooting-stars.js';
import { Supernova } from './supernova.js';
import { Comets } from './comets.js';
import { RockBlast } from './rock-blast.js';

const SUPERNOVA_GAP = [45, 120];
const BLAST_GAP = [60, 150];
const BLAST_CONE = 0.35; // radians off the view axis
const tmpF = new THREE.Vector3();
const tmpR = new THREE.Vector3();

export class SpaceEvents {
  constructor(scene) {
    this.scene = scene;
    this.root = null;
    this.onShake = null;   // (amount 0..2) => void, e.g. spaceView.shake
    this.onFlash = null;   // (level 0..1) => void, optional sky-flash hook
  }

  // Build the per-system layers; call after SpaceView.mount(system, ...).
  mount(system) {
    this.dispose();
    const rng = new Rng((system?.seed ?? 1) ^ 0x5e7e);
    this.root = new THREE.Group();
    this.root.name = 'space-events';
    this.twinkle = new TwinkleStars(system?.seed ?? 1);
    this.meteors = new ShootingStars({ radius: 9000, width: 60, count: 6, gap: [3, 10] });
    this.supernova = new Supernova();
    this.comets = new Comets(system?.seed ?? 1);
    this.blast = new RockBlast();
    this.root.add(this.twinkle.points, this.meteors.mesh, this.supernova.group, this.comets.group, this.blast.group);
    this.scene.add(this.root);
    // Deterministic first timings per system, random after that.
    this.novaTimer = rng.range(12, 40);
    this.blastTimer = rng.range(25, 70);
  }

  update(dt, camera) {
    if (!this.root) return;
    this.twinkle.update(dt, camera);
    this.meteors.update(dt, camera);
    this.comets.update(dt);
    this.updateSupernova(dt, camera);
    this.updateBlast(dt, camera);
  }

  updateSupernova(dt, camera) {
    this.novaTimer -= dt;
    if (this.novaTimer <= 0 && !this.supernova.active) {
      this.supernova.trigger();
      this.novaTimer = rand(...SUPERNOVA_GAP);
    }
    this.supernova.update(dt, camera);
    if (this.supernova.active) this.onFlash?.(this.supernova.flash);
  }

  updateBlast(dt, camera) {
    this.blastTimer -= dt;
    if (this.blastTimer <= 0 && !this.blast.busy) {
      this.blast.start(this.blastSpot(camera));
      this.blastTimer = rand(...BLAST_GAP);
    }
    if (!this.blast.update(dt)) return;
    const d = camera.position.distanceTo(this.blast.center);
    this.onShake?.(THREE.MathUtils.clamp(1.3 - d / 2500, 0.25, 1));
  }

  // A point 800..2500 units ahead, within a cone around the view direction.
  blastSpot(camera) {
    camera.getWorldDirection(tmpF);
    tmpR.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).addScaledVector(tmpF, -tmpR.dot(tmpF));
    tmpF.addScaledVector(tmpR.normalize(), Math.tan(rand(0.05, BLAST_CONE))).normalize();
    return tmpF.multiplyScalar(rand(800, 2500)).add(camera.position);
  }

  // Test / debug helpers: fire an event now.
  triggerSupernova() { this.novaTimer = 0; }
  triggerBlast() { this.blastTimer = 0; }

  dispose() {
    if (!this.root) return;
    this.twinkle.dispose();
    this.meteors.dispose();
    this.supernova.dispose();
    this.comets.dispose();
    this.blast.dispose();
    this.root.removeFromParent();
    this.root = null;
  }
}
