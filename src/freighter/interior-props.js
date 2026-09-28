// Reusable interior props: terminals, signs, crate stacks, chairs. Builders add meshes to a
// parent and register owned textures in `ctx.textures`, solid footprints in `ctx.blocks`
// and interaction points in `ctx.terminals`.
import * as THREE from 'three';
import { box, cyl, textTexture, signPlane, std } from './kit.js';
import { aabb } from './walkable.js';

const CRATE_COLORS = [0xb8452e, 0x2f6fa8, 0xd9a13a, 0x4d8a4a, 0x7c828c, 0xc96a2b];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
const _e = new THREE.Euler();

// Wall/ceiling sign: glowing text on a dark plate. Faces local +Z, then rotated by rotY.
export function sign(ctx, parent, text, x, y, z, rotY, width = 3, color = '#bff0ff') {
  const tex = textTexture(text, { w: 1024, h: 192, fg: color, bg: 'rgba(12,18,26,0.92)', border: color,
    font: 'bold 110px system-ui, sans-serif' });
  ctx.textures.push(tex);
  const m = signPlane(tex, width, width * 0.1875);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  parent.add(m);
  return m;
}

// Console on a pedestal with a slanted screen and a floating label; T near it returns `action`.
export function terminal(ctx, parent, { x, z, y = 0, rotY, label, action, color = 0x58c8ff }) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  const { mats } = ctx;
  box(g, mats.dark, 0.9, 1.0, 0.55, 0, 0.5, 0);
  box(g, mats.trim, 0.95, 0.06, 0.6, 0, 1.02, 0);
  const tex = textTexture(label, { w: 512, h: 320, fg: '#dff6ff', bg: '#062033', border: ctx.pal?.sign ?? '#58c8ff', font: 'bold 64px system-ui, sans-serif' });
  ctx.textures.push(tex);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.53),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.set(0, 1.28, 0.05);
  screen.rotation.x = -0.45;
  g.add(screen);
  const halo = cyl(g, std({ color: 0x000000, emissive: color, emissiveIntensity: 2.5 }), 0.5, 0.5, 0.04, 0, 0.02, 0.55, 24);
  halo.scale.z = 0.6;
  parent.add(g);
  ctx.blocks.push(aabb(x, z, 1.1, 1.1, y));
  ctx.terminals.push({ x, z, y, action, prompt: `[T] ${label}` });
  return g;
}

// Stack of cargo crates (one instanced draw per call). Footprint is solid.
export function crateStack(ctx, parent, rng, x, z, cols, rows, layers) {
  const n = cols * rows * layers, S = 1.6;
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(S * 0.96, S * 0.96, S * 0.96), ctx.mats.crate, n);
  const col = new THREE.Color();
  let i = 0;
  for (let l = 0; l < layers; l++) for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const keep = l === 0 || rng.next() < 0.7;
    _p.set(x + (c - (cols - 1) / 2) * S, S / 2 + l * S, z + (r - (rows - 1) / 2) * S);
    _e.set(0, keep ? rng.range(-0.08, 0.08) : 0, 0);
    inst.setMatrixAt(i, _m.compose(_p, _q.setFromEuler(_e), keep ? _s.set(1, 1, 1) : _s.set(0, 0, 0)));
    inst.setColorAt(i++, col.setHex(CRATE_COLORS[rng.int(CRATE_COLORS.length)]));
  }
  parent.add(inst);
  ctx.blocks.push(aabb(x, z, cols * S + 0.1, rows * S + 0.1));
}

// Simple seat facing local +Z.
export function chair(ctx, parent, x, z, rotY, big = false, y = 0) {
  const g = new THREE.Group(), k = big ? 1.4 : 1, { mats } = ctx;
  cyl(g, mats.metal, 0.08, 0.2, 0.45, 0, 0.23, 0, 10);
  box(g, mats.fabric, 0.6 * k, 0.14, 0.6 * k, 0, 0.5, 0);
  box(g, mats.fabric, 0.6 * k, 0.8 * k, 0.12, 0, 0.9 * k, -0.28 * k);
  if (big) for (const s of [-1, 1]) box(g, mats.dark, 0.12, 0.5, 0.7, s * 0.48 * k, 0.75, 0);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  parent.add(g);
  ctx.blocks.push(aabb(x, z, 0.7 * k, 0.7 * k, y));
  return g;
}

// Ceiling light panels (one instanced draw).
export function ceilingLights(ctx, parent, spots, y, w = 3, d = 0.6, mat = ctx.mats.cool) {
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(w, 0.12, d), mat, spots.length);
  spots.forEach(([x, z], i) => inst.setMatrixAt(i, _m.compose(_p.set(x, y, z), _q.identity(), _s.set(1, 1, 1))));
  parent.add(inst);
}
