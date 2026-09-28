// Collects capital-ship parts: static geometry merged per material (one draw call each),
// repeated details as InstancedMeshes, plus collision shapes, engine cores and nav lights.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEEP = new Set(['position', 'normal', 'uv']);
const UNIT = { box: () => new THREE.BoxGeometry(1, 1, 1), ball: () => new THREE.IcosahedronGeometry(0.5, 1) };
const AXIS = { y: [0, 0, 0], z: [Math.PI / 2, 0, 0], x: [0, 0, -Math.PI / 2] };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

export class Parts {
  constructor() {
    this.buckets = new Map();
    this.inst = new Map();
    this.objects = [];
    this.solids = [];     // collision shapes in local space (see freighter-collide.js)
    this.holes = [];      // boxes where collision is off (the hangar cavity)
    this.cores = [];      // engine exhausts: { p: Vector3, r }
    this.lights = [];     // nav lights: { p: Vector3, hex, mode: 'port' | 'star' | 'strobe' | 'pulse' }
  }

  // Add a geometry transformed by position, euler rotation [rx, ry, rz] and scale [sx, sy, sz].
  add(key, geo, x = 0, y = 0, z = 0, rot = null, scale = null) {
    _e.set(...(rot ?? [0, 0, 0]));
    _s.set(...(scale ?? [1, 1, 1]));
    geo.applyMatrix4(_m.compose(_p.set(x, y, z), _q.setFromEuler(_e), _s));
    for (const n of Object.keys(geo.attributes)) if (!KEEP.has(n)) geo.deleteAttribute(n);
    const flat = geo.index ? geo.toNonIndexed() : geo;
    if (flat !== geo) geo.dispose();
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key).push(flat);
    return flat;
  }

  box(key, w, h, d, x, y, z, rot = null) {
    return this.add(key, new THREE.BoxGeometry(w, h, d), x, y, z, rot);
  }

  // Box that is also solid.
  block(key, w, h, d, x, y, z) {
    this.box(key, w, h, d, x, y, z);
    this.solidBox(x, y, z, w, h, d);
  }

  // Cylinder along `axis` ('y', 'z' = rTop toward +Z, 'x' = rTop toward +X).
  cyl(key, rTop, rBot, len, x, y, z, axis = 'y', seg = 16) {
    return this.add(key, new THREE.CylinderGeometry(rTop, rBot, len, seg), x, y, z, AXIS[axis]);
  }

  // Beam between two points [x, y, z] (struts, spokes, masts).
  beam(key, a, b, r, seg = 6) {
    const d = _p.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length();
    const geo = new THREE.CylinderGeometry(r, r, len, seg);
    geo.applyQuaternion(_q.setFromUnitVectors(_s.set(0, 1, 0), d.normalize()));
    return this.add(key, geo, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  }

  solidBox(x, y, z, w, h, d) {
    this.solids.push({ t: 'box', min: [x - w / 2, y - h / 2, z - d / 2], max: [x + w / 2, y + h / 2, z + d / 2] });
  }

  solid(shape) { this.solids.push(shape); }
  hole(min, max) { this.holes.push({ min, max }); }
  light(x, y, z, hex, mode) { this.lights.push({ p: new THREE.Vector3(x, y, z), hex, mode }); }
  object(o) { this.objects.push(o); return o; }

  // One instance of a unit `shape` ('box' | 'ball') drawn with material `key`, optional tint.
  instance(shape, key, x, y, z, sx, sy, sz, hex = null) {
    const id = `${shape}:${key}`;
    if (!this.inst.has(id)) this.inst.set(id, { shape, key, list: [] });
    this.inst.get(id).list.push([x, y, z, sx, sy, sz, hex]);
  }

  // Build everything into a Group using materials[key].
  build(mats) {
    const group = new THREE.Group();
    for (const [key, geos] of this.buckets) {
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (merged) group.add(new THREE.Mesh(merged, mats[key]));
    }
    for (const { shape, key, list } of this.inst.values()) group.add(instanced(shape, mats[key], list));
    if (this.objects.length) group.add(...this.objects);
    this.buckets.clear();
    return group;
  }
}

function instanced(shape, mat, list) {
  const inst = new THREE.InstancedMesh(UNIT[shape](), mat, list.length);
  list.forEach(([x, y, z, sx, sy, sz, hex], i) => {
    inst.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q.identity(), _s.set(sx, sy, sz)));
    if (hex !== null) inst.setColorAt(i, _c.setHex(hex));
  });
  inst.computeBoundingSphere();
  return inst;
}
