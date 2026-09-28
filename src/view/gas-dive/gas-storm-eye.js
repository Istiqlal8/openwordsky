// The giant vortex (a Great Red Spot for Jupiter): a slowly turning spiral storm on the cloud
// tops far away. Its rim bulges up as a towering cloud wall around a sunken eye, so it reads
// on the horizon; it wraps around the camera so it is always somewhere out there.
import * as THREE from 'three';
import { spiralTexture } from './gas-textures.js';

const SPAN = 60000, RADIUS = 7000, RIM = 1400, EYE_DEPTH = 350;
const HOME = new THREE.Vector2(-2500, -18000); // ahead of the entry point (ship faces -Z)

// Polar grid displaced into a crater: raised rim wall at ~0.6 R, sunken centre.
function vortexGeometry() {
  const geo = new THREE.RingGeometry(1, RADIUS, 96, 28).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getZ(i)) / RADIUS;
    const wall = Math.exp(-(((r - 0.58) / 0.2) ** 2)) * RIM;
    const eye = Math.max(0, 1 - r / 0.25) * EYE_DEPTH;
    pos.setY(i, wall - eye);
  }
  geo.computeVertexNormals();
  return geo;
}

export class GasStormEye {
  constructor(scene, pal) {
    const color = pal.spot.clone().lerp(pal.mean, pal.hasSpot ? 0.15 : 0.5).multiplyScalar(1.15);
    this.mat = new THREE.MeshLambertMaterial({ map: spiralTexture(pal.seed), color, transparent: true,
      depthWrite: false, side: THREE.DoubleSide, emissive: color, emissiveIntensity: 0.12 });
    this.geo = vortexGeometry();
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.renderOrder = 10; // over the top cloud veil
    scene.add(this.mesh);
  }

  update(time, cam) {
    const dx = HOME.x - cam.x, dz = HOME.y - cam.z;
    this.mesh.position.set(cam.x + dx - SPAN * Math.round(dx / SPAN), -40, cam.z + dz - SPAN * Math.round(dz / SPAN));
    this.mesh.rotation.y = -time * 0.01;
    // Seen from above only; it melts into the murk once you are under the tops.
    this.mat.opacity = THREE.MathUtils.clamp(1 + cam.y / 300, 0, 1);
    this.mesh.visible = this.mat.opacity > 0.01;
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose(); // spiral texture is cached
    this.mesh.removeFromParent();
  }
}
