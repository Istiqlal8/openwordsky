// Seen-from-afar cues per settlement: a steady glow sprite (constant screen size), lamp halos and chimney smoke.
import * as THREE from 'three';
import { glowTexture } from '../assets/textures.js';

const PUFFS = 14; // smoke particles per chimney

export class Beacons {
  // at: beacon point; hex: glow colour; lampHeads: flat [x, y, z, ...]; chimneys: [{x, y, z}] (world).
  constructor(scene, mats, at, hex, lampHeads, chimneys) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.spriteMat = new THREE.SpriteMaterial({ map: glowTexture(hex), color: hex, fog: false, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: false });
    this.far = new THREE.Sprite(this.spriteMat);
    this.far.scale.setScalar(0.03);
    this.far.position.set(at.x, at.y, at.z);
    this.group.add(this.far);
    this.geos = [];
    if (lampHeads.length) this.group.add(new THREE.Points(this.geo(new Float32Array(lampHeads)), mats.halo));
    this.makeSmoke(chimneys.slice(0, 4));
  }

  geo(arr) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.geos.push(g);
    return g;
  }

  makeSmoke(chimneys) {
    this.chimneys = chimneys;
    if (!chimneys.length) return;
    this.smokePos = new Float32Array(chimneys.length * PUFFS * 3);
    const g = this.geo(this.smokePos);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(chimneys[0].x, chimneys[0].y, chimneys[0].z), 80);
    this.smokeMat = new THREE.PointsMaterial({ map: glowTexture(0x9a9a9a), size: 3.6, color: 0xc8c8c8,
      transparent: true, opacity: 0.35, depthWrite: false });
    this.smoke = new THREE.Points(g, this.smokeMat);
    this.smoke.frustumCulled = false;
    this.group.add(this.smoke);
  }

  // dist: player distance to the settlement; night 0..1.
  update(t, dist, night) {
    this.spriteMat.opacity = Math.min(1, dist / 300) * (0.25 + 0.75 * night);
    this.far.visible = dist > 120;
    if (!this.smoke) return;
    this.smoke.visible = dist < 1500;
    if (this.smoke.visible) this.drift(t);
  }

  // Puffs rise ~9 m, drift downwind and loop.
  drift(t) {
    const p = this.smokePos;
    this.chimneys.forEach((c, ci) => {
      for (let i = 0; i < PUFFS; i++) {
        const k = ((t * 0.18 + i / PUFFS + ci * 0.37) % 1), j = (ci * PUFFS + i) * 3;
        p[j] = c.x + k * k * 4 + Math.sin(t + i) * 0.3;
        p[j + 1] = c.y + k * 9;
        p[j + 2] = c.z + k * 1.5;
      }
    });
    this.smoke.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.group.removeFromParent();
    this.spriteMat.dispose();
    this.smokeMat?.dispose();
    for (const g of this.geos) g.dispose();
  }
}
