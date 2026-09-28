// Turns a base's piece list into a few merged meshes (one draw call per material), plus the
// beacon's light column, the translucent placement ghost and the snap marker.
import * as THREE from 'three';
import { GeoKit } from '../base/geo-kit.js';
import { pieceOf, GRID } from './pieces.js';
import { colorsOf } from './palette.js';

const QUARTER = Math.PI / 2;
const BEAM_H = 90;

export function makeMaterials() {
  return {
    solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.15, flatShading: true }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    glass: new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }),
    beam: new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
    ghostOk: new THREE.MeshBasicMaterial({ color: 0x7dffb2, transparent: true, opacity: 0.4, depthWrite: false }),
    ghostBad: new THREE.MeshBasicMaterial({ color: 0xff5a5a, transparent: true, opacity: 0.4, depthWrite: false }),
    mark: new THREE.MeshBasicMaterial({ color: 0x7dffb2, transparent: true, opacity: 0.5, depthWrite: false }),
  };
}

// -> THREE.Group holding the merged meshes of every piece.
export function buildBaseMesh(pieces, mats) {
  const kit = new GeoKit();
  for (const p of pieces) {
    kit.at(p.x, p.y, p.z, p.rot * QUARTER);
    pieceOf(p.type)?.draw(kit, colorsOf(p.data?.tint ?? 0));
  }
  const group = new THREE.Group();
  for (const m of Object.values(kit.build(mats))) group.add(m);
  const b = pieces[0];
  if (b) group.add(beaconBeam(b, mats.beam));
  return group;
}

// Tall faint light column so the base can be found from far away.
function beaconBeam(b, mat) {
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, BEAM_H, 6, 1, true), mat);
  beam.position.set(b.x, b.y + 3 + BEAM_H / 2, b.z);
  return beam;
}

// One piece merged into a single geometry, drawn with a flat translucent material.
export function buildGhost(type, tint, mat) {
  const kit = new GeoKit();
  kit.at(0, 0, 0, 0);
  pieceOf(type).draw(kit, colorsOf(tint));
  const group = new THREE.Group();
  for (const m of Object.values(kit.build({}))) group.add(new THREE.Mesh(m.geometry, mat));
  return group;
}

// Flat square that lights up the piece the ghost is snapping to.
export function buildSnapMark(mat) {
  const geo = new THREE.RingGeometry(GRID * 0.5, GRID * 0.58, 4, 1, Math.PI / 4);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  return mesh;
}

export function disposeGroup(group) {
  group?.parent?.remove(group);
  group?.traverse((o) => o.geometry?.dispose());
}
