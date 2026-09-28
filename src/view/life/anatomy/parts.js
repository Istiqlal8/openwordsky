// Part bins: collect transformed pieces for one rigid bone and bake them into one mesh per material.
import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

// Texture rows at v >= 0.95 are pure white: hard parts (horn, hoof, claw) sample there.
const HARD_V = 0.985;
const SKIN_V = 0.93;

function transform(geo, o) {
  const sc = o.scale ?? 1;
  _p.fromArray(o.at ?? [0, 0, 0]);
  _q.setFromEuler(_e.fromArray([...(o.rot ?? [0, 0, 0]), 'XYZ']));
  if (typeof sc === 'number') _s.setScalar(sc); else _s.fromArray(sc);
  geo.applyMatrix4(_m.compose(_p, _q, _s));
  if (o.post) geo.applyMatrix4(o.post);
  if (_s.x * _s.y * _s.z < 0) flip(geo);
}

function flip(geo) {
  const idx = geo.index.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 2]; idx[i + 2] = t; }
  geo.computeVertexNormals();
}

// UV from surface normal (v: back=0, belly=0.93) and position along one axis (u).
function paint(geo, o) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, n = pos.count;
  const uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
  const axis = o.uAxis ?? 0, k = o.uScale ?? 0.9;
  _c.set(o.tint ?? 0xffffff);
  for (let i = 0; i < n; i++) {
    if (o.hard) { uv[i * 2] = 0.5; uv[i * 2 + 1] = HARD_V; } else {
      uv[i * 2] = pos.getComponent(i, axis) * k + (o.uOff ?? 0);
      uv[i * 2 + 1] = (Math.acos(Math.max(-1, Math.min(1, nor.getY(i)))) / Math.PI) * SKIN_V;
    }
    col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(o.colors ?? col, 3));
}

function merge(list) {
  let verts = 0, tris = 0;
  for (const g of list) { verts += g.attributes.position.count; tris += g.index.count; }
  const out = { position: new Float32Array(verts * 3), normal: new Float32Array(verts * 3),
    uv: new Float32Array(verts * 2), color: new Float32Array(verts * 3) };
  const index = new (verts > 65535 ? Uint32Array : Uint16Array)(tris);
  let vo = 0, io = 0;
  for (const g of list) {
    for (const k of Object.keys(out)) out[k].set(g.attributes[k].array, vo * g.attributes[k].itemSize);
    const src = g.index.array;
    for (let i = 0; i < src.length; i++) index[io + i] = src[i] + vo;
    vo += g.attributes.position.count;
    io += src.length;
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(out.position, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(out.normal, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(out.uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(out.color, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeBoundingSphere();
  return geo;
}

export const stats = { tris: 0 };

export class Bin {
  constructor() { this.slots = { skin: [], eye: [], glow: [] }; }

  // o: { slot, at, rot, scale, post (Matrix4 applied last), tint, hard, uAxis, uScale, uOff, colors (per-vertex rgb) }
  add(geo, o = {}) {
    const g = geo.index ? geo : geo.setIndex([...Array(geo.attributes.position.count).keys()]);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    transform(g, o);
    paint(g, o);
    this.slots[o.slot ?? 'skin'].push(g);
    return this;
  }

  // One mesh per used material slot, added to parent. Returns { skin, eye, glow } meshes.
  bake(parent, mats) {
    const out = {};
    for (const [slot, list] of Object.entries(this.slots)) {
      if (!list.length) continue;
      const geo = merge(list);
      stats.tris += geo.index.count / 3;
      out[slot] = new THREE.Mesh(geo, mats[slot]);
      parent.add(out[slot]);
    }
    this.slots = { skin: [], eye: [], glow: [] };
    return out;
  }
}
