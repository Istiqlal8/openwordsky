// Engines: housings, nozzles, glow discs, additive flames and glow sprites. Optional nacelles.
import * as THREE from 'three';
import { part } from './ship-materials.js';

// One engine at mount {x, y, r}; `len` is the housing length ending at rearZ.
function engine(m, len, rearZ, mats, housing) {
  const g = new THREE.Group();
  const { x, y, r } = m;
  if (housing) g.add(part(new THREE.CylinderGeometry(r, r * 0.85, len, 12).rotateX(Math.PI / 2), mats.hull, x, y, rearZ - len / 2));
  g.add(part(new THREE.CylinderGeometry(r * 1.08, r * 0.92, 0.3, 12, 1, true).rotateX(Math.PI / 2), mats.dark, x, y, rearZ + 0.1));
  g.add(part(new THREE.CircleGeometry(r * 0.8, 16), mats.glow, x, y, rearZ + 0.05));
  const flameGeo = new THREE.ConeGeometry(r * 0.72, 1, 12, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
  const flame = part(flameGeo, mats.flame, x, y, rearZ + 0.08);
  const sprite = new THREE.Sprite(mats.sprite);
  sprite.position.set(x, y, rearZ + 0.25);
  flame.userData = { sprite, r };
  g.add(flame, sprite);
  return { group: g, flame };
}

function nacelle(p, mats, side) {
  const n = p.nacelles, g = new THREE.Group();
  const x = side * n.x, zc = p.length / 2 + 0.3 - n.length / 2;
  g.add(part(new THREE.CylinderGeometry(n.r, n.r * 0.9, n.length, 12).rotateX(Math.PI / 2), mats.hull, x, 0, zc));
  g.add(part(new THREE.ConeGeometry(n.r, n.r * 2.2, 12).rotateX(-Math.PI / 2), mats.trim, x, 0, zc - n.length / 2 - n.r * 1.1));
  const pylon = part(new THREE.BoxGeometry(n.x - p.width * 0.3, 0.12, n.length * 0.5), mats.dark, side * (n.x + p.width * 0.3) / 2, 0, zc);
  g.add(pylon);
  return g;
}

export function buildEngines(p, mats) {
  const group = new THREE.Group(), flames = [];
  const rearZ = p.length / 2 + 0.3;
  for (const m of p.engines) {
    const e = engine(m, p.engineLen, rearZ, mats, true);
    group.add(e.group);
    flames.push(e.flame);
  }
  if (p.nacelles) {
    for (const side of [-1, 1]) {
      group.add(nacelle(p, mats, side));
      const e = engine({ x: side * p.nacelles.x, y: 0, r: p.nacelles.r * 0.88 }, 0, rearZ, mats, false);
      group.add(e.group);
      flames.push(e.flame);
    }
  }
  return { group, flames };
}

// Thrust 0..1: flame length/opacity and glow size.
export function setFlames(flames, t, mats) {
  for (const f of flames) {
    const r = f.userData.r;
    f.scale.set(0.8 + t * 0.3, 0.8 + t * 0.3, r * (0.6 + t * 6));
    f.userData.sprite.scale.setScalar(r * (2.2 + t * 4.5));
  }
  mats.flame.opacity = 0.25 + t * 0.5;
}

// Landing legs: struts with pads. Returns the group and how far the pads sit below origin.
export function buildLegs(p, mats) {
  const g = new THREE.Group();
  const legLen = 0.9, footY = -p.height / 2 - legLen, topY = -p.height * 0.25;
  const W = p.width, L = p.length;
  const spots = p.legs === 4
    ? [[-W * 0.36, -L * 0.2], [W * 0.36, -L * 0.2], [-W * 0.36, L * 0.28], [W * 0.36, L * 0.28]]
    : [[0, -L * 0.28], [-W * 0.42, L * 0.22], [W * 0.42, L * 0.22]];
  for (const [x, z] of spots) {
    const h = topY - footY;
    g.add(part(new THREE.CylinderGeometry(0.07, 0.09, h, 6), mats.dark, x, footY + h / 2, z));
    g.add(part(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 8), mats.trim, x, topY - 0.1, z));
    g.add(part(new THREE.CylinderGeometry(0.28, 0.36, 0.1, 10), mats.dark, x, footY + 0.05, z));
  }
  return { group: g, groundOffset: -footY };
}
