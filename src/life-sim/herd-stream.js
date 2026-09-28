// Streams procedural herds around the player: the ground is split into cells, each cell
// deterministically hosts (or not) one herd of one species. Cells near the player are spawned,
// far ones recycled, so a planet with 50+ species shows ~40-70 animals at a time and the
// species you meet change as you travel. Cells next to settlements favour hunters.
import { Rng, hash32 } from '../core/rng.js';
import { actors } from './actors.js';

const CELL = 95;          // m per cell
const LOAD_R = 215;       // spawn cells whose centre is this close
const UNLOAD_R = 310;     // recycle cells further than this
const MAX_ANIMALS = 64;   // streamed animals alive at once (species-rich worlds)
const TICK = 0.25;        // seconds between streaming passes
const SPAWNS_PER_TICK = 1; // herds spawned per pass (spreads template builds over frames)

export class HerdStream {
  // herds: Herds group; opts.pick(x, z, rng, nearSite) -> species | null overrides the species choice.
  constructor(herds, seed, species, opts = {}) {
    Object.assign(this, { herds, seed, species, pick: opts.pick ?? null, density: opts.density ?? 0.8 });
    this.max = Math.max(12, Math.min(MAX_ANIMALS, species.length * 6)); // sparse worlds stay sparse
    this.cells = new Map();
    this.t = 0;
    this.hunters = species.filter((sp) => herds.isHunter(sp));
  }

  get count() {
    let n = 0;
    for (const c of this.cells.values()) n += c.animals.length;
    return n;
  }

  // Species (or null) living in cell (ix, iz).
  plan(ix, iz) {
    const rng = new Rng(hash32(this.seed, ix * 7919 + 13, iz * 104729 + 7));
    if (!rng.chance(this.density)) return null;
    const x = (ix + 0.5) * CELL, z = (iz + 0.5) * CELL;
    const nearSite = actors.sites.some((s) => Math.hypot(s.x - x, s.z - z) < s.r + 140);
    if (this.pick) return this.pick(x, z, rng, nearSite);
    if (nearSite && this.hunters.length && rng.chance(0.45)) return rng.pick(this.hunters);
    return this.species.length ? rng.pick(this.species) : null;
  }

  update(dt, player, force = false) {
    if ((this.t -= dt) > 0 && !force) return;
    this.t = TICK;
    this.unload(player);
    this.load(player, force ? 99 : SPAWNS_PER_TICK);
  }

  unload(player) {
    for (const [key, c] of this.cells) {
      if (Math.hypot(c.x - player.x, c.z - player.z) < UNLOAD_R) continue;
      for (const a of c.animals) this.herds.remove(a);
      this.cells.delete(key);
    }
    for (const c of this.cells.values()) c.animals = c.animals.filter((a) => this.herds.animals.includes(a));
  }

  // Spawns the nearest unloaded cells first, a few per pass.
  load(player, budget) {
    const cx = Math.floor(player.x / CELL), cz = Math.floor(player.z / CELL), span = Math.ceil(LOAD_R / CELL);
    const todo = [];
    for (let ix = cx - span; ix <= cx + span; ix++) {
      for (let iz = cz - span; iz <= cz + span; iz++) {
        const x = (ix + 0.5) * CELL, z = (iz + 0.5) * CELL, d = Math.hypot(x - player.x, z - player.z);
        if (d < LOAD_R && !this.cells.has(`${ix},${iz}`)) todo.push({ ix, iz, x, z, d });
      }
    }
    todo.sort((p, q) => p.d - q.d);
    let left = this.max - this.count;
    for (const c of todo) {
      if (budget <= 0 || left <= 0) break;
      const sp = this.plan(c.ix, c.iz);
      const animals = sp ? this.herds.spawnHerd(sp, c.x, c.z, CELL * 0.4, left) : [];
      this.cells.set(`${c.ix},${c.iz}`, { x: c.x, z: c.z, animals });
      left -= animals.length;
      if (animals.length) budget--;
    }
  }

  clear() { this.cells.clear(); }
}
