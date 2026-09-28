// The hangar bay of the capital ship: a block with a lit cavity opening on +X, a force field
// over the mouth and a docking guide (floor chevrons + gates). Every hull archetype places one
// block with `buildBay`; its mouth must face open space on +X.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glow } from './kit.js';

// Default cavity: span along z, depth into the block (x) and half height (y), space units.
export const BAY = { len: 56, depth: 26, half: 9 };
const CHEVRONS = 7;

// spec: { x: mouth plane, y, z: centre, W: block width (> depth), H: block height (> 2 * half) }.
function frame(spec) {
  const s = { ...BAY, ...spec };
  s.z0 = s.z - s.len / 2;
  s.z1 = s.z + s.len / 2;
  return s;
}

// Roof, floor and back of the block around the cavity.
function slabs(p, s) {
  const cap = s.H / 2 - s.half, back = s.W - s.depth, xc = s.x - s.W / 2;
  p.box('hull', s.W, cap, s.len, xc, s.y + s.half + cap / 2, s.z);
  p.box('hull', s.W, cap, s.len, xc, s.y - s.half - cap / 2, s.z);
  p.box('plate', back, s.half * 2, s.len, s.x - s.W + back / 2, s.y, s.z);
  p.solidBox(xc, s.y, s.z, s.W, s.H, s.len);
  p.hole([s.x - s.depth, s.y - s.half + 1, s.z0 + 1], [s.x + 12, s.y + s.half - 1, s.z1 - 1]);
}

// Lit interior: back wall panels, ceiling bars, floor landing strips and a lamp.
function cavity(p, s) {
  const back = s.x - s.depth, mid = s.x - s.depth / 2;
  for (let z = s.z0 + 6; z < s.z1 - 3; z += 8) {
    p.box('bay', 0.4, 6, 4, back + 0.3, s.y + 1, z);
    p.box('window', s.depth - 4, 0.5, 1, mid, s.y + s.half - 0.4, z);
  }
  for (const dz of [-9, 9]) p.box('warn', s.depth, 0.2, 0.8, mid, s.y - s.half + 0.2, s.z + dz);
  p.box('dark', s.depth - 2, 0.3, 10, mid, s.y - s.half + 0.2, s.z);
  const light = p.object(new THREE.PointLight(0xcfeeff, 6, 90, 0.6));
  light.position.set(s.x - s.depth * 0.6, s.y + 2, s.z);
}

// Glowing frame and a faint force field across the opening.
function mouth(p, s) {
  const x = s.x + 0.4;
  for (const dy of [-s.half, s.half]) p.box('bay', 0.8, 0.8, s.len + 0.8, x, s.y + dy, s.z);
  for (const z of [s.z0, s.z1]) p.box('bay', 0.8, s.half * 2, 0.8, x, s.y, z);
  const mat = new THREE.MeshBasicMaterial({ color: 0x5cc8ff, transparent: true, opacity: 0.1,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const field = p.object(new THREE.Mesh(new THREE.PlaneGeometry(s.len, s.half * 2), mat));
  field.rotation.y = Math.PI / 2;
  field.position.set(x, s.y, s.z);
  return mat;
}

// Arrow ">" lying flat, pointing -X (into the bay): one mesh with its own blinking material.
function chevron(p, x, y, z) {
  const mat = glow(0x7fe6ff, 0.4);
  const bars = [-1, 1].map((sd) => new THREE.BoxGeometry(7, 0.4, 1.2).rotateY(sd * 0.6).translate(0, 0, sd * 2.2));
  const m = p.object(new THREE.Mesh(mergeGeometries(bars, false), mat));
  for (const b of bars) b.dispose();
  m.position.set(x, y, z);
  return mat;
}

// Floor chevrons outside the mouth (blinking in sequence) and hollow gates in the approach lane.
function guide(p, s) {
  const mats = [];
  for (let i = 0; i < CHEVRONS; i++) mats.push(chevron(p, s.x + 8 + i * 11, s.y - s.half, s.z));
  for (const [d, k] of [[26, 1], [52, 0.85], [80, 0.7]]) {
    const hz = s.len / 2 * k, hy = s.half * k, x = s.x + d;
    for (const dy of [-hy, hy]) p.box('gate', 0.5, 0.5, hz * 2, x, s.y + dy, s.z);
    for (const dz of [-hz, hz]) p.box('gate', 0.5, hy * 2, 0.5, x, s.y, s.z + dz);
  }
  return mats;
}

// Builds the bay into Parts `p`; returns local anchors and animated materials.
export function buildBay(p, spec) {
  const s = frame(spec);
  slabs(p, s);
  cavity(p, s);
  const field = mouth(p, s);
  const chevrons = guide(p, s);
  return {
    field, chevrons, spec: s,
    dock: new THREE.Vector3(s.x - 5, s.y, s.z),       // just inside the force field
    radius: 12,
    launch: new THREE.Vector3(s.x + 34, s.y, s.z),    // exit point for the player's ship
    normal: new THREE.Vector3(1, 0, 0),
  };
}
