// Maps the auto-rigged Gundam GLB onto the mech's own joints. The rigger's bone names are
// meaningless (`tripo::0_Right_Limb_4`, `bone_17`, and `tripo::Spine_0` sits on a shoulder pad),
// so every role is derived from the skeleton's shape: which child chain climbs and which drops,
// which joint forks into fingers, and the sign of a bone's rest position across the body.
//
// mapMechRig() runs on the raw file. measureRig() runs again once the model has been normalized
// to mech space (forward -Z, up +Y, right +X, height 1, feet at y = 0) and reads the proportions
// the mech design is then fitted to.
import * as THREE from 'three';

const kidsOf = (b) => b.children.filter((c) => c.isBone);

function worldMap(root) {
  const pos = new Map();
  root.traverse((o) => { if (o.isBone) pos.set(o, o.getWorldPosition(new THREE.Vector3())); });
  return pos;
}

// Deepest chain below `b`: at every fork it follows the branch with the most joints, which is the
// limb itself rather than a shoulder pad or a finger stub.
function longestPath(b) {
  let best = null;
  for (const k of kidsOf(b)) {
    const p = longestPath(k);
    if (!best || p.length > best.length) best = p;
  }
  return best ? [b, ...best] : [b];
}

function subtree(b, out = []) {
  out.push(b);
  for (const k of kidsOf(b)) subtree(k, out);
  return out;
}

const topOf = (b, pos) => subtree(b).reduce((a, c) => Math.max(a, pos.get(c).y), -Infinity);
const lineage = (b) => { const out = []; for (let o = b; o?.isBone; o = o.parent) out.unshift(o); return out; };

// Deepest shared ancestor of two bones: for the two hands, that is the chest.
function commonAncestor(a, b) {
  const p = lineage(a), q = lineage(b);
  let best = p[0];
  for (let i = 0; p[i] && p[i] === q[i]; i++) best = p[i];
  return best;
}

// Shoulder -> elbow -> hand: the hand is the joint that forks into fingers; failing that the
// second-to-last joint of the chain, so a fingertip is never mistaken for the grip.
function armChain(rootBone) {
  const path = longestPath(rootBone);
  let hand = path.findLast((b) => kidsOf(b).length > 1);
  if (!hand || path.indexOf(hand) < 2) hand = path[Math.max(1, path.length - 2)];
  const i = path.indexOf(hand);
  const upper = path[Math.max(0, i - 2)], fore = path[i - 1] ?? upper;
  return { clav: path[Math.max(0, i - 3)] ?? upper, upper, fore, hand,
    pad: kidsOf(upper).find((b) => b !== fore) ?? null, tip: longestPath(hand).at(-1) };
}

// Hip -> knee -> ankle. One of this model's legs stops at the knee, so ankle may be null.
function legChain(hip) {
  const path = longestPath(hip);
  return { hip, knee: path[1] ?? null, ankle: path[2] ?? null };
}

// Anatomy decides which way the model faces: knees bow forward, elbows fold backward.
function facingYaw(legs, arms, pos, fwd) {
  let vote = 0;
  for (const l of legs) {
    if (!l.ankle) continue;
    vote += pos.get(l.knee)[fwd] - (pos.get(l.hip)[fwd] + pos.get(l.ankle)[fwd]) / 2;
  }
  for (const a of arms) vote += (pos.get(a.upper)[fwd] + pos.get(a.hand)[fwd]) / 2 - pos.get(a.fore)[fwd];
  const f = new THREE.Vector3();
  f[fwd] = vote >= 0 ? 1 : -1;
  return -Math.atan2(-f.x, -f.z);   // the turn that puts `f` onto the mech's forward, -Z
}

// -> { yaw, parts } for a freshly loaded gltf scene. `parts` holds bone references, still unsided.
export function mapMechRig(scene) {
  scene.updateMatrixWorld(true);
  const pos = worldMap(scene);
  const rootBone = [...pos.keys()].find((b) => !b.parent?.isBone);
  const kids = kidsOf(rootBone);
  const spineRoot = kids.reduce((a, b) => (topOf(b, pos) > topOf(a, pos) ? b : a));
  const legs = kids.filter((b) => b !== spineRoot).map(legChain);
  const hipGap = pos.get(legs[0].hip).clone().sub(pos.get(legs.at(-1).hip));
  const side = Math.abs(hipGap.x) > Math.abs(hipGap.z) ? 'x' : 'z';  // the axis the hips straddle
  const body = subtree(spineRoot);
  const tips = reachTips(body, pos, side, pos.get(rootBone)[side]);
  const chest = commonAncestor(tips[0], tips[1]);
  const spine = lineage(chest).slice(lineage(spineRoot).length - 1, -1);
  const arms = tips.map((t) => armChain(lineage(t)[lineage(chest).length]));
  const used = new Set([...spine, chest, ...arms.flatMap((a) => subtree(a.clav))]);
  const flat = (b) => Math.hypot(pos.get(b).x - pos.get(chest).x, pos.get(b).z - pos.get(chest).z);
  const head = kidsOf(chest).filter((b) => !used.has(b)).sort((a, b) => flat(a) - flat(b))[0] ?? null;
  if (head) subtree(head).forEach((b) => used.add(b));
  const crest = body.filter((b) => !used.has(b) && pos.get(b).y > pos.get(chest).y);
  return { yaw: facingYaw(legs, arms, pos, side === 'x' ? 'z' : 'x'),
    parts: { root: rootBone, spine, chest, head, crest, arms, legs } };
}

// The two joints that reach furthest out to either side of the body: the fingertips of each arm.
function reachTips(body, pos, side, mid) {
  const out = (b) => pos.get(b)[side] - mid;
  const pick = (sign) => body.reduce((a, b) => (out(b) * sign > out(a) * sign ? b : a));
  return [pick(-1), pick(1)];
}

// Sorts limbs left (index 0, -x) / right (index 1, +x) and reads the proportions, all in the
// normalized mech frame. Every measurement is a fraction of the model's height.
export function measureRig(parts, root) {
  root.updateMatrixWorld(true);
  const pos = worldMap(root);
  const at = (b) => pos.get(b);
  const byX = (list, key) => [...list].sort((a, b) => at(a[key]).x - at(b[key]).x);
  const arms = byX(parts.arms, 'upper'), legs = byX(parts.legs, 'hip');
  const len = (a, b) => (a && b ? at(a).distanceTo(at(b)) : 0);
  const legged = legs.find((l) => l.ankle) ?? legs[0];
  const mean = (f) => (f(arms[0]) + f(arms[1])) / 2;
  const metrics = {
    hipY: (at(legs[0].hip).y + at(legs[1].hip).y) / 2,
    thighL: len(legged.hip, legged.knee),
    shinL: len(legged.knee, legged.ankle) || len(legged.hip, legged.knee),
    footH: legged.ankle ? at(legged.ankle).y : 0.05,
    shoulderX: mean((a) => Math.abs(at(a.upper).x)),
    shoulderY: mean((a) => at(a.upper).y),
    upperL: mean((a) => len(a.upper, a.fore)),
    foreL: mean((a) => len(a.fore, a.hand)),
    handL: mean((a) => len(a.hand, a.tip)) || 0.05,
    headY: parts.head ? at(parts.head).y : 0.9,
    chestY: at(parts.chest).y,
  };
  return { ...parts, arms, legs, metrics };
}
