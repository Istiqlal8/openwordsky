// Rooms off the corridor: bridge (ANJUNGAN), quarters (KABIN), workshop + trade
// (BENGKEL / PERDAGANGAN), and the corridor's own fittings.
import * as THREE from 'three';
import { box, cyl } from './kit.js';
import { sign, terminal, chair, ceilingLights } from './interior-props.js';
import { aabb } from './walkable.js';

function light(g, hex, intensity, x, y, z, range) {
  const l = new THREE.PointLight(hex, intensity, range, 1.2);
  l.position.set(x, y, z);
  g.add(l);
}

function corridor(ctx, g) {
  const { mats } = ctx, spots = [];
  for (let z = 17; z < 40; z += 3) spots.push([0, z]);
  ceilingLights(ctx, g, spots, 3.92, 1.2, 1.4);
  for (const s of [-1, 1]) {
    box(g, mats.cool, 0.06, 0.06, 25, s * 2.3, 0.12, 27.5);
    cyl(g, mats.metal, 0.12, 0.12, 25, s * 2.1, 3.7, 27.5, 8).rotation.x = Math.PI / 2;
  }
  light(g, 0xbfe6ff, 12, 0, 3.4, 27.5, 18);
  sign(ctx, g, 'ANJUNGAN', 0, 3.55, 38.6, Math.PI, 2.6);
  sign(ctx, g, 'KABIN', -2.32, 3.55, 28, Math.PI / 2, 2.4);
  sign(ctx, g, 'BENGKEL', 2.32, 3.55, 28, -Math.PI / 2, 2.4);
}

function bridgeWindow(ctx, g) {
  const { mats } = ctx;
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(20, 5.2), mats.glass);
  pane.position.set(0, 3.6, 55.9);
  g.add(pane);
  for (const x of [-5, 0, 5]) box(g, mats.dark, 0.25, 5.2, 0.25, x, 3.6, 55.8);
  for (let i = 0; i < 5; i++) {
    const x = -8 + i * 4;
    box(g, mats.dark, 3.4, 0.95, 1.1, x, 0.48, 54.2);
    const scr = box(g, mats.screen, 3, 0.04, 0.7, x, 1.05, 54.1);
    scr.rotation.x = -0.35;
  }
  ctx.blocks.push(aabb(0, 54.2, 20, 1.3));
}

// Holographic galaxy: a spinning spiral of glowing points above a round table.
function holoTable(ctx, g) {
  const { mats } = ctx;
  cyl(g, mats.dark, 1.3, 1.5, 0.9, 0, 0.45, 45, 32);
  cyl(g, mats.holo, 1.25, 1.25, 0.05, 0, 0.93, 45, 32);
  const n = 1400, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const arm = i % 3, t = Math.pow(Math.random(), 0.7), a = arm * 2.09 + t * 5 + (Math.random() - 0.5) * 0.5;
    const r = 0.08 + t * 1.1;
    pos.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.08 * (1.2 - t), Math.sin(a) * r], i * 3);
    c.setHSL(0.55 + t * 0.12 - (i % 7 === 0 ? 0.5 : 0), 0.9, 0.4 + (1 - t) * 0.25);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const holo = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true,
    opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  const tilt = new THREE.Group();
  tilt.position.set(0, 1.9, 45);
  tilt.rotation.set(0.5, 0, 0.2);
  tilt.add(holo);
  g.add(tilt);
  ctx.blocks.push(aabb(0, 45, 3, 3));
  ctx.terminals.push({ x: 0, z: 45, action: 'map', prompt: '[T] Peta Galaksi' });
  return holo;
}

function bridge(ctx, g) {
  bridgeWindow(ctx, g);
  const holo = holoTable(ctx, g);
  chair(ctx, g, 0, 50.5, 0, true);
  for (const s of [-1, 1]) {
    box(g, ctx.mats.dark, 1, 1, 6, s * 11.3, 0.5, 49);
    box(g, ctx.mats.screen, 0.05, 1.4, 5, s * 11.75, 2.1, 49);
    ctx.blocks.push(aabb(s * 11.3, 49, 1.2, 6.2));
    chair(ctx, g, s * 9.9, 49, s * Math.PI / 2 * -1 + Math.PI);
  }
  ceilingLights(ctx, g, [[-6, 43], [6, 43], [-6, 49], [6, 49]], 6.9, 3, 0.6, ctx.mats.warm);
  light(g, 0xffd6a0, 70, 0, 5.5, 47, 30);
  return holo;
}

function quarters(ctx, g) {
  const { mats } = ctx;
  box(g, mats.dark, 2.4, 0.5, 3, -12, 0.25, 32.3);
  box(g, mats.fabric, 2.2, 0.3, 2.8, -12, 0.65, 32.3);
  box(g, mats.crate, 1.8, 0.2, 0.6, -12, 0.88, 33.3);
  box(g, mats.trim, 2.25, 0.08, 1.6, -12, 0.82, 31.4);
  ctx.blocks.push(aabb(-12, 32.3, 2.6, 3.2));
  ctx.terminals.push({ x: -12, z: 30.6, action: 'rest', prompt: '[T] Istirahat' });
  box(g, mats.metal, 1.6, 0.08, 0.8, -6, 0.8, 23);
  box(g, mats.screen, 0.9, 0.55, 0.04, -6, 1.2, 22.7);
  chair(ctx, g, -6, 24, Math.PI);
  ctx.blocks.push(aabb(-6, 23, 1.8, 1));
  for (const x of [-15, -13.9]) box(g, mats.metal, 1, 2.4, 0.7, x + 0.3, 1.2, 22.5);
  ctx.blocks.push(aabb(-14.2, 22.5, 2.4, 0.9));
  box(g, mats.warm, 0.05, 0.05, 6, -15.8, 3.05, 28);
  light(g, 0xffc890, 30, -9, 3.4, 28, 16);
  ceilingLights(ctx, g, [[-9, 26], [-9, 30]], 3.92, 2, 0.5, mats.warm);
}

function workshop(ctx, g) {
  const { mats } = ctx;
  terminal(ctx, g, { x: 14.6, z: 25, rotY: -Math.PI / 2, label: 'Bengkel', action: 'shipyard', color: 0xffa040 });
  terminal(ctx, g, { x: 14.6, z: 31, rotY: -Math.PI / 2, label: 'Perdagangan', action: 'store', color: 0x40ff90 });
  sign(ctx, g, 'BENGKEL', 15.8, 2.7, 25, -Math.PI / 2, 2.6, '#ffc47a');
  sign(ctx, g, 'PERDAGANGAN', 15.8, 2.7, 31, -Math.PI / 2, 2.8, '#8fffb0');
  box(g, mats.metal, 4.5, 0.9, 1.2, 8.5, 0.45, 33.2);
  cyl(g, mats.orange, 0.12, 0.15, 0.9, 7.5, 1.35, 33.2, 8).rotation.z = 0.5;
  box(g, mats.dark, 0.5, 0.3, 0.5, 10, 1.05, 33.2);
  ctx.blocks.push(aabb(8.5, 33.2, 4.7, 1.4));
  const nozzle = cyl(g, mats.metal, 0.7, 1.1, 2.2, 8.5, 1.4, 27.5, 20);
  nozzle.rotation.x = Math.PI / 2;
  cyl(g, mats.metal, 0.2, 0.2, 0.9, 8.5, 0.45, 27.5, 8);
  const core = cyl(g, mats.cool, 0.6, 0.6, 0.05, 8.5, 1.4, 28.65, 20);
  core.rotation.x = Math.PI / 2;
  ctx.blocks.push(aabb(8.5, 27.5, 2.4, 2.6));
  for (const x of [4.5, 6.5]) box(g, mats.metal, 1.8, 2.6, 0.6, x, 1.3, 22.5);
  ctx.blocks.push(aabb(5.5, 22.5, 4, 0.8));
  light(g, 0xd8ecff, 30, 9, 3.4, 28, 16);
  ceilingLights(ctx, g, [[6, 26], [12, 26], [6, 30], [12, 30]], 3.92, 2, 0.5);
}

// Returns animated parts: { holo }.
export function buildRooms(ctx, g) {
  corridor(ctx, g);
  quarters(ctx, g);
  workshop(ctx, g);
  return { holo: bridge(ctx, g) };
}
