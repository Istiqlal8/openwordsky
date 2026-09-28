// The giant vortex (a Great Red Spot for Jupiter): a slowly turning spiral disc lying on the
// cloud tops far away, wrapped around the camera so it is always somewhere on the horizon.
import * as THREE from 'three';
import { spiralTexture } from './gas-textures.js';

const SPAN = 60000, RADIUS = 6500, Y = 15;
const HOME = new THREE.Vector2(-3000, -17000); // ahead of the entry point (ship faces -Z)

export class GasStormEye {
  constructor(scene, pal) {
    const color = pal.spot.clone().lerp(pal.mean, pal.hasSpot ? 0.15 : 0.5).multiplyScalar(1.1);
    this.mat = new THREE.MeshBasicMaterial({ map: spiralTexture(pal.seed), color, transparent: true,
      depthWrite: false, side: THREE.DoubleSide });
    this.geo = new THREE.CircleGeometry(RADIUS, 64).rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.renderOrder = 10; // over the top cloud veil
    scene.add(this.mesh);
  }

  update(time, cam) {
    const dx = HOME.x - cam.x, dz = HOME.y - cam.z;
    this.mesh.position.set(cam.x + dx - SPAN * Math.round(dx / SPAN), Y, cam.z + dz - SPAN * Math.round(dz / SPAN));
    this.mesh.rotation.y = -time * 0.01;
    // Seen from above only; it melts into the murk once you are under the tops.
    this.mat.opacity = THREE.MathUtils.clamp(1 + cam.y / 250, 0, 1) * 0.95;
    this.mesh.visible = this.mat.opacity > 0.01;
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose(); // spiral texture is cached
    this.mesh.removeFromParent();
  }
}
