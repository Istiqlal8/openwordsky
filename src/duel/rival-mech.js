// Builds the rival's frame. A rival is an ordinary mech (src/mech/mech-model.js) grown from a
// fixed ship seed and repainted in the rival's colours, so both duellists are the same kind of
// machine — the player's own transformation logic and this one share every part.
import * as THREE from 'three';
import { shipDesign } from '../view/ship/ship-design.js';
import { mechDesign } from '../mech/mech-design.js';
import { buildMech } from '../mech/mech-model.js';

export function buildRival(def) {
  const base = shipDesign(def.seed);
  const m = mechDesign({ ...base, cls: def.cls, name: def.name, palette: { ...base.palette, ...def.palette } });
  m.label = def.short;
  const mech = buildMech(m);
  mech.setDeploy(1);
  mech.setThrust(0);
  return mech;
}

export function disposeRival(mech) {
  mech.group.removeFromParent();
  mech.dispose();
}

// The guard bubble: visible proof that shots are being soaked right now.
export function buildGuard(parent, color, radius) {
  const geo = new THREE.SphereGeometry(radius, 16, 12);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  parent.add(mesh);
  return {
    mesh,
    set(on) { mesh.visible = on; },
    dispose() { mesh.removeFromParent(); geo.dispose(); mat.dispose(); },
  };
}

// Yaw that points the frame's own forward (-Z, the same way the player's mech faces) at (dx, dz).
export const yawToward = (dx, dz) => Math.atan2(-dx, -dz);

// Shortest signed angle from a to b.
export function angleGap(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// The guard window both duel halves share: a few seconds of soaked damage, then a long opening.
export class GuardCycle {
  constructor({ gap, time, soak }) {
    this.gap = gap;
    this.time = time;
    this.soak = soak;
    this.on = false;
    this.t = gap;
  }

  // Returns true on the frame the guard switches, so the caller can show it and say so.
  update(dt, allowed = true) {
    if (!allowed) { const was = this.on; this.on = false; this.t = this.gap; return was; }
    this.t -= dt;
    if (this.t > 0) return false;
    this.on = !this.on;
    this.t = this.on ? this.time : this.gap;
    return true;
  }

  // Damage that actually lands through the guard.
  soaked(damage) { return this.on ? damage * (1 - this.soak) : damage; }
}
