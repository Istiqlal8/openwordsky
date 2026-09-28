// Small fish geometry (forward +X, length 1, tail at -X) in three looks: plain (tinted per
// instance), clownfish stripes, and dark lanternfish with glowing photophores.
import * as THREE from 'three';
import { mergeParts } from './ocean-kit.js';

function fishParts(body, fin, eye) {
  return [
    { geo: new THREE.SphereGeometry(0.5, 12, 8).scale(0.9, 0.42, 0.2).translate(0.05, 0, 0), color: body },
    { geo: new THREE.ConeGeometry(0.2, 0.34, 4).rotateZ(-Math.PI / 2).scale(1, 1, 0.12).translate(-0.52, 0, 0), color: fin },
    { geo: new THREE.ConeGeometry(0.1, 0.3, 3).scale(1.6, 1, 0.1).translate(0, 0.24, 0), color: fin },
    { geo: new THREE.SphereGeometry(0.045, 6, 4).translate(0.33, 0.05, 0.08), color: eye },
    { geo: new THREE.SphereGeometry(0.045, 6, 4).translate(0.33, 0.05, -0.08), color: eye },
  ];
}

export function plainFish() {
  return mergeParts(fishParts(0xffffff, 0xd8d8d8, 0x101010));
}

// Clownfish: body color with two white bands (instance color stays near white).
export function stripedFish(color) {
  const geo = mergeParts(fishParts(color, color, 0x101010));
  const p = geo.attributes.position, c = geo.attributes.color;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    if (Math.abs(x - 0.18) < 0.06 || Math.abs(x + 0.18) < 0.05) c.setXYZ(i, 1, 1, 1);
  }
  return geo;
}

// Lanternfish: near-black body with a row of bright dots (drawn unlit, so dots glow).
export function lanternFish(glow) {
  const parts = fishParts(0x0b1420, 0x08101a, 0xffffff);
  for (let i = 0; i < 5; i++) {
    parts.push({ geo: new THREE.SphereGeometry(0.035, 5, 3).translate(0.3 - i * 0.15, -0.12, 0.085), color: glow });
    parts.push({ geo: new THREE.SphereGeometry(0.035, 5, 3).translate(0.3 - i * 0.15, -0.12, -0.085), color: glow });
  }
  return mergeParts(parts);
}
