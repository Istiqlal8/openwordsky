// Storm eels: long segmented serpents rippling through the mid clouds, electric glow crackling
// along their bodies. Some stalk the ship at a distance; in storms they zap nearby air (small
// flash, rare light damage within 30 m).
import * as THREE from 'three';
import { Agent, Species, wander, steer, rand } from './fauna-mind.js';
import { Frame } from './fauna-fields.js';
import { drawArc } from './fauna-arc.js';

const ZAP_LIFE = 0.3, ZAP_HIT = 30;
const Z = new THREE.Vector3(0, 0, 1), WHITE = new THREE.Color(1, 1, 1);
const _f = new Frame(), _q = new THREE.Quaternion(), _d = new THREE.Vector3(), _s = new THREE.Vector3();
const _a = new THREE.Vector3(), _t = new THREE.Vector3();

export class StormEels extends Species {
  constructor(theme, parent) {
    super(theme.name('eel'), [-1900, -480], [300, 1800], 300);
    const rng = theme.rng('eel');
    this.glow = theme.glow(rng, 0.02, 0.7).lerp(WHITE, 0.25);
    this.skin = theme.skin(rng, this.glow, 0.8);
    this.eye = theme.glow(rng, -0.08, 0.6);
    this.light = new THREE.PointLight(this.glow, 0, 400, 1.2);
    parent.add(this.light);
    const n = 2 + rng.int(2), segs = 24 + rng.int(12), len = rng.range(90, 170);
    for (let i = 0; i < n; i++) {
      const a = new Agent(len * 0.5);
      Object.assign(a, { segs: Array.from({ length: segs }, () => new THREE.Vector3()), gap: len / segs,
        thick: rng.range(1.4, 2.6), zap: { age: ZAP_LIFE, from: new THREE.Vector3(), to: new THREE.Vector3() } });
      this.agents.push(a);
    }
  }

  spawned(a) {
    a.stalk = Math.random() < 0.45;
    a.cool = rand(4, 10);
    a.segs.forEach((s, i) => s.copy(a.pos).addScaledVector(Z, i * a.gap));
  }

  update(ctx) {
    this.light.intensity = 0;
    if (!this.tick(ctx)) return;
    for (const a of this.agents) {
      steer(a, this.desire(a, ctx), 1.2, ctx.dt);
      this.follow(a);
      this.maybeZap(a, ctx);
      this.drawEel(a, ctx);
    }
  }

  // Serpentine path: wander or shadow the ship ~170 m behind, weaving side to side.
  desire(a, ctx) {
    if (a.stalk && a.shipDist < 1500) {
      _t.copy(ctx.vel).setY(0).normalize();
      _t.set(ctx.ship.x - _t.x * 170 + _t.z * 90, ctx.ship.y + 30, ctx.ship.z - _t.z * 170 - _t.x * 90);
      _d.subVectors(_t, a.pos).multiplyScalar(0.6).clampLength(0, ctx.vel.length() + 40);
    } else wander(a, ctx.t, 32, _d);
    _s.set(-_d.z, 0, _d.x).normalize();
    return _d.addScaledVector(_s, Math.sin(ctx.t * 1.5 + a.phase) * 26);
  }

  // Follow-the-leader chain: every segment keeps its spacing behind the one ahead.
  follow(a) {
    const s = a.segs;
    s[0].copy(a.pos);
    for (let i = 1; i < s.length; i++) {
      _d.subVectors(s[i], s[i - 1]);
      const l = _d.length() || 1;
      s[i].copy(s[i - 1]).addScaledVector(_d, a.gap / l);
    }
  }

  maybeZap(a, ctx) {
    a.cool -= ctx.dt;
    a.zap.age += ctx.dt;
    const eager = ctx.storm * 0.5 + (a.stalk ? 0.06 : 0);
    if (a.cool > 0 || a.shipDist > 260 || Math.random() > ctx.dt * eager) return;
    a.cool = rand(10, 22);
    a.zap.age = 0;
    a.zap.from.copy(a.pos);
    a.zap.to.randomDirection().multiplyScalar(rand(8, 70)).add(ctx.ship);
    const miss = a.zap.to.distanceTo(ctx.ship);
    ctx.events.shake += Math.max(0.2, 1.2 - miss / 60);
    if (miss < ZAP_HIT && Math.random() < 0.5) ctx.events.damage += 3;
  }

  drawEel(a, ctx) {
    const d = ctx.draw, t = ctx.t + a.phase, s = a.segs, n = s.length, crackle = 0.25 + ctx.storm;
    for (let i = 0; i < n - 1; i++) {
      _d.subVectors(s[i], s[i + 1]).normalize();
      _q.setFromUnitVectors(Z, _d);
      const r = a.thick * (1.15 - 0.85 * Math.pow(i / n, 1.2)) * (i === 0 ? 1.3 : 1);
      _f.set(s[i], _q, 1).part(d.flesh, 0, 0, 0, 0, 0, 0, r, r * 0.85, a.gap * 0.72, this.skin);
      const zz = Math.sin(t * 9 - i * 0.8) > 0.6 ? 1.4 : 0.35;
      if (i % 2 === 0) d.glow.add(_f.point(_a, 0, r * 1.05, 0), r * 3, this.glow, zz * crackle);
    }
    _f.set(s[0], _q.setFromUnitVectors(Z, _d.subVectors(s[0], s[1]).normalize()), 1);
    for (const x of [-1, 1]) d.glow.add(_f.point(_a, x * a.thick * 0.9, a.thick * 0.5, a.thick), a.thick * 2.5, this.eye, 1.5);
    if (Math.random() < 0.08 + ctx.storm * 0.3) this.crackle(a, d);
    if (a.zap.age < ZAP_LIFE) this.drawZap(a, d);
  }

  crackle(a, d) {
    const i = Math.floor(Math.random() * (a.segs.length - 4));
    drawArc(d, a.segs[i], a.segs[i + 3], a.thick * 3, this.glow, 2.2, 5);
  }

  drawZap(a, d) {
    const k = 1 - a.zap.age / ZAP_LIFE;
    drawArc(d, a.zap.from, a.zap.to, 9, this.glow, 4 * k, 10);
    d.glow.add(a.zap.to, 40 * k + 10, this.glow, 3 * k);
    this.light.position.copy(a.zap.to);
    this.light.intensity = Math.max(this.light.intensity, 60 * k);
  }

  dispose() {
    this.light.dispose();
    this.light.removeFromParent();
  }
}
