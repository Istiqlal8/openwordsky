// Signature props of the war hulls. Whale: ribs, pulsing bioluminescent veins, egg pods and
// hanging tendrils. Cruiser: catapult rails with chase lights, blast deflectors, spinning red
// beacons, missile racks, armory racks, bunks and bulkheads.
import * as THREE from 'three';
import { box, cyl, std, glow, instances } from '../kit.js';
import { desk, lockers, workbench, consoles, windowPane } from '../interior-rooms.js';
import { chair } from '../interior-props.js';
import { aabb } from '../walkable.js';
import { pillars, boxes, crates, strip, chaseLights } from './fit.js';

const Q = Math.PI / 2;
const vaultY = (x, r = 24, k = 0.55) => k * Math.sqrt(Math.max(0, r * r - x * x));

function ribs(ctx) {
  const { mats } = ctx;
  instances(ctx.g, new THREE.TorusGeometry(23.6, 0.5, 6, 40, Math.PI), mats.dark,
    [-12, -8, -4, 0, 4, 8, 12].map((z) => [0, 0, z, 0, 1, 0.55, 1]));
  instances(ctx.g, new THREE.TorusGeometry(1.9, 0.14, 5, 16, Math.PI), mats.dark,
    Array.from({ length: 12 }, (_, i) => [0, 2.6, 15.5 + i * 2.4, 0, 1, 0.6, 1]));
  const posts = [];
  for (const [cx, cz, r, h] of [[-12, 27, 7, 4.5], [12, 27, 7, 4.5], [0, 54, 10, 6]]) {
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6;
      posts.push([0.35, h, 0.5, cx + Math.sin(a) * (r - 0.2), h / 2, cz + Math.cos(a) * (r - 0.2), a]);
    }
  }
  boxes(ctx, mats.dark, posts);
}

// Glowing veins crawling over the vault and floor; one shared material that pulses.
function veins(ctx, rng) {
  const mat = glow(ctx.pal.lamp, 1.4);
  const add = (pts, r) => ctx.g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, r, 5), mat));
  for (let i = 0; i < 10; i++) {
    const z0 = rng.range(-13, 13), pts = [];
    for (let k = 0; k <= 8; k++) {
      const phi = 0.12 + (k / 8) * (Math.PI - 0.24);
      pts.push(new THREE.Vector3(Math.cos(phi) * 23.4, vaultY(Math.cos(phi) * 24) * 0.97 + 0.1, z0 + Math.sin(k * 1.3 + i) * 1.4));
    }
    add(pts, 0.07);
  }
  for (let i = 0; i < 6; i++) {
    const s = i % 2 ? 1 : -1, pts = [];
    for (let k = 0; k <= 6; k++) pts.push(new THREE.Vector3(s * (21.5 - k * 1.3), 0.04, -12 + i * 4.5 + Math.sin(k + i) * 1.2));
    add(pts, 0.05);
  }
  return { update(t) { mat.emissiveIntensity = 1.2 + 0.9 * (0.5 + 0.5 * Math.sin(t * 1.6)); } };
}

// Clusters of glowing egg pods along the bay sides and in the nest; they breathe slowly.
function pods(ctx, rng) {
  const mat = std({ color: ctx.pal.dark, emissive: ctx.pal.lamp, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.1 });
  const items = [];
  for (const [cx, cz] of [[-20, -10], [-20.5, 3], [20, -9], [20.5, 6], [-16, 12], [-15.5, 30.5], [-7.5, 31]]) {
    for (let k = 0; k < 4; k++) {
      const s = rng.range(0.5, 0.9);
      items.push([cx + rng.range(-1, 1), s * 1.3, cz + rng.range(-1, 1), 0, s, s * 1.5, s]);
    }
    ctx.blocks.push(aabb(cx, cz, 3, 3));
  }
  instances(ctx.g, new THREE.SphereGeometry(1, 14, 10), mat, items);
  const tendrils = [];
  for (let i = 0; i < 22; i++) {
    const x = rng.range(-18, 18), len = rng.range(1.5, 3.5);
    tendrils.push([x, vaultY(x) - len / 2 - 0.3, rng.range(-12, 12), 0, 1, len, 1]);
  }
  instances(ctx.g, new THREE.ConeGeometry(0.12, 1, 5).rotateX(Math.PI), ctx.mats.dark, tendrils);
  return { update(t) { mat.emissiveIntensity = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.8)); } };
}

export function decorateWhale(ctx, rng) {
  const { mats } = ctx;
  ribs(ctx);
  const spots = Array.from({ length: 30 }, () => [rng.range(-20, 20), 0.02, rng.range(-12, 12), 0, rng.range(0.2, 0.5), 1, rng.range(0.2, 0.5)]);
  instances(ctx.g, new THREE.CylinderGeometry(1, 1, 0.02, 10), mats.cool, spots);
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(9.9, 9.9, 4, 16, 1, true, -0.7, 1.4), mats.glass);
  eye.position.set(0, 3.5, 54);
  eye.userData.keep = true;
  ctx.g.add(eye);
  consoles(ctx, { x: 0, z: 61, n: 2, gap: 3.6 });
  chair(ctx, ctx.g, 0, 57.6, 0, true);
  lockers(ctx, { x: -17.6, z: 25.5, rotY: Q, n: 2, mat: mats.trim });
  workbench(ctx, { x: 11, z: 31, rotY: -Q });
  return [veins(ctx, rng), pods(ctx, rng)];
}

function hangarGear(ctx) {
  const { mats } = ctx;
  for (const x of [-1.8, 1.8]) box(ctx.g, mats.dark, 0.5, 0.12, 14, x, 0.06, -4);
  const spots = [];
  for (let z = 3; z > -11.5; z -= 1.5) spots.push([-1.8, z], [1.8, z]);
  const rails = chaseLights(ctx, spots, 0xff3020, { sets: 5, per: 2, size: [0.2, 0.08, 0.6], rate: 10 });
  for (const x of [-16, 16]) {
    box(ctx.g, mats.metal, 9, 3, 0.4, x, 1.4, 2.6).rotation.x = -0.55;
    ctx.blocks.push(aabb(x, 2.6, 9, 1.6));
  }
  const missiles = [];
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) missiles.push([s * 25.2, 1 + j * 1.1, -8 + i * 0.9, 0, 1, 1, 1]);
  instances(ctx.g, new THREE.CylinderGeometry(0.3, 0.3, 3.2, 8).rotateX(Q).rotateY(Q), mats.metal, missiles);
  for (const s of [-1, 1]) ctx.blocks.push(aabb(s * 25.2, -5.75, 3.6, 6));
  boxes(ctx, mats.red, [-1, 1].map((s) => [0.08, 0.15, 21, s * 25.9, 3, -1.5]));
  return rails;
}

// Red beacons spinning on the hangar walls.
function beacons(ctx) {
  const at = [[-25.7, 6.5, -6], [25.7, 6.5, -6], [-25.7, 6.5, 6], [25.7, 6.5, 6], [-10, 9.6, 9.7], [10, 9.6, 9.7]];
  for (const [x, y, z] of at) cyl(ctx.g, ctx.mats.dark, 0.25, 0.3, 0.3, x, y - 0.25, z, 10);
  const rot = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.18, 0.18), ctx.mats.red, at.length);
  ctx.dyn.add(rot);
  const m = new THREE.Matrix4();
  return { update(t) {
    at.forEach(([x, y, z], i) => rot.setMatrixAt(i, m.makeRotationY(t * 4 + i).setPosition(x, y, z)));
    rot.instanceMatrix.needsUpdate = true;
  } };
}

function armory(ctx, rng) {
  const { mats } = ctx, guns = [];
  box(ctx.g, mats.dark, 0.3, 2.4, 8, -13.7, 1.3, 19);
  box(ctx.g, mats.dark, 8, 2.4, 0.3, -8, 1.3, 23.7);
  for (let i = 0; i < 14; i++) guns.push([-13.4, 1.4, 15.6 + i * 0.5, 0, 1, 1, 1]);
  for (let i = 0; i < 14; i++) guns.push([-11.3 + i * 0.5, 1.4, 23.4, Q, 1, 1, 1]);
  instances(ctx.g, new THREE.BoxGeometry(0.1, 1.2, 0.28), mats.metal, guns);
  boxes(ctx, mats.red, [[0.05, 0.05, 8, -13.5, 2.55, 19], [8, 0.05, 0.05, -8, 2.55, 23.5]]);
  ctx.blocks.push(aabb(-13.4, 19, 1, 8.4), aabb(-8, 23.4, 8.4, 1));
  box(ctx.g, mats.metal, 3, 0.9, 1.4, -8, 0.45, 18.5);
  boxes(ctx, mats.dark, [[0.9, 0.12, 0.25, -8.6, 0.97, 18.3, 0.3], [0.9, 0.12, 0.25, -7.3, 0.97, 18.8, -0.2]]);
  ctx.blocks.push(aabb(-8, 18.5, 3.2, 1.6));
  crates(ctx, rng, [[-4, 15.2, 2, 1, 2]]);
}

function barracks(ctx) {
  const { mats } = ctx, parts = [];
  for (const z of [30.3, 34]) {
    parts.push([2.4, 0.4, 3, -12.2, 0.35, z], [2.2, 0.25, 2.8, -12.2, 0.65, z], [2.4, 0.15, 3, -12.2, 1.9, z], [2.2, 0.25, 2.8, -12.2, 2.1, z]);
    ctx.blocks.push(aabb(-12.2, z, 2.6, 3.2));
  }
  parts.push([2.4, 0.15, 3, -12.2, 1.9, 37.8], [2.2, 0.25, 2.8, -12.2, 2.1, 37.8]);
  boxes(ctx, mats.fabric, parts);
  pillars(ctx, [[-13.4, 28.8], [-13.4, 39.3], [-11, 28.8], [-11, 39.3]], { w: 0.12, d: 0.12, h: 2.4, mat: mats.metal });
  lockers(ctx, { x: -5, z: 39.4, rotY: Math.PI, n: 4 });
}

export function decorateCruiser(ctx, rng) {
  const { mats } = ctx;
  const anim = [hangarGear(ctx), beacons(ctx)];
  const frames = [];
  for (let z = 12; z <= 42; z += 4) frames.push([0.3, 3.6, 0.5, -1.85, 1.8, z], [0.3, 3.6, 0.5, 1.85, 1.8, z], [4, 0.4, 0.5, 0, 3.4, z]);
  boxes(ctx, mats.metal, frames);
  for (let z = 12; z <= 42; z += 8) strip(ctx, mats.hazard, -1.8, z, 1.8, z, 0.5);
  armory(ctx, rng);
  barracks(ctx);
  windowPane(ctx, { x: 0, y: 2.8, z: 55.9, w: 16, h: 1.6, bars: 5 });
  consoles(ctx, { x: 0, z: 54.3, n: 4, gap: 3.8 });
  chair(ctx, ctx.g, 0, 51.3, 0, true);
  for (const s of [-1, 1]) consoles(ctx, { x: s * 9.3, z: 49, rotY: s * Q, n: 1 });
  workbench(ctx, { x: 7, z: 25 });
  crates(ctx, rng, [[-22, 7.6, 2, 1, 2], [22, -9.6, 2, 2, 1]]);
  desk(ctx, { x: 4.5, z: 15.2, rotY: 0 });
  const pulse = mats.red;
  anim.push({ update(t) { pulse.emissiveIntensity = 1.5 + Math.sin(t * 3) * 1; } });
  return anim;
}
