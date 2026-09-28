// Photo mode (P on foot): hides the HUD, freezes the explorer, orbits the camera around them
// (mouse; W/S zoom), cycles filters (C) and takes a picture (Enter). The picture is read from
// the WebGL canvas in a microtask right after this frame's render, then stored as a thumbnail.
import * as THREE from 'three';
import { worldLink } from '../legend/world-link.js';
import { thumbnail, storePhoto } from './photo-store.js';
import { photoSubjects } from './photo-subjects.js';

const KEY = 'KeyP';
const FILTERS = [
  { name: 'Normal', css: 'none' },
  { name: 'Sepia', css: 'sepia(0.85) contrast(1.05)' },
  { name: 'Noir', css: 'grayscale(1) contrast(1.35) brightness(0.95)' },
  { name: 'Vivid', css: 'saturate(1.8) contrast(1.12)' },
];
const _fwd = new THREE.Vector3();

export class PhotoMode {
  constructor(wiring, ride) {
    this.player = wiring.player;
    this.sfx = wiring.sfx;
    this.ride = ride;
    this.on = false;
    this.filter = 0;
    this.dist = 6;
    this.hold = new THREE.Vector3();
    this.last = performance.now();
    this.shots = 0;
  }

  get ctx() { return worldLink.ctx; }

  update(input) {
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const s = this.ctx?.surface, ok = s?.planet && !s.flying && !this.player.dead;
    if (!ok) { if (this.on) this.toggle(false); return; }
    if (input.pressed(KEY)) this.toggle(!this.on);
    if (!this.on) return;
    if (input.pressed('KeyC')) this.cycle();
    this.orbit(s, input, dt);
    if (input.pressed('Enter') || input.pressed('NumpadEnter')) this.snap();
  }

  toggle(on) {
    this.on = on;
    const s = this.ctx?.surface;
    if (on && s) { this.hold.copy(s.feet); this.yaw0 = s.yaw; this.third = s.thirdPerson; s.thirdPerson = true; }
    if (!on && s && this.third !== undefined) s.thirdPerson = this.third;
    this.hud(on ? '0' : '');
    this.setFilter(on ? this.filter : -1);
    this.overlay(on);
  }

  cycle() {
    this.filter = (this.filter + 1) % FILTERS.length;
    this.setFilter(this.filter);
    this.overlay(true);
  }

  setFilter(i) {
    const c = document.getElementById('view');
    if (c) c.style.filter = i >= 0 && FILTERS[i].css !== 'none' ? FILTERS[i].css : '';
  }

  hud(opacity) {
    const h = document.getElementById('hud');
    if (h) h.style.opacity = opacity;
  }

  // Explorer stays put; the camera circles them using the view's yaw/pitch (mouse look).
  orbit(s, input, dt) {
    const zoom = (input.down('KeyS') ? 1 : 0) - (input.down('KeyW') ? 1 : 0);
    this.dist = Math.max(2.5, Math.min(40, this.dist * (1 + zoom * dt * 1.2)));
    s.feet.copy(this.hold);
    s.velY = 0;
    s.onGround = true;
    s.avatar?.update(0, s.feet, this.yaw0, 0, true);
    if (s.avatar) s.avatar.group.visible = true;
    const cam = s.camera, target = _fwd.set(s.feet.x, s.feet.y + 1.2, s.feet.z);
    cam.rotation.set(s.pitch, s.yaw, 0);
    cam.position.copy(target).add(_fwd.set(0, 0, this.dist).applyEuler(cam.rotation));
    const ground = s.floorAt(cam.position.x, cam.position.z) + 0.4;
    if (cam.position.y < ground) cam.position.y = ground;
  }

  snap() {
    const ctx = this.ctx, subjects = photoSubjects(ctx, worldLink.hunt, this.ride?.mounted);
    const css = FILTERS[this.filter].css;
    queueMicrotask(() => this.capture(subjects, css)); // after this frame's render, before compositing
  }

  capture(subjects, css) {
    const canvas = document.getElementById('view');
    if (!canvas) return;
    let src = null;
    try { src = thumbnail(canvas, css); } catch { /* tainted or lost context */ }
    if (!src) return;
    const planet = this.ctx?.planet?.name ?? '';
    const saved = storePhoto({ t: Date.now(), src, planet, subjects, filter: FILTERS[this.filter].name });
    this.shots++;
    this.flash();
    this.sfx?.scan?.();
    this.player.emit('notice', { text: saved ? `Foto tersimpan${subjects.length ? ` · ${subjects.slice(0, 3).join(', ')}` : ''}` : 'Galeri penuh / penyimpanan diblokir' });
    this.player.emit('photo', { src, planet, subjects });
    this.player.emit('act', { type: 'photo', item: 'Foto' });
    for (const item of subjects) this.player.emit('act', { type: 'photo', item });
  }

  flash() {
    const f = document.createElement('div');
    f.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:.8;pointer-events:none;z-index:60;transition:opacity .45s';
    document.body.append(f);
    requestAnimationFrame(() => { f.style.opacity = '0'; });
    setTimeout(() => f.remove(), 600);
  }

  overlay(on) {
    if (!on) { this.box?.remove(); this.box = null; return; }
    if (!this.box) {
      this.box = document.createElement('div');
      this.box.className = 'photo-mode-bar';
      this.box.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:55;pointer-events:none;'
        + 'font:13px/1.4 system-ui,sans-serif;color:#eaf6ff;background:rgba(8,14,24,.55);padding:6px 14px;border-radius:8px;letter-spacing:.02em';
      document.body.append(this.box);
    }
    this.box.textContent = `MODE FOTO · Filter: ${FILTERS[this.filter].name} · Mouse putar · W/S zoom · C filter · Enter potret · P keluar`;
  }

  dispose() { if (this.on) this.toggle(false); }
}
