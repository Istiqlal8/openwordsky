// Geometry helpers shared by planet shapes: vertex coloring + relief, seam-free normals.
import * as THREE from 'three';

const p = new THREE.Vector3();
const n = new THREE.Vector3();
const s = new THREE.Vector3();
const c = new THREE.Color();

// Colors every vertex with colorer(sample, out) and raises land by `bump`.
// Radial mode samples the unit direction and scales the vertex; normal mode
// samples position * noiseScale and pushes along the normal by bump * radius.
export function paintGeometry(geo, colorer, { bump = 0, alongNormal = false, noiseScale = 1, radius = 1 } = {}) {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const sample = alongNormal ? s.copy(p).multiplyScalar(noiseScale) : s.copy(p).normalize();
    const rel = Math.max(0, colorer(sample, c));
    c.toArray(colors, i * 3);
    if (alongNormal) p.addScaledVector(n.fromBufferAttribute(nrm, i), rel * bump * radius);
    else p.multiplyScalar(1 + rel * bump);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  smoothSeams(geo);
  geo.computeBoundingSphere();
  return geo;
}

// Average normals of vertices that share a position (UV seams, poles, box edges).
export function smoothSeams(geo) {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const groups = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${Math.round(pos.getX(i) * 1000)},${Math.round(pos.getY(i) * 1000)},${Math.round(pos.getZ(i) * 1000)}`;
    const list = groups.get(key);
    if (list) list.push(i);
    else groups.set(key, [i]);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    n.set(0, 0, 0);
    for (const i of list) n.add(s.fromBufferAttribute(nrm, i));
    n.normalize();
    for (const i of list) nrm.setXYZ(i, n.x, n.y, n.z);
  }
}

// Equirectangular UVs from direction, on a non-indexed copy so triangles that
// straddle the u = 0/1 wrap can be fixed up individually. For cloud shells.
export function sphericalUV(geo) {
  const out = geo.index ? geo.toNonIndexed() : geo.clone();
  const pos = out.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).normalize();
    uv[i * 2] = 0.5 + Math.atan2(p.z, -p.x) / (Math.PI * 2);
    uv[i * 2 + 1] = 0.5 + Math.asin(Math.max(-1, Math.min(1, p.y))) / Math.PI;
  }
  for (let t = 0; t < pos.count; t += 3) {
    const us = [uv[t * 2], uv[t * 2 + 2], uv[t * 2 + 4]];
    if (Math.max(...us) - Math.min(...us) < 0.5) continue;
    for (let k = 0; k < 3; k++) if (us[k] < 0.5) uv[(t + k) * 2] += 1;
  }
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.deleteAttribute('color');
  return out;
}

// Longitude/latitude segment counts that stay smooth up close on big bodies.
export function sphereSegments(radius) {
  const w = Math.max(64, Math.min(144, Math.round(56 + radius * 0.45)));
  return [w, Math.round(w * 0.66)];
}
