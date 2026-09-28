// Room kit shared by every layout: the five stations every capital ship must offer (hangar,
// shipyard and trade terminals, a bed and the galaxy map table), bridge windows, consoles and
// small furniture. Positions come from the plan; `y` puts a piece on a raised deck.
import * as THREE from 'three';
import { box, cyl } from './kit.js';
import { terminal, chair } from './interior-props.js';
import { aabb } from './walkable.js';

export function light(g, hex, intensity, x, y, z, range) {
  const l = new THREE.PointLight(hex, intensity, range, 1.2);
  l.position.set(x, y, z);
  g.add(l);
  return l;
}

// Solid footprint of a w x d piece turned by rotY (quarter turns swap the sides).
export function footprint(x, z, w, d, rotY, y = 0) {
  const swap = Math.abs(Math.sin(rotY)) > 0.7;
  return aabb(x, z, swap ? d : w, swap ? w : d, y);
}

function frame(ctx, x, y, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  ctx.g.add(g);
  return g;
}

// Holographic galaxy: a spinning spiral of glowing points above a round table. Returns an animator.
export function holoTable(ctx, { x, z, y = 0 }) {
  const { mats } = ctx;
  cyl(ctx.g, mats.dark, 1.3, 1.5, 0.9, x, y + 0.45, z, 32);
  cyl(ctx.g, mats.holo, 1.25, 1.25, 0.05, x, y + 0.93, z, 32);
  const n = 1400, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
  const hue = new THREE.Color(ctx.pal.lamp).getHSL({}).h;
  for (let i = 0; i < n; i++) {
    const arm = i % 3, t = Math.pow(Math.random(), 0.7), a = arm * 2.09 + t * 5 + (Math.random() - 0.5) * 0.5;
    const r = 0.08 + t * 1.1;
    pos.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.08 * (1.2 - t), Math.sin(a) * r], i * 3);
    c.setHSL(hue + t * 0.12 - (i % 7 === 0 ? 0.5 : 0), 0.9, 0.4 + (1 - t) * 0.25);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const holo = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true,
    opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  const tilt = new THREE.Group();
  tilt.position.set(x, y + 1.9, z);
  tilt.rotation.set(0.5, 0, 0.2);
  tilt.add(holo);
  ctx.dyn.add(tilt);
  ctx.blocks.push(aabb(x, z, 3, 3, y));
  ctx.terminals.push({ x, z, y, action: 'map', prompt: '[T] Peta Galaksi' });
  return { update(t) { holo.rotation.y = t * 0.15; } };
}

// Bed against a wall (head at local -Z); T beside it rests.
export function bed(ctx, { x, z, rotY = 0, y = 0 }) {
  const { mats } = ctx, g = frame(ctx, x, y, z, rotY);
  box(g, mats.dark, 2.4, 0.5, 3, 0, 0.25, 0);
  box(g, mats.fabric, 2.2, 0.3, 2.8, 0, 0.65, 0);
  box(g, mats.crate, 1.8, 0.2, 0.6, 0, 0.88, -1);
  box(g, mats.trim, 2.25, 0.08, 1.6, 0, 0.82, 0.9);
  ctx.blocks.push(footprint(x, z, 2.6, 3.2, rotY, y));
  const fx = x + Math.sin(rotY) * 1.9, fz = z + Math.cos(rotY) * 1.9;
  ctx.terminals.push({ x: fx, z: fz, y, action: 'rest', prompt: '[T] Istirahat' });
}

const LABELS = {
  hangar: ['Hangar', 0x58c8ff], shipyard: ['Bengkel', 0xffa040], store: ['Perdagangan', 0x40ff90],
};

// Every required station from plan.stations = { hangar, shipyard, store, rest, map }.
// Returns the holo animator.
export function stations(ctx, st) {
  for (const action of ['hangar', 'shipyard', 'store']) {
    const [label, color] = LABELS[action];
    terminal(ctx, ctx.g, { ...st[action], label, action, color });
  }
  bed(ctx, st.rest);
  return holoTable(ctx, st.map);
}

// Glass pane with mullions, facing local +Z after rotY.
export function windowPane(ctx, { x, y, z, w, h, rotY = 0, bars = 3 }) {
  const g = frame(ctx, x, y, z, rotY);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), ctx.mats.glass);
  pane.userData.keep = true;
  g.add(pane);
  for (let i = 1; i <= bars; i++) box(g, ctx.mats.dark, 0.25, h, 0.25, -w / 2 + (w * i) / (bars + 1), 0, -0.1);
}

// Row of n consoles along local X, screens tilted toward local -Z (the operator side).
export function consoles(ctx, { x, z, rotY = 0, n = 5, y = 0, gap = 4 }) {
  const { mats } = ctx, g = frame(ctx, x, y, z, rotY);
  for (let i = 0; i < n; i++) {
    const cx = (i - (n - 1) / 2) * gap;
    box(g, mats.dark, 3.4, 0.95, 1.1, cx, 0.48, 0);
    box(g, mats.screen, 3, 0.04, 0.7, cx, 1.05, -0.1).rotation.x = -0.35;
    box(g, mats.trim, 3.4, 0.06, 0.1, cx, 0.97, -0.56);
  }
  ctx.blocks.push(footprint(x, z, n * gap, 1.3, rotY, y));
}

// Desk with a screen and a chair (desk at local -Z of the chair).
export function desk(ctx, { x, z, rotY = 0, y = 0 }) {
  const { mats } = ctx, g = frame(ctx, x, y, z, rotY);
  box(g, mats.metal, 1.6, 0.08, 0.8, 0, 0.8, 0);
  box(g, mats.screen, 0.9, 0.55, 0.04, 0, 1.2, -0.3);
  ctx.blocks.push(footprint(x, z, 1.8, 1, rotY, y));
  chair(ctx, ctx.g, x + Math.sin(rotY) * 1, z + Math.cos(rotY) * 1, rotY + Math.PI, false, y);
}

// Row of n lockers along local X, doors facing local +Z.
export function lockers(ctx, { x, z, rotY = 0, n = 2, y = 0, mat = ctx.mats.metal }) {
  const g = frame(ctx, x, y, z, rotY);
  for (let i = 0; i < n; i++) {
    const cx = (i - (n - 1) / 2) * 1.1;
    box(g, mat, 1, 2.4, 0.7, cx, 1.2, 0);
    box(g, ctx.mats.trim, 0.06, 0.4, 0.02, cx + 0.3, 1.3, 0.36);
  }
  ctx.blocks.push(footprint(x, z, n * 1.1 + 0.2, 0.9, rotY, y));
}

// Workbench with a thruster nozzle on a stand (the workshop set piece).
export function workbench(ctx, { x, z, rotY = 0, y = 0 }) {
  const { mats } = ctx, g = frame(ctx, x, y, z, rotY);
  box(g, mats.metal, 4.5, 0.9, 1.2, 0, 0.45, 0);
  cyl(g, mats.orange, 0.12, 0.15, 0.9, -1, 1.35, 0, 8).rotation.z = 0.5;
  box(g, mats.dark, 0.5, 0.3, 0.5, 1.5, 1.05, 0);
  const nozzle = cyl(g, mats.metal, 0.7, 1.1, 2.2, 0, 1.4, -5.7, 20);
  nozzle.rotation.x = Math.PI / 2;
  cyl(g, mats.metal, 0.2, 0.2, 0.9, 0, 0.45, -5.7, 8);
  cyl(g, mats.cool, 0.6, 0.6, 0.05, 0, 1.4, -4.55, 20).rotation.x = Math.PI / 2;
  ctx.blocks.push(footprint(x, z, 4.7, 1.4, rotY, y));
  const nx = x - Math.sin(rotY) * 5.7, nz = z - Math.cos(rotY) * 5.7;
  ctx.blocks.push(footprint(nx, nz, 2.4, 2.6, rotY, y));
}
