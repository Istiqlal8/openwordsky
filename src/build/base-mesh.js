// Turns a base's piece list into a few merged meshes (one draw call per material), plus the
// beacon's light column and the translucent placement ghost.
import * as THREE from 'three';
import { GeoKit } from '../base/geo-kit.js';
import { pieceOf } from './pieces.js';

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
  };
}

// -> THREE.Group holding the merged meshes of every piece.
export function buildBaseMesh(pieces, mats) {
  const kit = new GeoKit();
  for (const p of pieces) {
    kit.at(p.x, p.y, p.z, p.rot * QUARTER);
    pieceOf(p.type)?.draw(kit);
  }
  const group = new THREE.Group();
  const meshes = kit.build(mats);
  for (const m of Object.values(meshes)) group.add(m);
  const b = pieces[0];
  if (b) group.add(beaconBeam(b, mats.beam));
  return group;
}

// Tall faint light column so the base can be found from far away.
function beaconBeam(b, mat) {
  const geo = new THREE.CylinderGeometry(0.35, 0.35, BEAM_H, 6, 1, true);
  const beam = new THREE.Mesh(geo, mat);
  beam.position.set(b.x, b.y + 3 + BEAM_H / 2, b.z);
  return beam;
}

// One piece merged into a single geometry, drawn with a flat translucent material.
export function buildGhost(type, mat) {
  const kit = new GeoKit();
  kit.at(0, 0, 0, 0);
  pieceOf(type).draw(kit);
  const meshes = kit.build({});
  const geos = Object.values(meshes).map((m) => m.geometry);
  const group = new THREE.Group();
  for (const g of geos) group.add(new THREE.Mesh(g, mat));
  return group;
}

export function disposeGroup(group) {
  group?.parent?.remove(group);
  group?.traverse((o) => o.geometry?.dispose());
}
