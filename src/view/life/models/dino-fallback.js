// Procedural low-poly dinosaur bodies, shown until the GLB model of that kind has loaded.
import * as THREE from 'three';
import { shiftHex } from '../../../core/color.js';

const SHAPES = {
  rex: { quad: false, body: [3, 1.6, 1.3], leg: 2.8, neck: [1.2, 0.5], head: [1.7, 0.9, 0.8], tail: 4.2, arms: true },
  raptor: { quad: false, body: [3, 1.3, 1.1], leg: 3.2, neck: [1.6, 0.9], head: [1.5, 0.6, 0.6], tail: 4.5, arms: true },
  longneck: { quad: true, body: [4.5, 2.2, 2], leg: 3.4, neck: [7, 1.05], head: [1.1, 0.6, 0.6], tail: 7, arms: false },
  triceratops: { quad: true, body: [3.6, 1.8, 1.8], leg: 1.6, neck: [0.9, 0.2], head: [2, 1.4, 1.6], tail: 2.5, arms: false },
};

function part(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

function addLegs(root, s, mat, legs) {
  const [bl, , bw] = s.body;
  const xs = s.quad ? [bl * 0.6, -bl * 0.6] : [0];
  for (const x of xs) {
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, s.leg, side * bw * 0.55);
      const thick = s.quad ? 0.45 : 0.4;
      pivot.add(part(new THREE.CylinderGeometry(thick, thick * 0.7, s.leg, 8), mat, 0, -s.leg / 2, 0));
      root.add(pivot);
      legs.push({ pivot, phase: (side > 0 ? 0 : Math.PI) + (x < 0 ? Math.PI : 0) });
    }
  }
}

function addNeckHead(root, s, mat, headMat) {
  const [bl, bh] = s.body;
  const [len, angle] = s.neck;
  const neck = new THREE.Group();
  neck.position.set(bl * 0.8, s.leg + bh * 0.4, 0);
  neck.rotation.z = -Math.PI / 2 + angle;
  neck.add(part(new THREE.CylinderGeometry(0.35, 0.6, len, 8), mat, 0, len / 2, 0));
  const head = part(new THREE.BoxGeometry(...s.head), headMat, s.head[0] * 0.3, len + 0.2, 0);
  head.rotation.z = Math.PI / 2 - angle;
  neck.add(head);
  root.add(neck);
  return neck;
}

function addTailArms(root, s, mat) {
  const [bl, bh] = s.body;
  const tail = new THREE.Group();
  tail.position.set(-bl * 0.8, s.leg + bh * 0.3, 0);
  tail.rotation.z = Math.PI / 2 - 0.12;
  tail.add(part(new THREE.ConeGeometry(0.6, s.tail, 8), mat, 0, s.tail / 2, 0));
  root.add(tail);
  if (!s.arms) return tail;
  for (const side of [-1, 1]) {
    const arm = part(new THREE.CylinderGeometry(0.12, 0.08, 0.9, 6), mat, bl * 0.75, s.leg + 0.2, side * 0.5);
    arm.rotation.z = 0.9;
    root.add(arm);
  }
  return tail;
}

// -> { root, animate(t, moving), dispose() } scaled to roughly `height` meters.
export function buildDinoFallback(kind, color, height) {
  const s = SHAPES[kind];
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 });
  const headMat = new THREE.MeshStandardMaterial({ color: shiftHex(color, 0.04, 0, -0.1), flatShading: true });
  const root = new THREE.Group();
  const body = part(new THREE.SphereGeometry(1, 14, 10), mat, 0, s.leg + s.body[1] * 0.4, 0);
  body.scale.set(...s.body);
  root.add(body);
  const legs = [];
  addLegs(root, s, mat, legs);
  const neck = addNeckHead(root, s, mat, headMat);
  const tail = addTailArms(root, s, mat);
  root.scale.setScalar(height / (s.leg + s.body[1] * 1.2 + (s.quad ? s.neck[0] * 0.8 : 0.6)));
  return {
    root,
    animate(t, moving) {
      for (const leg of legs) leg.pivot.rotation.z = Math.sin(t + leg.phase) * 0.5 * moving;
      neck.rotation.x = Math.sin(t * 0.3) * 0.15;
      tail.rotation.y = Math.sin(t * 0.5) * 0.25;
    },
    dispose() {
      root.traverse((o) => o.geometry?.dispose());
      mat.dispose();
      headMat.dispose();
    },
  };
}
