// Procedural weapon models, one builder per catalog id. Returns { group, muzzle, mats, glows }.
import * as THREE from 'three';
import { weaponMaterials, PartBuilder, disposeGroup } from './model-kit.js';
import { weaponById } from './catalog.js';

// NMS-style multitool: chunky shell, side canister, forked emitter.
function multitool(p) {
  p.grip();
  p.box(0.08, 0.09, 0.26, 'plate', 0, 0.02, -0.08);
  p.box(0.03, 0.05, 0.2, 'dark', 0, 0.085, -0.06);
  p.ball(0.045, 'plate', 0, 0.02, 0.04);
  p.tube(0.028, 0.04, 0.14, 'metal', 0, 0.02, -0.27);
  p.tube(0.022, 0.022, 0.12, 'glow', 0.058, 0.0, -0.06);
  p.box(0.012, 0.02, 0.1, 'dark', 0.032, 0.035, -0.37);
  p.box(0.012, 0.02, 0.1, 'dark', -0.032, 0.035, -0.37);
  p.ring(0.03, 0.007, 'glow', 0, 0.02, -0.34);
  return p.muzzle(-0.4, 0.02);
}

// Compact sidearm with a glowing plasma chamber.
function pistol(p) {
  p.grip();
  p.box(0.05, 0.07, 0.22, 'metal', 0, 0.02, -0.06);
  p.box(0.052, 0.025, 0.2, 'plate', 0, 0.065, -0.07);
  p.tube(0.018, 0.018, 0.12, 'dark', 0, 0.02, -0.22);
  p.ball(0.03, 'glow', 0, 0.03, 0.01);
  p.ring(0.022, 0.005, 'glow', 0, 0.02, -0.26);
  return p.muzzle(-0.29, 0.02);
}

// Long rifle with a lens emitter and twin coolant rails.
function beam(p) {
  p.grip();
  p.box(0.07, 0.08, 0.34, 'dark', 0, 0.02, -0.1);
  p.tube(0.03, 0.03, 0.26, 'metal', 0, 0.03, -0.38);
  p.tube(0.012, 0.012, 0.3, 'glow', 0.042, 0.05, -0.2);
  p.tube(0.012, 0.012, 0.3, 'glow', -0.042, 0.05, -0.2);
  p.tube(0.045, 0.03, 0.05, 'plate', 0, 0.03, -0.52);
  p.box(0.04, 0.03, 0.12, 'plate', 0, 0.085, -0.05);
  return p.muzzle(-0.56, 0.03);
}

// Fat twin-barrel pulse shotgun with a drum cell.
function shotgun(p) {
  p.grip();
  p.box(0.09, 0.09, 0.2, 'metal', 0, 0.02, -0.05);
  p.tube(0.026, 0.026, 0.3, 'dark', 0.026, 0.04, -0.28);
  p.tube(0.026, 0.026, 0.3, 'dark', -0.026, 0.04, -0.28);
  p.tube(0.05, 0.05, 0.08, 'glow', 0, -0.03, -0.14).rotation.z = 0.3;
  p.box(0.1, 0.02, 0.12, 'plate', 0, 0.075, -0.1);
  return p.muzzle(-0.44, 0.04);
}

// Frosted crystal emitter on a pale frame.
function ice(p) {
  p.grip();
  p.box(0.06, 0.08, 0.28, 'plate', 0, 0.02, -0.08);
  p.tube(0.02, 0.028, 0.2, 'metal', 0, 0.02, -0.3);
  const crystal = p.add(new THREE.OctahedronGeometry(0.045, 0), 'glow', 0, 0.09, -0.1);
  crystal.scale.set(0.8, 1.4, 0.8);
  p.tube(0.03, 0.03, 0.08, 'glow', 0, -0.035, -0.02);
  p.ring(0.03, 0.006, 'glow', 0, 0.02, -0.4);
  return p.muzzle(-0.42, 0.02);
}

// Chunky launcher: wide tube, glowing grenade in the breech.
function grenade(p) {
  p.grip();
  p.box(0.08, 0.07, 0.2, 'metal', 0, 0.0, -0.04);
  p.tube(0.06, 0.06, 0.34, 'dark', 0, 0.06, -0.2, 12);
  p.ring(0.062, 0.01, 'plate', 0, 0.06, -0.37);
  p.tube(0.022, 0.022, 0.1, 'glow', 0.05, 0.11, -0.1);
  p.tube(0.022, 0.022, 0.1, 'glow', -0.05, 0.11, -0.1);
  p.box(0.02, 0.05, 0.05, 'plate', 0, 0.13, -0.24);
  return p.muzzle(-0.38, 0.06);
}

// Split-rail barrel with charge coils.
function rail(p) {
  p.grip();
  p.box(0.07, 0.09, 0.3, 'dark', 0, 0.02, -0.06);
  p.box(0.018, 0.03, 0.46, 'metal', 0.028, 0.03, -0.38);
  p.box(0.018, 0.03, 0.46, 'metal', -0.028, 0.03, -0.38);
  for (let i = 0; i < 4; i++) p.ring(0.045, 0.007, 'glow', 0, 0.03, -0.2 - i * 0.09);
  p.tube(0.018, 0.018, 0.16, 'plate', 0, 0.1, -0.05);
  return p.muzzle(-0.62, 0.03);
}

const BUILDERS = { multitool, pistol, beam, shotgun, ice, grenade, rail };

// overlay = first-person viewmodel (drawn over the world); otherwise a normal world model.
export function buildWeapon(id, overlay = false) {
  const w = weaponById(id) ?? weaponById('multitool');
  const group = new THREE.Group();
  const mats = weaponMaterials(w.color, overlay);
  const muzzle = (BUILDERS[w.id] ?? multitool)(new PartBuilder(group, mats));
  group.traverse((o) => { if (o.isMesh) { o.renderOrder = overlay ? 1000 : 0; o.frustumCulled = !overlay; } });
  return { id: w.id, group, muzzle, mats, glowColor: new THREE.Color(w.color),
    dispose: () => disposeGroup(group, mats) };
}
