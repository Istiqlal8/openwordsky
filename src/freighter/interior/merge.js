// Bakes the static interior into one mesh per material so a detailed ship stays within the
// draw-call budget. Instanced meshes, multi-material meshes, points and anything flagged
// userData.keep are left as they are.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEEP = new Set(['position', 'normal', 'uv']);
const _m = new THREE.Matrix4();

function mergeable(o) {
  return o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material) && !o.userData.keep;
}

// Geometry in the group's space with only position/normal/uv, always indexed.
function baked(o, inv) {
  const geo = o.geometry.clone().applyMatrix4(_m.multiplyMatrices(inv, o.matrixWorld));
  for (const name of Object.keys(geo.attributes)) if (!KEEP.has(name)) geo.deleteAttribute(name);
  const n = geo.attributes.position.count;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!geo.index) geo.setIndex([...Array(n).keys()]);
  geo.clearGroups();
  return geo;
}

export function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map(), victims = [];
  group.traverse((o) => {
    if (!mergeable(o)) return;
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(baked(o, inv));
    victims.push(o);
  });
  for (const o of victims) { o.geometry.dispose(); o.removeFromParent(); }
  for (const [mat, geos] of buckets) {
    group.add(new THREE.Mesh(mergeGeometries(geos, false), mat));
    for (const g of geos) g.dispose();
  }
}
