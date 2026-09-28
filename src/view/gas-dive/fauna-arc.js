// Jagged electric arc between two points, drawn into the fauna glow buffers.
import * as THREE from 'three';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _j = new THREE.Vector3();

export function drawArc(d, from, to, jitter, color, k, steps) {
  _a.copy(from);
  for (let i = 1; i <= steps; i++) {
    _b.lerpVectors(from, to, i / steps);
    if (i < steps) _b.addScaledVector(_j.randomDirection(), Math.random() * jitter);
    d.strand.add(_a, _b, color, k);
    _a.copy(_b);
  }
  d.glow.add(from, jitter * 2.5, color, k * 0.6);
}
