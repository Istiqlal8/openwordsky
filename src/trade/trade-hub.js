// TradeHub: the spaceport-market city on a trade world ("Planet Dagang"): streets of stalls and
// neon shops, an exchange tower, landing pads with ships, cargo yards, a crowd of every race and
// interactive shopkeepers that open the Market (or the weapon store).
// API: mount(planet) / update(dt, playerPos, night) / dispose / colliders / places / nearest / interact / getShop.
import * as THREE from 'three';
import { Rng, hash32 } from '../core/rng.js';
import { GeoKit } from '../aliens/body-kit.js';
import { AlienBody } from '../aliens/alien-body.js';
import { AlienResident } from '../aliens/alien-resident.js';
import { RACES, alienName, greetLine, loreLine } from '../aliens/races.js';
import { applyNight, disposeMaterials } from '../villages/materials.js';
import { isTradeWorld, TRADE_LABEL } from './trade-worlds.js';
import { SHOP_TYPES, makeShop } from './shops.js';
import { HubSigns } from './hub-signs.js';
import { HUB } from './hub-plan.js';
import { buildHub } from './hub-build.js';
import { HubCrowd } from './hub-crowd.js';
import { HubTraffic } from './hub-traffic.js';

const SALT = 0x7ade, CROWD = 60;
const TALK = 8, REACH = 5, CHAT = 3.5, VENDOR_RANGE = 90, SOLID_RANGE = 70;

export class TradeHub {
  constructor(surface, player) {
    Object.assign(this, { surface, player, planet: null, vendors: [], solid: [], time: 0, solidT: 0 });
    this.result = { label: '', distance: 0, line: null, shop: null };
  }

  get active() { return Boolean(this.planet); }

  mount(planet) {
    this.dispose();
    if (!isTradeWorld(planet)) return;
    const s = this.surface, rng = new Rng(hash32(planet.seed, SALT));
    this.planet = planet;
    this.name = `Bandar ${planet.name}`;
    this.signs = new HubSigns(this.name);
    const ship = s.shipPosition ?? s.spawn;
    this.city = buildHub(s.scene, s.h, planet, ship, rng, this.signs);
    const c = this.city.center;
    this.center = { x: c.x, y: c.floor, z: c.z };
    this.halos = this.makeHalos(this.city.lampHeads);
    this.kit = new GeoKit();
    this.vendors = this.city.vendors.map((v, i) => this.makeVendor(v, hash32(planet.seed, SALT, i)));
    const ctx = { scene: s.scene, frame: this.city.frame, h: s.h, planet, plan: this.city.plan, center: this.center };
    this.crowd = new HubCrowd(ctx, planet.seed, CROWD);
    this.traffic = new HubTraffic(s.scene, this.city.pads, planet.seed, this.center);
    this.allSolids = [...this.city.colliders, ...this.traffic.solids];
    this.keepClear();
  }

  makeHalos(heads) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(heads, 3));
    const pts = new THREE.Points(geo, this.city.mats.halo);
    this.surface.scene.add(pts);
    return pts;
  }

  // Shopkeeper (full-detail alien) behind the counter of an interactive shop.
  makeVendor({ lot, spot }, seed) {
    const rng = new Rng(seed), race = rng.pick(RACES), who = alienName(race, rng), type = lot.shopType;
    const shop = type === 'senjata' ? { id: 'weapons', name: `Toko Senjata ${who}`, type, typeLabel: SHOP_TYPES[type].label, race }
      : makeShop({ seed, type, race, name: `Toko ${who}` });
    const body = new AlienBody(race, this.kit, rng);
    const r = new AlienResident(this.surface.scene, { id: `hub-vendor-${seed}`, name: who, body, home: spot.vendor,
      radius: 1, spots: [], vendor: true, start: spot.vendor, yaw: spot.yaw, floor: spot.floor });
    Object.assign(r, { seed, shop, greets: 0, spot });
    return r;
  }

  keepClear() {
    const props = this.surface.props;
    if (!props) return;
    this.zone = { x: this.center.x, z: this.center.z, r: HUB.R + 14 };
    props.extraZones.push(this.zone);
    props.rebuild(this.surface.center.x, this.surface.center.z);
  }

  update(dt, playerPos = this.surface.position, night = this.surface.sky?.nightFactor ?? 0) {
    if (!this.planet) return;
    dt = Math.min(dt, 0.1);
    this.time += dt;
    const m = this.city.mats;
    applyNight(m, night, this.time);
    m.neon.color.setScalar(1 + night * 0.7);
    const dc = Math.hypot(playerPos.x - this.center.x, playerPos.z - this.center.z);
    this.crowd.update(dt, playerPos, this.time);
    this.traffic.update(dt, dc < HUB.R + 1500);
    this.updateVendors(dt, playerPos);
    if ((this.solidT -= dt) <= 0) { this.solidT = 0.5; this.refreshSolids(playerPos); }
  }

  updateVendors(dt, p) {
    const h = this.surface.h;
    for (const v of this.vendors) {
      const near = Math.hypot(p.x - v.feet.x, p.z - v.feet.z) < VENDOR_RANGE;
      v.body.group.visible = near;
      if (near || !v.posed) { v.update(dt, h, this.planet, p); v.posed = true; }
    }
  }

  refreshSolids(p) {
    this.solid.length = 0;
    for (const c of this.allSolids) if (Math.abs(c.x - p.x) < SOLID_RANGE && Math.abs(c.z - p.z) < SOLID_RANGE) this.solid.push(c);
  }

  colliders() { return this.solid; }

  // Radar landmarks: the exchange tower (gold) and each shop in its sign colour.
  places() {
    if (!this.planet) return [];
    return [{ x: this.center.x, z: this.center.z, color: '#ffc94a' },
      ...this.vendors.map((v) => ({ x: v.feet.x, z: v.feet.z, color: SHOP_TYPES[v.shop.type].color }))];
  }

  closestVendor(pos) {
    let best = null, bd = Infinity;
    for (const v of this.vendors) {
      const d = Math.hypot(pos.x - v.feet.x, pos.z - v.feet.z);
      if (d < bd) { best = v; bd = d; }
    }
    return { v: best, d: bd };
  }

  // Closest shopkeeper -> { label, distance, line, shop } | null (object reused).
  nearest(pos) {
    if (!this.planet) return null;
    const { v, d } = this.closestVendor(pos);
    if (!v) return null;
    const talking = d < TALK;
    if (talking && !v.line) v.line = `${greetLine(v.race, new Rng(hash32(v.seed, v.greets++)))} (T: ${v.shop.typeLabel})`;
    if (d > TALK + 2) v.line = null;
    return Object.assign(this.result, { label: `${v.name} · ${v.shop.name}`, distance: d, line: talking ? v.line : null, shop: v.shop.id });
  }

  // T: shopkeeper -> { shop: id }; passer-by -> { title, text }; tower -> { title, text }; else null.
  interact(pos) {
    if (!this.planet) return null;
    const { v, d } = this.closestVendor(pos);
    if (v && d < REACH) return { shop: v.shop.id };
    const { w, d: dw } = this.crowd.closest(pos);
    if (w && dw < CHAT) {
      const rng = new Rng(hash32(w.seed, (w.talks = (w.talks ?? 0) + 1)));
      return { title: `${this.crowd.nameOf(w)} · ${w.race.name}`, text: `"${loreLine(w.race, rng)}" ${greetLine(w.race, rng)}` };
    }
    if (Math.hypot(pos.x - this.center.x, pos.z - this.center.z) < 16) {
      return { title: `Bursa Galaksi · ${this.name}`, text: `${TRADE_LABEL}: ${this.vendors.length} toko menunggu. Ras yang berbeda membayar lebih untuk barang kesukaannya.` };
    }
    return null;
  }

  // Shop object by id (for Market.open); 'weapons' returns the weapon-store stub.
  getShop(id) { return this.vendors.find((v) => v.shop.id === id)?.shop ?? null; }

  dispose() {
    for (const v of this.vendors) v.dispose();
    this.crowd?.dispose();
    this.traffic?.dispose();
    for (const m of this.city?.meshes ?? []) { m.removeFromParent(); m.geometry.dispose(); }
    if (this.halos) { this.halos.removeFromParent(); this.halos.geometry.dispose(); }
    if (this.city) disposeMaterials(this.city.mats);
    this.signs?.dispose();
    this.kit?.dispose();
    this.releaseZone();
    Object.assign(this, { vendors: [], solid: [], allSolids: [], city: null, crowd: null, traffic: null, halos: null, kit: null, signs: null, planet: null });
  }

  releaseZone() {
    const props = this.surface.props, zones = props?.extraZones, i = zones ? zones.indexOf(this.zone) : -1;
    if (i >= 0) {
      zones.splice(i, 1);
      if (props.meshes?.length) props.rebuild(this.surface.center.x, this.surface.center.z);
    }
    this.zone = null;
  }
}
