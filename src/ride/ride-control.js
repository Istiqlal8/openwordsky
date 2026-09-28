// Riding a big tamed pet (H on foot, next to it). Runs after the surface view, the wildlife and
// PetKeeper have updated this frame: the walk step the view just applied is stretched to the
// pet's riding speed, the rider sits on its back and the pet is moved under them.
import * as THREE from 'three';
import { worldLink } from '../legend/world-link.js';

const KEY = 'KeyH';
const MIN_SIZE = 1.2;      // genes.size or model scale needed to carry the player
const WALK = 7;            // SurfaceView walk speed; the view's step is rescaled from it
const _v = new THREE.Vector3();

export class RideControl {
  constructor(wiring) {
    this.player = wiring.player;
    this.mounted = false;
    this.seat = new THREE.Vector3();
    this.hinted = null;
    this.last = performance.now();
  }

  get ctx() { return worldLink.ctx; }
  get body() { return this.ctx?.pets?.body ?? null; }

  size(b) { return Math.max(b.record.genes?.size ?? 0, b.record.scale ?? 0); }

  // Riding speed: species speed × 2.5, never slower than 10 u/s.
  speed(b) { return Math.max(10, (b.record.genes?.speed ?? 4) * 2.5); }

  update(input) {
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const s = this.ctx?.surface, b = this.body;
    if (this.mounted && (!s || !b || !this.canRide(s))) { this.dismount(); return; }
    if (!s || !b || !this.canRide(s)) return;
    if (input.pressed(KEY)) { if (this.mounted) this.dismount(); else this.tryMount(b); }
    if (this.mounted) this.ride(s, b, dt);
    else this.hint(b);
  }

  canRide(s) { return !s.flying && !s.swimming && !this.player.dead && Boolean(s.planet); }

  distance(b) {
    const f = this.ctx.surface.feet;
    return Math.hypot(b.pos.x - f.x, b.pos.z - f.z);
  }

  hint(b) {
    if (this.hinted === b || this.size(b) < MIN_SIZE || this.distance(b) > 4 + this.size(b)) return;
    this.hinted = b;
    this.say(`[H] Tunggangi ${b.record.name}`);
  }

  tryMount(b) {
    if (this.distance(b) > 5 + this.size(b)) return;
    if (this.size(b) < MIN_SIZE) { this.say(`${b.record.name} terlalu kecil untuk ditunggangi`); return; }
    this.mounted = true;
    this.seat.copy(this.ctx.surface.feet);
    this.seat.x = b.pos.x;
    this.seat.z = b.pos.z;
    this.say(`Menunggangi ${b.record.name} · H turun`);
    this.player.emit('act', { type: 'ride' });
  }

  dismount() {
    if (!this.mounted) return;
    this.mounted = false;
    const s = this.ctx?.surface, b = this.body;
    if (!s?.planet) return;
    const side = (b ? this.size(b) : 1) * 1.2 + 1;
    s.feet.x += Math.cos(s.yaw) * side;
    s.feet.z -= Math.sin(s.yaw) * side;
    s.feet.y = s.floorAt(s.feet.x, s.feet.z);
    s.velY = 0;
    s.onGround = true;
    s.updateCamera(0);
    this.say('Turun dari tunggangan');
  }

  ride(s, b, dt) {
    const f = s.feet, dx = f.x - this.seat.x, dz = f.z - this.seat.z, step = Math.hypot(dx, dz);
    const k = step < 3 ? this.speed(b) / WALK : 1; // big jumps (respawn, knock-back) are not rescaled
    f.x = this.seat.x + dx * k;
    f.z = this.seat.z + dz * k;
    const sc = b.record.scale ?? 1, plan = b.parts.plan ?? { bodyY: 0.8, rh: 0.5 };
    const hover = b.record.genes?.move === 'melayang' ? 1.3 : 0;
    f.y = s.floorAt(f.x, f.z) + hover + (plan.bodyY + plan.rh * 0.9) * sc;
    s.velY = 0;
    s.onGround = true;
    this.seat.copy(f);
    this.movePet(s, b, step > 0.001 ? step * k : 0, dt);
    this.placeRider(s, sc);
  }

  movePet(s, b, moved, dt) {
    const keeper = this.ctx.pets;
    b.pos.set(s.feet.x, 0, s.feet.z);
    const r = b.root.rotation, yaw = Math.atan2(Math.cos(s.yaw), -Math.sin(s.yaw));
    r.y += Math.atan2(Math.sin(yaw - r.y), Math.cos(yaw - r.y)) * Math.min(1, dt * 8);
    keeper.animate(b, moved > 0 ? 1 : 0, dt * (moved > 0 ? 1.5 : 0));
    keeper.place();
  }

  // Camera sits higher and further back so the mount stays in view.
  placeRider(s, sc) {
    s.updateCamera(0);
    if (s.thirdPerson) s.camera.position.add(_v.set(0, 0.6 * sc, 1.4 * sc).applyEuler(s.camera.rotation));
    s.avatar?.update(0, s.feet, s.yaw, 0, true);
  }

  say(text) { this.player.emit('notice', { text }); }
}
