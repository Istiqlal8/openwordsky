// Shared registry of NPC "actors" (villagers, explorers, colonists) that animals can target,
// plus the attack director that keeps animal-vs-NPC fights occasional instead of constant.
// Actor contract: { pos: {x,y,z} feet, radius, hp, maxHp, faction, armed, down, active,
//                   hunter: animal ref | null, bitten(dmg, attacker) }
// Attacker record: { group, ref, name, pos } (group = a Wildlife group, ref = its animal record).
import * as THREE from 'three';

const MAX_FIGHTS = 2;           // animal attacks on NPCs running at the same time
const GAP = [18, 40];           // seconds between attack episodes (planet-wide)
const FIGHT_TIME = 25;          // an episode gives up after this long
const HELP_RANGE = 28;          // armed NPCs this close join the fight
const HELPERS = 2;              // at most this many of them

const _v = new THREE.Vector3();
const rand = (a, b) => a + Math.random() * (b - a);

class ActorRegistry {
  constructor() {
    this.list = [];
    this.fights = [];
    this.wildlife = null; // current Wildlife (set by Wildlife)
    this.fx = null;       // FxSystem of the surface scene
    this.bolts = null;    // Bolts pool (life-sim/bolts.js)
    this.sites = [];      // settlement discs [{ x, z, r }] (set by Settlements)
    this.gap = rand(6, 14);
    this.clock = 0;       // seconds of simulated surface time
    this.tame = true;     // false = animals may attack NPCs at once (tests)
  }

  register(a) { if (!this.list.includes(a)) this.list.push(a); return a; }

  unregister(a) {
    const i = this.list.indexOf(a);
    if (i >= 0) this.list.splice(i, 1);
    this.fights = this.fights.filter((f) => f.npc !== a);
  }

  // A hunting animal asks for an NPC target within range; null unless the director allows one.
  claim(ref, pos, range) {
    if (this.fights.length >= MAX_FIGHTS || (this.tame && this.gap > 0)) return null;
    let best = null, bd = range * range;
    for (const a of this.list) {
      if (!a.active || a.down || a.hunter || a.hidden) continue;
      const dx = a.pos.x - pos.x, dz = a.pos.z - pos.z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = a; }
    }
    if (!best) return null;
    best.hunter = ref;
    this.fights.push({ npc: best, ref, t: 0 });
    return best;
  }

  // Still this animal's target? (false once the NPC is down, hidden or the fight timed out)
  holds(ref, npc) { return npc.hunter === ref && !npc.down && !npc.hidden && npc.active; }

  release(ref) {
    for (const f of this.fights) if (f.ref === ref) this.end(f);
  }

  end(f) {
    if (f.npc.hunter === f.ref) f.npc.hunter = null;
    f.done = true;
    this.gap = rand(...GAP);
  }

  // An animal bites an NPC: blood sparks, the NPC reacts, armed neighbours come to help.
  bite(att, npc, dmg) {
    const p = npc.pos;
    this.fx?.sparks(_v.set(p.x, p.y + 1.1, p.z), 0xd8322a, 8, 0.6);
    npc.bitten(dmg, att);
    let n = this.list.filter((a) => a.target === att).length;
    for (const a of this.list) {
      if (n >= HELPERS + 1) break;
      if (a === npc || !a.armed || a.down || !a.active || a.target) continue;
      if (Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < HELP_RANGE) { a.help?.(att); n++; }
    }
  }

  update(dt) {
    this.clock += dt;
    this.gap -= dt;
    for (const f of this.fights) {
      f.t += dt;
      const r = f.ref, gone = r.dead || (r.hp ?? 1) <= 0 || !r.root?.parent;
      if (!f.done && (gone || f.t > FIGHT_TIME || f.npc.down || f.npc.hunter !== r)) this.end(f);
    }
    if (this.fights.some((f) => f.done)) this.fights = this.fights.filter((f) => !f.done);
  }

  // Wildlife is gone (planet left): drop every fight.
  reset() {
    for (const f of this.fights) if (f.npc.hunter === f.ref) f.npc.hunter = null;
    this.fights = [];
    this.gap = rand(6, 14);
  }
}

export const actors = new ActorRegistry();

// Is an animal record still alive and in its group?
export const aliveRef = (r) => Boolean(r) && !r.dead && (r.hp ?? 1) > 0 && Boolean(r.root?.parent);
