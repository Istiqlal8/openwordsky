// Planar two-bone IK for creature legs (rotations about local Z; bones hang along -Y).
const clamp1 = (v) => Math.max(-1, Math.min(1, v));

// Hip and knee angles reaching (tx, ty) relative to the hip. bend +1: joint forward, -1: backward.
export function solve2(L1, L2, tx, ty, bend, out) {
  const d = Math.min((L1 + L2) * 0.999, Math.max(Math.abs(L1 - L2) + 1e-3, Math.hypot(tx, ty)));
  const base = Math.atan2(tx, -ty);
  const a = Math.acos(clamp1((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const k = Math.acos(clamp1((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2)));
  out.hip = base + bend * a;
  out.knee = -bend * (Math.PI - k);
  return out;
}

const sol = { hip: 0, knee: 0 };

// Poses a leg rig so its foot lands on (fx, fy, fz), given in the hip's parent frame.
// gamma = world-ish angle of the last segment (0 = vertical, + = foot ahead of ankle).
export function reach(rig, fx, fy, fz, gamma) {
  const d = rig.d;
  let tx = fx - d.x;
  const ty = fy - d.y;
  if (d.insect) {
    const dz = fz - d.z;
    rig.coxa.rotation.y = Math.atan2(-dz, tx);
    tx = Math.hypot(tx, dz);
  }
  solve2(d.L1, d.L2, tx - d.l3 * Math.sin(gamma), ty + d.l3 * Math.cos(gamma), d.bend, sol);
  rig.hip.rotation.z = sol.hip;
  rig.knee.rotation.z = sol.knee;
  rig.ankle.rotation.z = gamma - sol.hip - sol.knee;
}
