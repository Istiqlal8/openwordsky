// Settlements: inhabited villages, towns and outposts on Earth, habitable worlds and some airy planets.
// Integration API: mount / update / dispose / colliders / places / nearest / interact.
import { Rng, hash32 } from '../core/rng.js';
import { planSettlements } from './sites.js';
import { makeSignAtlas } from './signs.js';
import { makeMaterials, applyNight, disposeMaterials } from './materials.js';
import { Settlement, COLORS } from './settlement.js';
import { greetLine, tipLine, giftFor } from './names.js';

const TALK = 6, REACH = 5;
const ZONE_RANGE = 450;  // flora zones only for settlements this close (keeps prop placement cheap)
const SOLID_RANGE = 60;  // colliders only for settlements this close

export class Settlements {
  constructor(surface) {
    this.surface = surface;
    this.list = [];
    this.solid = [];
    this.time = 0;
    this.zoneT = 0;
    this.player = { x: 0, z: 0 };
    this.result = { label: '', distance: 0, line: null };
  }

  mount(planet) {
    this.dispose();
    const s = this.surface, sites = planSettlements(planet, s.h, s.spawn);
    if (!sites.length) return;
    this.atlas = makeSignAtlas(sites.map((q) => q.name));
    this.mats = makeMaterials(this.atlas);
    this.list = sites.map((site, i) => new Settlement(s.scene, site, s.h, planet, this.mats, `name${i}`));
    for (const q of this.list) q.zoned = false;
    this.player = { x: s.spawn.x, z: s.spawn.z };
    this.refreshZones(true);
  }

  update(dt, playerPos = this.surface.position, nightFactor = this.surface.sky?.nightFactor ?? 0) {
    if (!this.list.length) return;
    dt = Math.min(dt, 0.1);
    this.time += dt;
    this.player.x = playerPos.x;
    this.player.z = playerPos.z;
    this.night = nightFactor;
    applyNight(this.mats, nightFactor, this.time);
    for (const q of this.list) q.update(dt, this.time, this.player, nightFactor);
    this.solid.length = 0;
    for (const q of this.list) if (q.edgeDistance(this.player) < SOLID_RANGE) this.solid.push(...q.colliders);
    if ((this.zoneT += dt) > 1) { this.zoneT = 0; this.refreshZones(false); }
  }

  // Add / remove flora exclusion zones as settlements come into or leave range; rebuild props on change.
  refreshZones(force) {
    const props = this.surface.props;
    if (!props) return;
    let changed = force;
    for (const q of this.list) {
      const want = q.edgeDistance(this.player) < ZONE_RANGE;
      if (want === q.zoned) continue;
      q.zoned = want;
      changed = true;
      if (want) props.extraZones.push(...q.zones);
      else props.extraZones = props.extraZones.filter((z) => !q.zones.includes(z));
    }
    if (!changed) return;
    props.rebuild(this.surface.center.x, this.surface.center.z);
    this.surface.earth?.recenter?.();
  }

  // Solid building footprints [{ x, z, r }] near the player.
  colliders() { return this.solid; }

  // Radar markers, one per settlement.
  places() {
    return this.list.map((q) => ({ x: q.site.x, z: q.site.z, color: COLORS[q.site.type], label: q.site.name }));
  }

  // Closest resident within reach, over all settlements -> { v, d, q } | null.
  closest(pos, reach) {
    let best = null;
    for (const q of this.list) {
      if (q.edgeDistance(pos) > reach + 20) continue;
      const { v, d } = q.closestResident(pos);
      if (v && d <= reach && (!best || d < best.d)) best = { v, d, q };
    }
    return best;
  }

  // Greeting of the closest resident within 6 m -> { label, distance, line } | null (object reused).
  nearest(pos) {
    if (!pos || !this.list.length) return null;
    for (const q of this.list) for (const v of q.villagers) if (v.line && Math.hypot(pos.x - v.feet.x, pos.z - v.feet.z) > TALK + 2) v.line = null;
    const best = this.closest(pos, TALK);
    if (!best) return null;
    const { v, d, q } = best;
    v.line ??= greetLine(new Rng(hash32(v.seed, v.greets++)), v, q.site.name, this.night ?? 0);
    return Object.assign(this.result, { label: v.name, distance: d, line: v.line });
  }

  // T: chat with a resident (tips, sometimes a gift) or knock on a door within 5 m -> { title, text, gift? } | null.
  interact(pos) {
    if (!pos || !this.list.length) return null;
    const best = this.closest(pos, REACH);
    if (best) return this.chat(best.v, best.q);
    for (const q of this.list) {
      if (q.edgeDistance(pos) > REACH) continue;
      const { door, d } = q.closestDoor(pos);
      if (door && d <= REACH) return { title: `${door.title} · ${q.site.name}`, text: door.text };
    }
    return null;
  }

  chat(v, q) {
    const rng = new Rng(hash32(v.seed, 0xc4a7, v.greets++));
    const title = `${v.name} · ${q.site.name}`;
    if (v.gift && !v.gifted) {
      v.gifted = true;
      const gift = giftFor(rng);
      return { title, text: `"Ini buat bekal di jalan." ${v.name} memberimu ${gift.count} ${gift.item}.`, gift };
    }
    const text = rng.chance(0.5) ? `"${tipLine(rng)}"` : `"${greetLine(rng, v, q.site.name, this.night ?? 0)}"`;
    return { title, text };
  }

  dispose() {
    const s = this.surface, props = s.props;
    if (props && this.list.some((q) => q.zoned)) {
      const drop = new Set(this.list.flatMap((q) => q.zones));
      props.extraZones = props.extraZones.filter((z) => !drop.has(z));
      if (props.meshes?.length !== 0) props.rebuild(s.center.x, s.center.z);
      s.earth?.recenter?.();
    }
    for (const q of this.list) q.dispose();
    if (this.mats) disposeMaterials(this.mats);
    this.atlas?.dispose();
    this.list = [];
    this.solid = [];
    this.mats = this.atlas = null;
  }
}
