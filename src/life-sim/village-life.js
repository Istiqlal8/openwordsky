// Social life of one settlement: pairs up chatting residents, runs the children's tag game,
// assigns riders (loop around the village or a trip to the next settlement) and herders.
import { actors } from './actors.js';
import { Rider, Herder } from './riders.js';

const TRIP_MAX = 1700; // ride to another settlement at most this far away

export class VillageLife {
  // q: Settlement (site, layout, villagers, ctx)
  constructor(q) {
    this.q = q;
    this.site = q.site;
    this.patrolR = Math.max(8, q.site.r * 0.55);
    this.pairs = [];
    this.riders = new Map();
    this.herders = new Map();
    this.kids = q.villagers.filter((v) => v.mode === 'play');
    this.game = this.kids.length >= 2 ? { it: this.kids[0], freeze: 0 } : null;
    this.pairUp(q.villagers.filter((v) => v.mode === 'chat'));
    this.assignAnimals(q.villagers);
  }

  pairUp(chatters) {
    for (let i = 0; i + 1 < chatters.length; i += 2) {
      const p = { a: chatters[i], b: chatters[i + 1], t: 0, dur: 0, spot: { x: 0, z: 0 }, dx: 1, dz: 0 };
      this.moveChat(p);
      p.a.pair = p.b.pair = p;
      this.pairs.push(p);
    }
    if (chatters.length % 2) chatters.at(-1).mode = 'walk';
  }

  // A new meeting spot on the square or by a door, with the two facing along a random axis.
  moveChat(p) {
    const r = this.q.ctx.rand, spots = this.q.ctx.spots, hub = this.q.ctx.hub;
    const base = r() < 0.5 ? hub : spots[Math.floor(r() * spots.length)];
    const a = r() * Math.PI * 2, off = base === hub ? 2 + r() * (this.patrolR - 3) : 2.5;
    p.spot.x = base.x + Math.cos(a) * off;
    p.spot.z = base.z + Math.sin(a) * off;
    const b = r() * Math.PI;
    p.dx = Math.cos(b); p.dz = Math.sin(b);
    p.t = 0;
    p.dur = 25 + r() * 30;
  }

  assignAnimals(villagers) {
    const s = this.site, others = actors.sites.filter((o) => o.x !== s.x || o.z !== s.z);
    let n = 0;
    for (const v of villagers) {
      if (v.mode === 'ride') this.riders.set(v, this.rider(v, n++, others));
      if (v.mode === 'herd') this.herders.set(v, new Herder(v, this.pasture(v.seed), 3 + (v.seed % 3)));
    }
  }

  // Rider 0 circles the settlement; rider 1 rides to the nearest other settlement and back.
  rider(v, k, others) {
    const s = this.site, stable = this.around(s.r + 8, v.seed);
    const near = others.map((o) => ({ o, d: Math.hypot(o.x - s.x, o.z - s.z) })).sort((p, q) => p.d - q.d)[0];
    if (k % 2 && near && near.d < TRIP_MAX) {
      const ux = (near.o.x - s.x) / near.d, uz = (near.o.z - s.z) / near.d;
      const a = { x: s.x + ux * (s.r + 10), z: s.z + uz * (s.r + 10) };
      const b = { x: near.o.x - ux * (near.o.r + 12), z: near.o.z - uz * (near.o.r + 12) };
      return new Rider(v, [a, b, { x: b.x - uz * 15, z: b.z + ux * 15 }, a], true, stable);
    }
    const route = [], dir = v.seed % 2 ? 1 : -1, R = s.r + 16;
    for (let i = 0; i < 8; i++) route.push(this.around(R, 0, (dir * i * Math.PI) / 4));
    return new Rider(v, route, false, stable);
  }

  // Flattest dry spot just outside the settlement, cleared of trees (the flora zone) -> { x, z }.
  pasture(seed) {
    const q = this.q, s = this.site, t = q.planet.terrain, R = s.r + 24;
    let best = null, score = Infinity;
    for (let k = 0; k < 8; k++) {
      const p = this.around(R, 0, ((seed % 8) + k) * Math.PI / 4), y = q.h(p.x, p.z);
      const wet = t.hasWater && y < t.waterY + 0.8;
      const slope = Math.abs(q.h(p.x + 8, p.z) - y) + Math.abs(q.h(p.x, p.z + 8) - y);
      const crowd = actors.sites.some((o) => (o.x !== s.x || o.z !== s.z) && Math.hypot(o.x - p.x, o.z - p.z) < o.r + 20);
      if (!wet && !crowd && slope < score) { best = p; score = slope; }
    }
    best ??= this.around(R, seed);
    q.zones.push({ x: best.x, z: best.z, r: 18 });
    return best;
  }

  // Point on a circle of radius r around the settlement (angle from seed or explicit).
  around(r, seed, angle = (seed % 628) / 100) {
    return { x: this.site.x + Math.cos(angle) * r, z: this.site.z + Math.sin(angle) * r };
  }

  nearestKid(v) {
    let best = null, bd = Infinity;
    for (const k of this.kids) {
      if (k === v || k.vitals.mode) continue;
      const d = Math.hypot(k.feet.x - v.feet.x, k.feet.z - v.feet.z);
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }

  nearestDoor(p) {
    let best = null, bd = Infinity;
    for (const d of this.q.layout.doors) {
      const k = Math.hypot(d.x - p.x, d.z - p.z);
      if (k < bd) { bd = k; best = d; }
    }
    return best;
  }

  update(dt) {
    for (const p of this.pairs) if ((p.t += dt) > p.dur) this.moveChat(p);
    if (this.game) this.game.freeze -= dt;
  }

  dispose() {
    for (const r of this.riders.values()) r.release();
    for (const h of this.herders.values()) h.release();
  }
}
