// Signature props of the long hulls: the classic cargo hangar (twin gantry cranes, crates,
// fuel tanks) and the hammerhead's runway (chasing runway lights, container conveyor).
import * as THREE from 'three';
import { box, cyl } from '../kit.js';
import { crane } from '../interior-hangar.js';
import { desk, lockers, workbench, consoles } from '../interior-rooms.js';
import { chair } from '../interior-props.js';
import { aabb } from '../walkable.js';
import { bridgeFit, pillars, boxes, crates, tank, strip, chaseLights } from './fit.js';

const Q = Math.PI / 2;

function classicHangar(ctx, rng) {
  const { mats } = ctx;
  strip(ctx, mats.orange, -28, 12.2, 28, 12.2);
  for (const x of [0, -18, 18]) strip(ctx, mats.warm, x, -13, x, -6, 0.18);
  const posts = [];
  for (const z of [-12, -6, 0, 6, 12]) posts.push([-29.4, z], [29.4, z]);
  pillars(ctx, posts, { h: 16 });
  pillars(ctx, [-24, -16, -8, 8, 16, 24].map((x) => [x, 14.5]), { h: 16, d: 0.8 });
  boxes(ctx, mats.cool, [-12, -6, 0, 6, 12].flatMap((z) => [[0.1, 9, 0.25, -28.85, 6, z], [0.1, 9, 0.25, 28.85, 6, z]]));
  for (const z of [-9, 11]) box(ctx.g, mats.dark, 58, 0.6, 0.8, 0, 14.6, z); // crane rails
  crates(ctx, rng, [[-26, 8, 2, 3, 3], [-26, -9, 2, 2, 2], [26, 9, 2, 3, 2], [-11, 12.4, 3, 1, 2], [12, 12.4, 2, 1, 3]]);
  for (const z of [-11, -7.5]) tank(ctx, 26.5, z);
  return [crane(ctx, { x: -13, zA: -9, zB: 11, y: 14, sweep: 11 }),
    crane(ctx, { x: 13, zA: -9, zB: 11, y: 14, sweep: 11, beamMat: mats.trim, phase: Math.PI })];
}

function classicDeck(ctx) {
  const { mats } = ctx;
  for (const s of [-1, 1]) {
    box(ctx.g, mats.cool, 0.06, 0.06, 25, s * 2.3, 0.12, 27.5);
    cyl(ctx.g, mats.metal, 0.12, 0.12, 25, s * 2.1, 3.7, 27.5, 8).rotation.x = Q;
  }
  bridgeFit(ctx, { zWin: 56, w: 20 });
  for (const s of [-1, 1]) {
    consoles(ctx, { x: s * 11.3, z: 49, rotY: s * Q, n: 1, gap: 5 });
    chair(ctx, ctx.g, s * 9.9, 49, -s * Q + Math.PI);
  }
  desk(ctx, { x: -6, z: 23 });
  lockers(ctx, { x: -14.2, z: 22.5 });
  box(ctx.g, mats.warm, 0.05, 0.05, 6, -15.8, 3.05, 28);
  workbench(ctx, { x: 8.5, z: 33.2 });
  lockers(ctx, { x: 5.5, z: 22.5, n: 3 });
}

export function decorateClassic(ctx, rng) {
  const anim = classicHangar(ctx, rng);
  classicDeck(ctx);
  return anim;
}

// Runway lights whose glow chases toward the door.
function runway(ctx) {
  const spots = [];
  for (let z = 9; z > -44; z -= 2) spots.push([-3.5, z], [3.5, z]);
  return chaseLights(ctx, spots, ctx.pal.lamp, { sets: 6, per: 2, rate: 8 });
}

// Overhead rail with hanging containers gliding the length of the bay.
function conveyor(ctx) {
  const { mats } = ctx, N = 7, z0 = -43, z1 = 9;
  box(ctx.g, mats.dark, 0.8, 0.6, z1 - z0 + 2, -9, 12.8, (z0 + z1) / 2);
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 2.6, 4.5), mats.crate, N);
  const colors = [0xb8452e, 0x2f6fa8, 0xd9a13a, ctx.pal.accent, 0x4d8a4a];
  for (let i = 0; i < N; i++) inst.setColorAt(i, new THREE.Color(colors[i % colors.length]));
  ctx.dyn.add(inst);
  const m = new THREE.Matrix4();
  return { update(t) {
    for (let i = 0; i < N; i++) {
      const z = z0 + (((t * 2.2 + i * (z1 - z0) / N) % (z1 - z0)) + (z1 - z0)) % (z1 - z0);
      inst.setMatrixAt(i, m.makeTranslation(-9, 10.6, z));
    }
    inst.instanceMatrix.needsUpdate = true;
  } };
}

export function decorateHammer(ctx, rng) {
  const { mats } = ctx;
  const ribs = [];
  for (let z = -42; z <= 9; z += 6) ribs.push([-12.6, z], [12.6, z]);
  pillars(ctx, ribs, { w: 0.8, d: 1.2, h: 14, mat: mats.dark });
  boxes(ctx, mats.warm, ribs.map(([x, z]) => [0.1, 10, 0.3, x * 0.985, 6, z]));
  strip(ctx, mats.hazard, -9.5, -42.5, 9.5, -42.5, 1.2);
  box(ctx.g, mats.trim, 26, 0.5, 0.4, 0, 13.5, -44.7);
  crates(ctx, rng, [[-10.5, -30, 2, 3, 2], [10.2, -38, 2, 2, 3], [-10.5, 3, 2, 2, 2], [10.5, -4, 2, 3, 1]]);
  tank(ctx, 11, -12, 1, 3);
  // Cross hall: benches and wall screens along the "hammer".
  boxes(ctx, mats.fabric, [-18, -12, 12, 18].map((x) => [3, 0.5, 0.8, x, 0.25, 21.3]));
  for (const x of [-18, -12, 12, 18]) ctx.blocks.push(aabb(x, 21.3, 3.2, 1));
  boxes(ctx, mats.screen, [-18, -12, 12, 18].map((x) => [3, 1.6, 0.05, x, 2.4, 12.2]));
  bridgeFit(ctx, { zWin: 36, w: 16, n: 4 });
  desk(ctx, { x: -24, z: 32.8, rotY: 0 });
  lockers(ctx, { x: -31.4, z: 26, rotY: Q, n: 3 });
  workbench(ctx, { x: 24.5, z: 33.1 });
  return [runway(ctx), conveyor(ctx)];
}
