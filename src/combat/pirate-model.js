// Pirate ship meshes from primitives: black hulls, red trim, red engine glow. Nose points +Z.
import * as THREE from 'three';
import { glowTexture } from '../assets/textures.js';

let parts = null;

// Shared geometry/materials, built once and kept for the session (like cached textures).
function getParts() {
  if (parts) return parts;
  const nose = new THREE.ConeGeometry(0.8, 4.4, 5);
  nose.rotateX(Math.PI / 2);
  parts = {
    nose,
    wing: new THREE.BoxGeometry(5.2, 0.14, 1.5),
    fin: new THREE.BoxGeometry(0.12, 1.1, 1.2),
    engine: new THREE.CylinderGeometry(0.45, 0.55, 0.8, 8).rotateX(Math.PI / 2),
    core: new THREE.OctahedronGeometry(1.2, 0),
    ring: new THREE.TorusGeometry(1.7, 0.14, 6, 18),
    spike: new THREE.ConeGeometry(0.22, 1.6, 4),
    hull: new THREE.MeshStandardMaterial({ color: 0x1b1b21, metalness: 0.6, roughness: 0.45, flatShading: true, emissive: 0x16161c }),
    trim: new THREE.MeshStandardMaterial({ color: 0xb01414, metalness: 0.3, roughness: 0.5, flatShading: true, emissive: 0x6a0404 }),
    glow: new THREE.MeshBasicMaterial({ color: 0xff3020, toneMapped: false }),
  };
  return parts;
}

function engineGlow(z, scale) {
  const mat = new THREE.SpriteMaterial({ map: glowTexture(0xff3322), color: 0xff4433, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.position.set(0, 0, z);
  s.scale.setScalar(scale);
  return s;
}

function fighter(p) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(p.nose, p.hull);
  const wing = new THREE.Mesh(p.wing, p.trim);
  wing.position.set(0, 0, -0.9);
  const finL = new THREE.Mesh(p.fin, p.hull);
  finL.position.set(-2.4, 0.5, -1.2);
  const finR = finL.clone();
  finR.position.x = 2.4;
  const engine = new THREE.Mesh(p.engine, p.glow);
  engine.position.z = -2.3;
  g.add(body, wing, finL, finR, engine, engineGlow(-2.8, 3.2));
  return g;
}

function drone(p) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(p.core, p.hull);
  core.scale.set(1, 0.8, 1.3);
  const ring = new THREE.Mesh(p.ring, p.trim);
  const eye = new THREE.Mesh(p.engine, p.glow);
  eye.position.z = 1.3;
  eye.scale.setScalar(0.6);
  for (const x of [-1, 1]) {
    const spike = new THREE.Mesh(p.spike, p.hull);
    spike.rotation.z = (-x * Math.PI) / 2;
    spike.position.x = x * 2.2;
    g.add(spike);
  }
  g.add(core, ring, eye, engineGlow(-1.6, 2.6));
  return g;
}

export const PIRATE_KINDS = {
  fighter: { name: 'Pesawat Bajak Laut', hp: 60, speed: 48, radius: 4, fireGap: 0.55, build: fighter },
  drone: { name: 'Drone Bajak Laut', hp: 32, speed: 58, radius: 3.2, fireGap: 0.4, build: drone },
};

const MODEL_SCALE = 1.6;

export function buildPirate(kind) {
  const outer = new THREE.Group();
  const model = PIRATE_KINDS[kind].build(getParts());
  model.scale.setScalar(MODEL_SCALE);
  outer.add(model);
  return outer;
}

// Only the per-ship sprite materials are owned by an instance.
export function disposePirate(group) {
  group.traverse((o) => { if (o.isSprite) o.material.dispose(); });
  group.removeFromParent();
}
