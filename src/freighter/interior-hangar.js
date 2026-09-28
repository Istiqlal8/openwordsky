// Hangar kit shared by every layout: landing pads with parked ships, the space-door frame and
// a rolling gantry crane.
import * as THREE from 'three';
import { buildShip } from '../view/ship/ship-model.js';
import { shipDesign } from '../view/ship/ship-design.js';
import { box, cyl } from './kit.js';

const PAD_H = 0.2;

export function pad(ctx, g, { x, z, r, y = 0 }) {
  const { mats } = ctx;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.3, PAD_H, 40), [mats.dark, mats.pad, mats.dark]);
  m.position.set(x, y + PAD_H / 2, z);
  g.add(m);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.15, 0.06, 6, 48), mats.cool);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, y + PAD_H + 0.02, z);
  g.add(ring);
}

// Parks a ship model on a pad (a dynamic object); its footprint becomes solid. Returns the model.
function park(ctx, design, p, rotY) {
  const model = buildShip(design);
  model.setLegs(true);
  model.setThrust(0);
  model.group.position.set(p.x, (p.y ?? 0) + PAD_H + model.groundOffset - 0.05, p.z);
  model.group.rotation.y = rotY;
  ctx.dyn.add(model.group);
  model.group.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(model.group);
  ctx.blocks.push({ x0: b.min.x + 0.4, x1: b.max.x - 0.4, z0: b.min.z + 0.4, z1: b.max.z - 0.4, y: p.y ?? 0, h: 6 });
  model.box = b;
  return model;
}

// Pads for plan.pads = { player, npc[] }; returns { playerShip, npcShips }.
export function parkShips(ctx, pads, design, rng) {
  for (const p of [pads.player, ...pads.npc]) pad(ctx, ctx.g, p);
  const playerShip = park(ctx, design, pads.player, 0);
  const npcShips = pads.npc.map((p) => park(ctx, shipDesign(rng.int(1e9)), p, p.rot ?? 0));
  return { playerShip, npcShips };
}

// Hazard stripe, side posts and lintel around a space door { x0, x1, h, z } (bay inside at +Z).
export function doorFrame(ctx, D) {
  const { mats } = ctx, g = ctx.g, w = D.x1 - D.x0, cx = (D.x0 + D.x1) / 2;
  box(g, mats.hazard, w, 0.03, 1.2, cx, 0.015, D.z + 0.9);
  for (const x of [D.x0, D.x1]) box(g, mats.cool, 0.4, D.h, 0.4, x, D.h / 2, D.z + 0.3);
  box(g, mats.cool, w, 0.4, 0.4, cx, D.h, D.z + 0.3);
  box(g, mats.trim, w + 1.6, 0.8, 0.5, cx, D.h + 0.8, D.z + 0.35);
}

// Gantry crane on rails at z = railA / railB, bridge beam along Z at height y with a trolley
// and a hanging container. Returns an animator.
export function crane(ctx, { x = 0, zA, zB, y, sweep, beamMat = ctx.mats.orange, phase = 0 }) {
  const { mats } = ctx, len = zB - zA + 3, zc = (zA + zB) / 2;
  const bridge = new THREE.Group();
  box(bridge, beamMat, 1.2, 1, len, 0, y, zc);
  const trolley = new THREE.Group();
  box(trolley, mats.dark, 2, 0.8, 2, 0, y - 0.7, 0);
  cyl(trolley, mats.metal, 0.05, 0.05, 3.4, 0, y - 2.7, 0, 6);
  box(trolley, mats.trim, 2.4, 2.4, 5.5, 0, y - 5.6, 0);
  box(trolley, mats.red, 0.2, 0.2, 0.2, 0, y - 1.2, 1.05);
  trolley.position.z = zc;
  bridge.add(trolley);
  bridge.position.x = x;
  ctx.dyn.add(bridge);
  const half = (zB - zA) / 2 - 3;
  return { update(t) {
    bridge.position.x = x + Math.sin(t * 0.1 + phase) * sweep;
    trolley.position.z = zc + Math.sin(t * 0.23 + phase) * half;
  } };
}
