// Classifies the bones of an auto-rigged (tripo) model into legs, tail, neck, spine and wings.
// Bone names from the rigger are unreliable (e.g. the whale's "Head" sits in its tail), so roles
// are found from rest positions in normalized model space: +X forward, +Y up, +Z right, height 1.
import * as THREE from 'three';

const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const MAX_CHAIN = 6;

function collect(root) {
  const bones = [], pos = new Map(), kids = new Map();
  root.traverse((o) => { if (o.isBone) bones.push(o); });
  for (const b of bones) {
    pos.set(b, b.getWorldPosition(new THREE.Vector3()));
    kids.set(b, b.children.filter((c) => c.isBone));
  }
  return { bones, pos, kids, leaves: bones.filter((b) => kids.get(b).length === 0) };
}

// Bones from just below `stop` down to `leaf` (top first). Stops at any bone in `stop`.
function pathUp(leaf, stop) {
  const out = [];
  for (let b = leaf; b?.isBone && !stop.has(b); b = b.parent) out.unshift(b);
  return out;
}

// Bone whose rest height is closest to the middle of the chain (the knee/elbow).
function midBone(chain, pos) {
  const top = pos.get(chain[0]).y, bottom = pos.get(chain.at(-1)).y, mid = (top + bottom) / 2;
  let best = chain[1] ?? chain[0];
  for (const b of chain.slice(1, -1)) if (Math.abs(pos.get(b).y - mid) < Math.abs(pos.get(best).y - mid)) best = b;
  return best;
}

// Feet: bones owning ground-level vertices, each with the mean position of those vertices.
function footBones(mesh) {
  const skin = mesh.geometry.attributes.skinIndex, w = mesh.geometry.attributes.skinWeight;
  const v = new THREE.Vector3(), acc = new Map();
  for (let i = 0; i < skin.count; i++) {
    mesh.getVertexPosition(i, v).applyMatrix4(mesh.matrixWorld);
    if (v.y > 0.05) continue;
    let k = 0;
    for (let j = 1; j < 4; j++) if (w.getComponent(i, j) > w.getComponent(i, k)) k = j;
    const bone = mesh.skeleton.bones[skin.getComponent(i, k)];
    const a = acc.get(bone) ?? acc.set(bone, { bone, at: new THREE.Vector3(), n: 0 }).get(bone);
    a.at.add(v); a.n++;
  }
  const low = (b) => b.getWorldPosition(v).y < 0.5;
  return [...acc.values()].filter((a) => a.n >= 6 && low(a.bone)).map((a) => ({ bone: a.bone, at: a.at.divideScalar(a.n) }));
}

// Groups foot bones that stand close together into one foot each.
function clusterFeet(feet) {
  const clusters = [];
  for (const f of feet) {
    const related = (k) => k.bones.some((b) => isAncestor(b, f.bone) || isAncestor(f.bone, b));
    const c = clusters.find(related) ?? clusters.find((k) => k.at.distanceTo(f.at) < 0.12);
    if (c) c.bones.push(f.bone); else clusters.push({ at: f.at.clone(), bones: [f.bone] });
  }
  return clusters;
}

const ancestors = (b) => { const out = []; for (let o = b; o?.isBone; o = o.parent) out.push(o); return out; };

// Leg root: highest ancestor of the foot that does not also carry another foot.
function legChain(cluster, others) {
  const foot = cluster.bones.reduce((a, b) => (ancestors(b).length > ancestors(a).length ? b : a));
  const foreign = new Set(others.flatMap((c) => c.bones.flatMap(ancestors)));
  const chain = ancestors(foot).filter((b) => !foreign.has(b)).reverse();
  return chain.length ? chain : [foot];
}

// Legs from the skinned vertices touching the ground (bone names are unreliable).
function findLegs(mesh, pos, tailTip) {
  const tail = new Set(tailTip ? ancestors(tailTip).slice(0, -1) : []);
  const clusters = clusterFeet(footBones(mesh)).filter((c) => !c.bones.some((b) => tail.has(b)));
  const legs = clusters.map((c) => {
    const bones = legChain(c, clusters.filter((o) => o !== c));
    return { bones, hip: bones[0], knee: bones.length > 1 ? midBone(bones, pos) : null, side: Math.sign(c.at.z) || 1, x: c.at.x };
  });
  const meanX = legs.reduce((s, l) => s + l.x, 0) / Math.max(1, legs.length);
  for (const l of legs) l.front = legs.length > 2 && l.x > meanX;
  return legs;
}

// Lowest common ancestor of the given bones (the pelvis / body root).
function commonAncestor(list, fallback) {
  if (!list.length) return fallback;
  const chainOf = (b) => { const c = []; for (let o = b; o?.isBone; o = o.parent) c.unshift(o); return c; };
  const chains = list.map(chainOf);
  let lca = fallback;
  for (let i = 0; chains.every((c) => c[i] && c[i] === chains[0][i]); i++) lca = chains[0][i];
  return lca;
}

function extremeLeaf(leaves, pos, score, used) {
  let best = null;
  for (const b of leaves) if (!used.has(b) && (!best || score(pos.get(b)) > score(pos.get(best)))) best = b;
  return best;
}

function findWings(info, used, stop) {
  const { pos, leaves } = info;
  const wings = [];
  for (const side of [-1, 1]) {
    const tip = extremeLeaf(leaves, pos, (p) => p.z * side, used);
    if (!tip || pos.get(tip).z * side < 0.12) continue;
    const path = pathUp(tip, stop);
    let i = path.findIndex((b) => pos.get(b).z * side > 0.04);
    if (i < 0 || i === path.length - 1) i = Math.max(0, path.length - 2);
    wings.push({ bones: path.slice(i), side });
  }
  return wings;
}

// Parent-local copies of the model axes, so a bone can be turned about a model-space axis.
function boneAxes(bones) {
  const axes = {};
  const inv = new THREE.Quaternion();
  for (const b of bones) {
    if (!b || axes[b.name]) continue;
    b.parent.getWorldQuaternion(inv).invert();
    axes[b.name] = { q0: b.quaternion.clone(), x: X.clone().applyQuaternion(inv),
      y: Y.clone().applyQuaternion(inv), z: Z.clone().applyQuaternion(inv) };
  }
  return axes;
}

function isAncestor(a, b) {
  for (let o = b.parent; o; o = o.parent) if (o === a) return true;
  return false;
}

// A chain that runs back more than it drops (a tail on the ground, not a hind foot).
function tailLike(leaf, pos) {
  let top = leaf;
  while (top.parent?.isBone && top.parent.children.filter((c) => c.isBone).length === 1) top = top.parent;
  const a = pos.get(top), b = pos.get(leaf);
  return Math.abs(a.x - b.x) > a.y - b.y;
}

function capped(chain) { return chain.slice(-MAX_CHAIN); }

// Every leaf chain hanging off the body, uncapped. A kraken is nothing but arms: classifying two of
// them as flippers and one as a tail leaves the other six locked solid, which is what this avoids.
function findArms(info, stop) {
  const arms = [], used = new Set();
  for (const leaf of info.leaves) {
    const chain = pathUp(leaf, stop).filter((b) => !used.has(b));
    if (chain.length < 3) continue;
    chain.forEach((b) => used.add(b));
    const at = info.pos.get(leaf);
    arms.push({ bones: chain, side: Math.sign(at.z) || 1 });
  }
  return arms;
}

// Tentacled swimmers: the root is the mantle and everything below it is an arm. No legs to find,
// no head to pick out — the rigger's own hierarchy already says which bones belong to which arm.
function tentacleProfile(rig, info) {
  const body = info.bones[0];
  const arms = findArms(info, new Set([body]));
  return {
    rig, body: body.name, tail: [], neck: [], spine: [], legs: [], wings: [],
    arms: arms.map((a) => ({ bones: a.bones.map((b) => b.name), side: a.side })),
    axes: boneAxes([...arms.flatMap((a) => a.bones), body]),
  };
}

export function buildRigProfile(root, rig, mesh) {
  root.updateMatrixWorld(true);
  const info = collect(root);
  if (rig === 'tentacle') return tentacleProfile(rig, info);
  const rearmost = extremeLeaf(info.leaves, info.pos, (p) => -p.x, new Set());
  const legs = rig === 'whale' ? [] : findLegs(mesh, info.pos, tailLike(rearmost, info.pos) ? rearmost : null);
  const body = commonAncestor(legs.map((l) => l.hip), info.bones[0]);
  const stop = new Set([body, ...legs.flatMap((l) => l.bones)]);
  for (let b = body; b?.isBone; b = b.parent) stop.add(b);
  const used = new Set(legs.flatMap((l) => l.bones));
  const headLeaf = extremeLeaf(info.leaves, info.pos, (p) => p.x + p.y * 0.3, used);
  const neckFull = headLeaf ? pathUp(headLeaf, stop) : [];
  const tailLeaf = extremeLeaf(info.leaves, info.pos, (p) => -p.x, new Set([...used, headLeaf]));
  const tail = tailLeaf && info.pos.get(tailLeaf).x < -0.15 ? capped(pathUp(tailLeaf, stop)) : [];
  [...neckFull, ...tail].forEach((b) => used.add(b));
  const wings = rig === 'bird' || rig === 'whale' ? findWings(info, used, stop) : [];
  const trunk = neckFull.filter((b) => !wings.some((w) => w.bones.includes(b)));
  const cut = trunk.findLastIndex((b) => legs.some((l) => isAncestor(b, l.hip)));
  const neck = capped(trunk.slice(cut + 1));
  const spine = trunk.slice(0, cut + 1).slice(-4);
  const all = [...legs.flatMap((l) => l.bones), ...tail, ...neck, ...spine, ...wings.flatMap((w) => w.bones), body];
  const names = (list) => list.map((b) => b.name);
  return {
    rig, body: body.name, tail: names(tail), neck: names(neck), spine: names(spine), arms: [],
    legs: legs.map((l) => ({ bones: names(l.bones), hip: l.hip.name, knee: l.knee?.name ?? null, side: l.side, front: l.front })),
    wings: wings.map((w) => ({ bones: names(w.bones), side: w.side })),
    axes: boneAxes(all),
  };
}
