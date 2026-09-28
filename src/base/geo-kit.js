// Collects coloured primitives into buckets and merges each bucket into one mesh (one draw call).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEEP = new Set(['position', 'normal', 'uv', 'color']);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

// Give every geometry the same attribute set (indexed, position/normal/uv/color).
function normalize(geo, hex) {
  for (const name of Object.keys(geo.attributes)) if (!KEEP.has(name)) geo.deleteAttribute(name);
  const n = geo.attributes.position.count;
  if (!geo.index) geo.setIndex([...Array(n).keys()]);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!geo.attributes.color) {
    _c.setHex(hex);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([_c.r, _c.g, _c.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  return geo;
}

export class GeoKit {
  constructor() {
    this.buckets = new Map();
    this.frame = new THREE.Matrix4();
  }

  // Frame for the following parts: world position + yaw.
  at(x, y, z, ry = 0) {
    this.frame.makeRotationY(ry).setPosition(x, y, z);
    return this;
  }

  // Add a geometry in frame-local coords. rot = [rx, ry, rz], scale = [sx, sy, sz].
  add(bucket, geo, hex, x = 0, y = 0, z = 0, rot = null, scale = null) {
    _q.setFromEuler(rot ? _e.set(rot[0], rot[1], rot[2]) : _e.set(0, 0, 0));
    _s.set(1, 1, 1);
    if (scale) _s.set(scale[0], scale[1], scale[2]);
    _m.compose(_p.set(x, y, z), _q, _s).premultiply(this.frame);
    return this.addWorld(bucket, geo.applyMatrix4(_m), hex);
  }

  // Add a geometry already in world coords.
  addWorld(bucket, geo, hex) {
    if (!this.buckets.has(bucket)) this.buckets.set(bucket, []);
    this.buckets.get(bucket).push(normalize(geo, hex));
    return geo;
  }

  box(bucket, hex, w, h, d, x, y, z, ry = 0) {
    return this.add(bucket, new THREE.BoxGeometry(w, h, d), hex, x, y, z, ry ? [0, ry, 0] : null);
  }

  // Upright cylinder whose base sits at y.
  cyl(bucket, hex, rTop, rBot, h, seg, x, y, z) {
    return this.add(bucket, new THREE.CylinderGeometry(rTop, rBot, h, seg), hex, x, y + h / 2, z);
  }

  // Cylinder from a to b ([x, y, z] frame-local): struts, rails, pipes.
  beam(bucket, hex, a, b, r, seg = 5) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
    const geo = new THREE.CylinderGeometry(r, r, len, seg);
    _q.setFromUnitVectors(_s.set(0, 1, 0), _p.set(dx / len, dy / len, dz / len));
    geo.applyQuaternion(_q);
    return this.add(bucket, geo, hex, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  }

  // Merge each bucket into one mesh using materials[bucket]; returns { bucket: mesh }.
  build(materials) {
    const meshes = {};
    for (const [bucket, geos] of this.buckets) {
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (!merged) continue;
      merged.computeBoundingSphere();
      meshes[bucket] = new THREE.Mesh(merged, materials[bucket]);
    }
    this.buckets.clear();
    return meshes;
  }
}
