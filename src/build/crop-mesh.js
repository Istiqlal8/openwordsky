// A planter crop at growth stage 1..3: a tuft of leaves in the planet's flora colours, with
// glowing fruit once ripe. Materials ride along in userData.mats so the caller disposes them.
import * as THREE from 'three';

const SIZE = [0, 0.35, 0.7, 1];

export function cropMesh(stage, ripe, palette) {
  if (!stage) return null;
  const leaf = new THREE.MeshStandardMaterial({ color: palette.flora, roughness: 0.8, flatShading: true });
  const fruit = new THREE.MeshBasicMaterial({ color: palette.floraAlt });
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2, r = i ? 0.45 : 0;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.4, 5), leaf);
    blade.position.set(Math.cos(a) * r, 0.7, Math.sin(a) * r);
    blade.rotation.set(Math.sin(a) * 0.3 * (i ? 1 : 0), 0, Math.cos(a) * 0.3 * (i ? 1 : 0));
    g.add(blade);
    if (!ripe || !i) continue;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), fruit);
    ball.position.set(Math.cos(a) * 0.35, 1.1, Math.sin(a) * 0.35);
    g.add(ball);
  }
  g.scale.setScalar(SIZE[stage]);
  g.userData.mats = [leaf, fruit];
  return g;
}
