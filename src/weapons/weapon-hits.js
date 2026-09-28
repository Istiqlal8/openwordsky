// Hit resolution shared by all weapons: hitscan against sentinels, creatures, mineable props
// and terrain; fractional damage accumulation; splash damage for explosives.
import * as THREE from 'three';

const _p = new THREE.Vector3(), _c = new THREE.Vector3();
const _pt = new THREE.Vector3();

export class WeaponHits {
  // ctx: SurfaceGameplay ctx { surface, player, sfx, fx, creatures? }; sentinels() -> Sentinels
  constructor(ctx, sentinels, onDrone) {
    this.ctx = ctx;
    this.sentinels = sentinels;
    this.onDrone = onDrone; // ('hit' | 'kill') -> void, feeds the wanted meter
    this.caster = new THREE.Raycaster();
    this.list = [];
    this.acc = new WeakMap(); // target -> pending fractional damage
    this.hit = { type: 'none', target: null, point: new THREE.Vector3(), dist: 0 };
  }

  // Nearest thing along the ray within range. Returns the shared hit record (valid until next call).
  // props=false skips rocks/flora (per-frame projectile sweeps).
  cast(ray, range, props = true) {
    const h = this.hit, s = this.sentinels();
    h.type = 'none'; h.target = null; h.dist = range;
    ray.at(range, h.point);
    const drone = s?.raycast(ray, h.dist, _pt);
    if (drone) this.take('drone', drone, ray);
    const beast = this.ctx.creatures?.raycast(ray, h.dist, _pt);
    if (beast) this.take('creature', beast, ray);
    const prop = props ? this.castProps(ray, h.dist) : null;
    if (prop) { _pt.copy(prop.point); this.take('prop', prop, ray); }
    if (this.terrain(ray, h.dist, _pt)) this.take('terrain', null, ray);
    return h;
  }

  take(type, target, ray) {
    const d = _pt.distanceTo(ray.origin);
    if (d > this.hit.dist) return;
    Object.assign(this.hit, { type, target, dist: d });
    this.hit.point.copy(_pt);
  }

  castProps(ray, range) {
    const props = this.ctx.surface.props;
    if (!props?.mineable) return null;
    this.caster.ray.copy(ray);
    this.caster.far = range;
    this.list.length = 0;
    this.caster.intersectObjects(props.mineable, false, this.list);
    for (const h of this.list) {
      const key = props.keyOf(h.object, h.instanceId);
      if (key && !props.isRemoved(key)) return h;
    }
    return null;
  }

  // Ray-march the height field with gap-sized steps, then bisect. Writes the point to out.
  terrain(ray, range, out) {
    const s = this.ctx.surface;
    if (!s.planet) return false;
    let t = 0.3, prev = 0;
    while (t < range) {
      ray.at(t, _p);
      const gap = _p.y - s.floorAt(_p.x, _p.z);
      if (gap < 0) return this.bisect(ray, prev, t, out);
      prev = t;
      t += THREE.MathUtils.clamp(gap * 0.6, 0.4, 8);
    }
    return false;
  }

  bisect(ray, a, b, out) {
    const s = this.ctx.surface;
    for (let i = 0; i < 6; i++) {
      const m = (a + b) / 2;
      ray.at(m, _p);
      if (_p.y < s.floorAt(_p.x, _p.z)) b = m; else a = m;
    }
    ray.at(b, out);
    return true;
  }

  // Apply `amount` hit units to the record's target. Returns 'kill' | 'hit' | null.
  apply(hit, amount, color = 0xffe0a0) {
    const { fx } = this.ctx;
    if (hit.type === 'drone') return this.hurt(hit.target, hit.target, amount, hit.point, true);
    if (hit.type === 'creature') return this.hurt(hit.target.body.ref, hit.target, amount, hit.point, false);
    if (hit.type === 'prop') fx?.sparks(hit.point, 0xc8b89a, 5, 0.5);
    if (hit.type === 'terrain') { fx?.sparks(hit.point, color, 4, 0.5); fx?.puff(hit.point, 0x3a3530, 0.6, 0.6); }
    return null;
  }

  // Whole units of accumulated damage go through the world's own damage APIs (loot, kill fx).
  hurt(key, target, amount, point, isDrone) {
    let pending = (this.acc.get(key) ?? 0) + amount, killed = false, landed = false;
    while (pending >= 1 && !killed) {
      pending -= 1;
      landed = true;
      killed = isDrone ? this.sentinels().damage(target, point) : this.ctx.creatures.damage(target, point);
    }
    this.acc.set(key, killed ? 0 : pending);
    if (!landed) this.ctx.fx?.sparks(point, 0xffe0a0, 3, 0.5);
    this.ctx.player.emit('hitMarker', {});
    const res = killed ? 'kill' : 'hit';
    if (isDrone) this.onDrone(res);
    return res;
  }

  // Explosion: damage falls off linearly with distance to every drone/creature in the radius.
  splash(center, radius, amount) {
    for (const d of [...(this.sentinels()?.drones ?? [])]) {
      const k = 1 - d.group.position.distanceTo(center) / radius;
      if (k > 0) this.hurt(d, d, amount * k, d.group.position, true);
    }
    for (const g of this.ctx.creatures?.groups ?? []) this.splashGroup(g, center, radius, amount);
  }

  splashGroup(group, center, radius, amount) {
    for (const body of [...(group.bodies?.() ?? [])]) {
      _c.copy(body.root.position);
      const k = 1 - Math.max(0, _c.distanceTo(center) - body.radius) / radius;
      if (k > 0) this.hurt(body.ref, { group, body }, amount * k, _c.clone(), false);
    }
  }
}
