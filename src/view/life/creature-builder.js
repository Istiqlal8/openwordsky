// Builds a creature template (THREE.Group) from species genes. Clone it per individual.
// Anatomy: lofted torso on a curved spine, neck + hinged head, jointed IK legs, bending tail.
import * as THREE from 'three';
import { makePlan } from './anatomy/plan.js';
import { skinMaterials } from './anatomy/skin.js';
import { torsoGeometry, buildSpine } from './anatomy/torso.js';
import { loft } from './anatomy/geo.js';
import { buildLegs } from './anatomy/legs.js';
import { buildHead } from './creature-head.js';
import { addTail, addWings, addTentacles, decorate } from './creature-extras.js';
import { newBin } from './creature-kit.js';

function neckGeometry(p, len) {
  const n = p.neck, r1 = p.head.hs * 0.5, path = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6, r = n.r0 + (r1 - n.r0) * Math.sqrt(t);
    path.push({ p: [-n.r0 * 0.8 + (len + n.r0 * 0.8) * t, 0, 0], rh: r * 1.05, rw: r * 0.85, dy: -r * 0.12 * (1 - t) });
  }
  return loft(path, 10);
}

// Neck pivot at the chest front with the head at its tip (two for twin-headed species).
function addNecks(body, p, mats) {
  const n = p.g.heads === 2 ? 2 : 1, out = [];
  for (let i = 0; i < n; i++) {
    const z = n === 1 ? 0 : (i ? 1 : -1) * p.rw * 0.4;
    const neck = new THREE.Group();
    neck.position.set(p.neck.x, p.neck.y, z);
    neck.rotation.set(0, n === 1 ? 0 : -z * 0.8, p.neck.angle);
    neck.userData = { tag: 'neck', angle: p.neck.angle, yaw: neck.rotation.y };
    newBin().add(neckGeometry(p, p.neck.len)).bake(neck, mats);
    const head = buildHead(p, newBin, mats);
    head.position.x = p.neck.len;
    head.rotation.z = -p.neck.angle - 0.12;
    head.userData.pitch = head.rotation.z;
    neck.add(head);
    body.add(neck);
    out.push(neck);
  }
  return out;
}

function serpentHead(body, p, mats) {
  const head = buildHead(p, newBin, mats);
  head.position.set(p.rh * 0.35, 0.02, 0);
  head.userData.pitch = 0;
  body.add(head);
}

function buildBody(root, p, mats) {
  const body = new THREE.Group();
  body.position.y = p.bodyY;
  body.rotation.z = p.restPitch;
  body.userData = { tag: 'body', y: p.bodyY, pitch: p.restPitch };
  root.add(body);
  if (p.serpent) {
    buildSpine(body, p, newBin, mats);
    serpentHead(body, p, mats);
    return body;
  }
  const torso = new THREE.Group();
  torso.userData.tag = 'torso';
  const bin = newBin().add(torsoGeometry(p));
  decorate(bin, p);
  bin.bake(torso, mats);
  body.add(torso);
  addNecks(body, p, mats);
  return body;
}

export function buildCreatureTemplate(species) {
  const g = species.genes;
  const p = makePlan(g);
  const mats = skinMaterials(g);
  const root = new THREE.Group();
  const body = buildBody(root, p, mats);
  if (!p.serpent) {
    buildLegs(body, p, newBin, mats);
    addTail(body, p, newBin, mats);
    addTentacles(body, p, newBin, mats);
  }
  addWings(body, p, newBin, mats);
  root.userData.plan = { kind: p.kind, serpent: p.serpent, H: p.H, len: p.len, rh: p.rh, rw: p.rw, bodyY: p.bodyY,
    neckLen: p.neck.len, hs: p.head.hs, move: g.move };
  return { root, materials: Object.values(mats), baseY: p.bodyY };
}

// Collects animated parts of a cloned template (legs/wings/tail kept for older callers).
export function riggedParts(root) {
  const parts = { legs: [], wings: [], tail: null, tails: [], spine: [], necks: [], heads: [], jaws: [], eyes: [],
    tentacles: [], wingTips: [], rigs: [], body: null, torso: null, plan: root.userData.plan };
  const pick = { leg: 'legs', wing: 'wings', wingTip: 'wingTips', tailSeg: 'tails', neck: 'necks',
    head: 'heads', jaw: 'jaws', eyes: 'eyes', tentacle: 'tentacles' };
  root.traverse((o) => {
    const tag = o.userData.tag;
    if (o.userData.spine) parts.spine.push(o);
    if (tag === 'tail') { parts.tail = o; if (!o.userData.spine) parts.tails.unshift(o); }
    else if (tag === 'body' || tag === 'torso') parts[tag] = o;
    else if (pick[tag]) parts[pick[tag]].push(o);
  });
  parts.spine.sort((a, b) => a.userData.i - b.userData.i);
  parts.tails.sort((a, b) => a.userData.i - b.userData.i);
  for (const hip of parts.legs) {
    const knee = hip.children.find((c) => c.userData.tag === 'knee');
    const ankle = knee.children.find((c) => c.userData.tag === 'ankle');
    parts.rigs.push({ hip, knee, ankle, coxa: hip.parent.userData.tag === 'coxa' ? hip.parent : null, d: hip.userData });
  }
  return parts;
}
