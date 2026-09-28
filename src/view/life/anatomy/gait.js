// Locomotion: gait phases (walk / trot / gallop, biped strut, insect tripod), IK foot planting on
// terrain, body bob and slope pitch/roll. No allocations per frame.
import * as THREE from 'three';
import { reach } from './ik.js';

const inv = new THREE.Matrix4();
const v = new THREE.Vector3();
const TAU = Math.PI * 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const clerp = (a, b, t) => a + ((((b - a) % 1) + 1.5) % 1 - 0.5) * t;
const ease = (u) => u * u * (3 - 2 * u);

// Phase offset of one leg for the current gait blend g (0 walk, 0.5 trot, 1 gallop).
function legOffset(d, kind, g) {
  if (d.insect) return ((d.pair + (d.side > 0 ? 1 : 0)) % 2) * 0.5 + d.pair * 0.04;
  if (kind === 'biped') return d.side > 0 ? 0.5 : 0;
  const L = d.side < 0;
  const walk = d.front ? (L ? 0.25 : 0.75) : (L ? 0 : 0.5);
  const trot = d.front ? (L ? 0 : 0.5) : (L ? 0.5 : 0);
  const gallop = d.front ? (L ? 0.5 : 0.62) : (L ? 0 : 0.12);
  return g < 0.5 ? clerp(walk, trot, g * 2) : clerp(trot, gallop, g * 2 - 1);
}

// Ground height under a root-local point, in root-local units.
function groundLocal(a, env, x, z) {
  if (!env.near) return -a.hop / a.scale;
  const r = a.root, c = Math.cos(r.rotation.y), s = Math.sin(r.rotation.y), k = a.scale;
  const wx = r.position.x + (x * c + z * s) * k, wz = r.position.z + (-x * s + z * c) * k;
  return (env.heightFn(wx, wz) - r.position.y) / k;
}

// Advances the master gait phase from the local ground speed.
function advance(a, dt) {
  const an = a.anim, plan = a.parts.plan;
  const hopper = a.hopper;
  const vLocal = hopper ? 0 : (Math.abs(a.speed) + Math.abs(a.turn) * plan.len * 0.3 * a.scale) / a.scale;
  an.g += (clamp01((a.speed / a.runSpeed - 0.25) * 1.6) - an.g) * Math.min(1, dt * 3);
  an.beta = plan.kind === 'insect' ? 0.55 : 0.64 - 0.26 * an.g;
  an.stride = Math.max(0.05, plan.H * (0.6 + 0.7 * an.g));
  an.phase = (an.phase + dt * (vLocal * an.beta) / an.stride) % 1;
  an.move += (clamp01(vLocal / (plan.H * 0.25 + 0.01)) - an.move) * Math.min(1, dt * 5);
}

// Foot target (root frame) for one leg -> written into v; returns swing progress 0..1 (0 in stance).
function footTarget(a, rig, env) {
  const an = a.anim, d = rig.d, plan = a.parts.plan;
  const rx = d.rx, rz = d.rz;
  const ph = (an.phase + legOffset(d, plan.kind, an.g) + 1) % 1;
  let x = 0, lift = 0, swing = 0;
  if (ph < an.beta) x = an.stride * (0.5 - ph / an.beta);
  else { swing = (ph - an.beta) / (1 - an.beta); x = an.stride * (ease(swing) - 0.5); lift = Math.sin(Math.PI * swing) * d.H * (0.22 + 0.15 * an.g); }
  x = x * an.move + (d.front ? 1 : 0.4) * a.pose.lie * d.H * 0.6;
  const air = a.hop > 0.02 || plan.move === 'terbang' || plan.move === 'melayang';
  const gy = air ? -plan.bodyY * (a.hopper ? 1.4 : 0.8) - a.hop / a.scale : groundLocal(a, env, rx + x, rz);
  if (air) x -= d.H * 0.35;
  v.set(rx + x, gy + lift * an.move * (air ? 0 : 1), rz);
  return swing * an.move;
}

export function animateLegs(a, env) {
  const rigs = a.parts.rigs;
  if (!rigs.length) return;
  advance(a, env.dt);
  const body = a.parts.body;
  body.updateMatrix();
  inv.copy(body.matrix).invert();
  for (let i = 0; i < rigs.length; i++) {
    const rig = rigs[i];
    const swing = footTarget(a, rig, env);
    v.applyMatrix4(inv);
    reach(rig, v.x, v.y, v.z, rig.d.gamma - Math.sin(Math.PI * swing) * 0.7);
  }
}

// Body height, bob, slope pitch/roll, gallop rock and banking.
export function animateBody(a, env) {
  const an = a.anim, plan = a.parts.plan, body = a.parts.body, dt = env.dt, k = a.scale;
  let pitch = 0, roll = 0;
  if (env.near && !a.flying) {
    const r = a.root, c = Math.cos(r.rotation.y), s = Math.sin(r.rotation.y), f = plan.len * 0.5 * k, w = plan.rw * 1.5 * k;
    const hF = env.heightFn(r.position.x + c * f, r.position.z - s * f), hB = env.heightFn(r.position.x - c * f, r.position.z + s * f);
    const hL = env.heightFn(r.position.x - s * w, r.position.z - c * w), hR = env.heightFn(r.position.x + s * w, r.position.z + c * w);
    pitch = Math.atan2(hF - hB, 2 * f) * 0.8;
    roll = Math.atan2(hL - hR, 2 * w) * 0.5;
  }
  const bob = plan.kind === 'none' ? 0 : an.move * plan.H * (an.g < 0.5 ? 0.03 * Math.cos(an.phase * TAU * 2) : 0.06 * Math.sin(an.phase * TAU));
  pitch += body.userData.pitch + an.g * an.move * 0.08 * Math.sin(an.phase * TAU + 1) + a.climb;
  roll += a.bank;
  body.rotation.z += (pitch - body.rotation.z) * Math.min(1, dt * 6);
  body.rotation.x += (roll - body.rotation.x) * Math.min(1, dt * 6);
  const lieDrop = a.pose.lie * (plan.bodyY - plan.rh * 0.85);
  body.position.y = plan.bodyY - lieDrop - an.crouch * plan.H * 0.35 + bob;
}
