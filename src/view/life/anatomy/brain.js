// Creature behaviour: temperament-driven reactions (flee / approach / charge), herd routine
// (wander, graze, drink, rest, follow the leader), predators stalking prey. Sets a.dest, a.want, a.goal.
import { actors } from '../../../life-sim/actors.js';

const TEMPER = {
  Jinak: { flee: 5, shy: 1 }, Penakut: { flee: 24, shy: 1 }, Pemalu: { flee: 16, shy: 1 }, Gelisah: { flee: 11, shy: 1 },
  Penasaran: { curious: 18, shy: 1 }, 'Suka bermain': { curious: 14, shy: 1 }, Tenang: {}, Agresif: {}, Pemangsa: {}, Teritorial: {},
};
const CARNI = ['Karnivora', 'Omnivora', 'Pemakan bangkai'];
const LOOK = 15;
const VEER = [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8];

export const temper = (sp) => TEMPER[sp.lore.temperament] ?? {};
export const isPredator = (sp) => sp.lore.temperament === 'Pemangsa' || (sp.lore.temperament === 'Agresif' && CARNI.includes(sp.lore.diet));

const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function setGoal(a, head, lie, mouth, alert, sleep = false) {
  const g = a.goal;
  g.head = head; g.lie = lie; g.mouth = mouth; g.alert = alert; g.sleep = sleep;
}

// Runs away from a.threat (veering around water); flyers also climb.
function flee(h, a) {
  const base = Math.atan2(a.pos.z - a.threat.z, a.pos.x - a.threat.x);
  for (const off of VEER) {
    const ang = base + off, x = a.pos.x + Math.cos(ang) * 25, z = a.pos.z + Math.sin(ang) * 25;
    a.dest.set(x, 0, z);
    if (a.flying || h.dry(a.pos.x + Math.cos(ang) * 4, a.pos.z + Math.sin(ang) * 4)) break;
  }
  a.want = a.runSpeed;
  a.state = 'flee';
  setGoal(a, 0, 0, 0.1, 1);
}

export function scare(a, from, seconds) {
  if (a.hostile && !temper(a.sp).shy) return;
  a.fleeT = Math.max(a.fleeT, seconds);
  a.threat.set(from.x, 0, from.z);
}

// Herd mates close by catch the panic.
function alarm(h, a, from) {
  for (const b of h.animals) if (b !== a && b.sp === a.sp && dist2(a.pos, b.pos) < 18) scare(b, from, 2 + b.anim.seed % 2);
}

// Existing hostile behaviour: charge the player and bite (calm grace period respected).
function chasePlayer(h, a, player, dp, dt) {
  const range = a.sp.lore.temperament === 'Teritorial' ? 9 : 20;
  if (!a.hostile || h.calm > 0 || dp > range) return false;
  a.dest.set(player.x, 0, player.z);
  a.want = a.runSpeed;
  a.state = 'chase';
  setGoal(a, 0, 0, 0.6, 1);
  a.biteCd -= dt;
  if (dp < 2.2 + a.sp.genes.size && a.biteCd <= 0) {
    a.biteCd = 1.4;
    a.goal.mouth = 1;
    h.onBite?.(a.sp, 3 + a.sp.genes.size * 3);
  }
  return true;
}

function pickPrey(h, a) {
  let best = null, bd = 40;
  for (const b of h.animals) {
    if (b.dead || b.owner || b.sp === a.sp || b.flying || b.sp.genes.size > a.sp.genes.size * 1.7 || isPredator(b.sp)) continue;
    const d = dist2(a.pos, b.pos);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

// Predators stalk (slow, head low) then sprint; prey near a hunter flees.
function hunt(h, a, dt) {
  if (!a.predator || a.flying) return false;
  if (a.eatT > 0) return feed(a, dt);
  a.hunger -= dt;
  if (!a.prey && a.hunger <= 0) { a.prey = pickPrey(h, a); a.huntT = 0; a.hunger = 8; }
  const prey = a.prey;
  if (!prey) return false;
  a.huntT += dt;
  const d = dist2(a.pos, prey.pos);
  if (!h.animals.includes(prey) || d > 60 || a.huntT > 14) { a.prey = null; return false; }
  const sprint = d < 11 || (prey.fleeing && d < 25);
  a.dest.set(prey.pos.x, 0, prey.pos.z);
  a.want = sprint ? a.runSpeed * 1.05 : a.walkSpeed * 0.7;
  a.state = sprint ? 'hunt' : 'stalk';
  setGoal(a, sprint ? 0 : 0.35, 0, sprint ? 0.5 : 0, 1);
  a.looking = true;
  a.lookAt.copy(prey.pos);
  if (d < 13) scare(prey, a.pos, 2);
  if (d < 1.2 + a.scale) catchPrey(h, a, prey);
  return true;
}

// The catch: the prey collapses and the predator eats over it for a while.
function catchPrey(h, a, prey) {
  h.killPrey?.(prey);
  a.prey = null;
  a.hunger = 30;
  a.eatT = 9;
  a.eatAt = prey.pos.clone();
}

function feed(a, dt) {
  a.eatT -= dt;
  a.state = 'graze';           // head-down chewing pose
  a.dest.copy(a.pos);
  a.want = 0;
  setGoal(a, 1, 0, Math.sin(a.eatT * 9) > 0 ? 1 : 0.2, 0); // jaw works while feeding
  a.looking = true;
  a.lookAt.copy(a.eatAt);
  return true;
}

function approach(a, player, dp) {
  const t = temper(a.sp);
  if (!t.curious || dp > t.curious || a.fleeT > 0) return false;
  a.state = 'approach';
  a.dest.set(player.x, 0, player.z);
  a.want = dp > 5 ? a.walkSpeed : 0;
  setGoal(a, 0, 0, 0, 1);
  return true;
}

// Hurt by an NPC's blaster: back off for a while and drop the NPC target.
export function retreat(a, from) {
  if (a.npc) actors.release(a);
  a.npc = null;
  a.npcScan = 30;
  a.fleeT = Math.max(a.fleeT, 5);
  a.threat.set(from.x, 0, from.z);
}

// Hunters sometimes go for a villager / explorer instead (the actors director rations this).
function huntNpc(h, a, dt) {
  if (!(a.predator || a.hostile) || a.flying || h.calm > 0 || a.fleeT > 0) return false;
  if (!a.npc) {
    if ((a.npcScan = (a.npcScan ?? a.anim.seed % 5) - dt) > 0) return false;
    a.npcScan = 2.5;
    a.npc = actors.claim(a, a.pos, a.predator ? 38 : 20);
    if (!a.npc) return false;
    a.att ??= { group: h, ref: a, name: a.sp.name, pos: a.pos };
  }
  const t = a.npc, d = dist2(a.pos, t.pos);
  if (!actors.holds(a, t) || d > 70) { actors.release(a); a.npc = null; a.npcScan = 25; return false; }
  a.dest.set(t.pos.x, 0, t.pos.z);
  a.want = d < 3 ? a.walkSpeed * 0.5 : a.runSpeed;
  a.state = 'chase';
  setGoal(a, 0, 0, 0.6, 1);
  a.looking = true;
  a.lookAt.set(t.pos.x, 0, t.pos.z);
  a.biteCd -= dt;
  if (d < 1.4 + a.scale * 0.7 + t.radius && a.biteCd <= 0) {
    a.biteCd = 1.6;
    a.goal.mouth = 1;
    actors.bite(a.att, t, 5 + a.sp.genes.size * 4);
  }
  return true;
}

// React to the player / predators first; returns true when a reaction took over.
function react(h, a, player, dp, dt) {
  if (chasePlayer(h, a, player, dp, dt)) return true;
  if (huntNpc(h, a, dt)) return true;
  const t = temper(a.sp), wary = (t.flee ?? 0) * (a.sp.genes.size > 2 ? 0.7 : 1);
  if (wary && dp < wary && a.fleeT <= 0) { scare(a, player, 3); alarm(h, a, player); }
  if (a.fleeT > 0) { flee(h, a); return true; }
  return hunt(h, a, dt) || approach(a, player, dp);
}

function pickRoutine(h, a) {
  const r = h.rng.next(), water = h.hasWater && !a.flying;
  const lead = a.leader && dist2(a.pos, a.leader.pos) > 10 + a.scale * 3;
  a.stateT = h.rng.range(4, 10);
  if (lead) return goFollow(a);
  if (a.flying) return goWander(h, a, 30);
  if (r < 0.3) return goWander(h, a, 14);
  if (r < 0.58) { a.state = 'graze'; a.stateT += 4; return; }
  if (r < 0.7) { a.state = 'idle'; return; }
  if (r < 0.8) { a.state = 'rest'; a.stateT = h.rng.range(10, 22); return; }
  if (water && r < 0.93 && h.shore(a)) { a.state = 'toWater'; a.stateT = 20; return; }
  goWander(h, a, 10);
}

function goWander(h, a, r) {
  const base = a.leader && !a.flying ? a.leader.pos : a.pos;
  for (let i = 0; i < 6; i++) {
    const ang = h.rng.range(0, Math.PI * 2), rr = h.rng.range(r * 0.4, r);
    a.dest.set(base.x + Math.cos(ang) * rr, 0, base.z + Math.sin(ang) * rr);
    if (a.flying || h.dry(a.dest.x, a.dest.z)) break;
  }
  a.state = 'wander';
}

function goFollow(a) {
  a.state = 'follow';
  a.dest.set(a.leader.pos.x + (a.anim.seed % 7) - 3, 0, a.leader.pos.z + ((a.anim.seed >> 3) % 7) - 3);
}

// Per-state speed + pose for the calm routine.
function routine(h, a) {
  const d = dist2(a.pos, a.dest), s = a.state;
  if (a.stateT <= 0 || ((s === 'wander' || s === 'follow') && d < 1.5)) pickRoutine(h, a);
  a.want = 0;
  if (a.state === 'wander') { a.want = a.walkSpeed; setGoal(a, 0, 0, 0, 0); }
  else if (a.state === 'follow') { a.want = a.walkSpeed * (d > 6 ? 1.5 : 1); setGoal(a, 0, 0, 0, 0); }
  else if (a.state === 'toWater') { a.want = d > 1 ? a.walkSpeed : 0; setGoal(a, d > 1 ? 0 : 1, 0, 0, 0); }
  else if (a.state === 'graze') { a.want = a.walkSpeed * 0.15 * (Math.sin(a.anim.breath * 0.2) > 0.6 ? 1 : 0); setGoal(a, 1, 0, 0, 0); }
  else if (a.state === 'rest') setGoal(a, 0.3, a.flying ? 0 : 1, 0, 0, a.stateT < 12);
  else setGoal(a, 0, 0, 0, 0.2);
  if (a.state === 'graze' && d < 1) a.dest.set(a.pos.x + Math.cos(a.root.rotation.y) * 3, 0, a.pos.z - Math.sin(a.root.rotation.y) * 3);
}

export function think(h, a, player, dt) {
  a.stateT -= dt;
  a.fleeT -= dt;
  const dp = dist2(a.pos, player);
  a.looking = false;
  if (!react(h, a, player, dp, dt)) routine(h, a);
  a.fleeing = a.state === 'flee';
  if (!a.looking && dp < LOOK && !a.fleeing && !a.goal.sleep) { a.looking = true; a.lookAt.set(player.x, 0, player.z); }
}
