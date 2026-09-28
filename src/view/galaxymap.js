// GalaxyMap: full-screen 2D overlay of all systems; inspect and pick a warp target.
import { allSystems, planetsOf } from '../gen/galaxy.js';
import { el, show } from '../ui/dom.js';
import { GalaxyPanel } from '../ui/galaxy-panel.js';
import {
  buildHaze, drawBackground, drawSystems, drawVisited, drawCurrent,
  drawMarker, drawRoute, drawHome, pickSystem, toWorld,
} from '../ui/galaxy-render.js';

const START_SCALE = 1.6;
const MIN_SCALE = 0.25;
const MAX_SCALE = 14;
const CLICK_SLOP = 5;

const HOME = 0; // Tata Surya

export class GalaxyMap {
  constructor(galaxySeed) {
    this.seed = galaxySeed;
    this.systems = allSystems(galaxySeed);
    this.haze = buildHaze(this.systems);
    this.planetCache = new Map();
    this.cam = { cx: 0, cz: 0, scale: START_SCALE, w: 1, h: 1 };
    this.open_ = false;
    this.buildDom();
    this.bindPointer();
    this.onKey = (e) => this.handleKey(e);
    this.onResize = () => this.resize();
    this.frame = (t) => this.tick(t);
  }

  get isOpen() {
    return this.open_;
  }

  buildDom() {
    this.root = el('div', 'gmap is-hidden');
    this.canvas = el('canvas', 'gmap-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.root.append(this.canvas);
    this.panel = new GalaxyPanel(this.root, {
      onWarp: () => this.warp(this.selected),
      onHome: () => this.warp(HOME),
      onClose: () => this.userClose(),
    });
    document.body.append(this.root);
  }

  open({ currentIndex, visited, onWarp, onClose }) {
    this.current = this.systems[currentIndex] ?? this.systems[0];
    this.visited = new Set(visited ?? []);
    this.callbacks = { onWarp, onClose };
    this.hovered = -1;
    this.selected = -1;
    this.cam.cx = this.current.pos.x;
    this.cam.cz = this.current.pos.z;
    this.cam.scale = START_SCALE;
    this.open_ = true;
    show(this.root, true);
    this.resize();
    this.refreshPanel();
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', this.onResize);
    this.raf = requestAnimationFrame(this.frame);
  }

  // Hide without firing callbacks (main calls this directly).
  close() {
    if (!this.open_) return;
    this.open_ = false;
    show(this.root, false);
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('resize', this.onResize);
  }

  userClose() {
    const cb = this.callbacks?.onClose;
    this.close();
    if (cb) cb();
  }

  warp(index) {
    if (index < 0 || index === this.current.index) return;
    const cb = this.callbacks?.onWarp;
    this.close();
    if (cb) cb(index);
  }

  handleKey(e) {
    if (e.code === 'KeyM' || e.code === 'Escape') {
      e.preventDefault();
      this.userClose();
    } else if (e.code === 'KeyP') {
      e.preventDefault();
      this.warp(HOME);
    } else if (e.code === 'Enter') {
      e.preventDefault();
      this.warp(this.selected);
    }
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cam.w = w;
    this.cam.h = h;
  }

  tick(time) {
    if (!this.open_) return;
    this.draw(time);
    this.raf = requestAnimationFrame(this.frame);
  }

  draw(time) {
    const { ctx, cam, systems } = this;
    drawBackground(ctx, cam, this.haze);
    drawSystems(ctx, cam, systems);
    drawVisited(ctx, cam, systems, this.visited);
    if (this.selected >= 0) {
      const sel = systems[this.selected];
      drawRoute(ctx, cam, this.current, sel);
      drawMarker(ctx, cam, sel, '#ffb040', sel.name);
    }
    if (this.hovered >= 0 && this.hovered !== this.selected) {
      const hov = systems[this.hovered];
      drawMarker(ctx, cam, hov, '#6fe3ff', hov.name);
    }
    drawCurrent(ctx, cam, this.current, time);
    drawHome(ctx, cam, this.systems[HOME]);
  }

  planetsFor(index) {
    if (!this.planetCache.has(index)) {
      this.planetCache.set(index, planetsOf(this.seed, this.systems[index]));
    }
    return this.planetCache.get(index);
  }

  // Panel shows hovered, else selected, else the current system.
  refreshPanel() {
    const idx = this.hovered >= 0 ? this.hovered : this.selected >= 0 ? this.selected : this.current.index;
    const system = this.systems[idx];
    this.panel.render({
      system, planets: this.planetsFor(idx), current: this.current,
      isSelected: idx === this.selected, visited: this.visited.has(idx),
    });
  }

  bindPointer() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => this.pointerDown(e));
    c.addEventListener('pointermove', (e) => this.pointerMove(e));
    c.addEventListener('pointerup', (e) => this.pointerUp(e));
    c.addEventListener('pointerleave', () => this.setHovered(-1));
    c.addEventListener('wheel', (e) => this.wheel(e), { passive: false });
    c.addEventListener('dblclick', (e) => this.doubleClick(e));
  }

  localPoint(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  pointerDown(e) {
    const p = this.localPoint(e);
    this.drag = { x: p.x, y: p.y, cx: this.cam.cx, cz: this.cam.cz, moved: false };
    this.canvas.setPointerCapture(e.pointerId);
  }

  pointerMove(e) {
    const p = this.localPoint(e);
    if (this.drag) {
      const dx = p.x - this.drag.x;
      const dy = p.y - this.drag.y;
      if (Math.hypot(dx, dy) > CLICK_SLOP) this.drag.moved = true;
      if (this.drag.moved) {
        this.cam.cx = this.drag.cx - dx / this.cam.scale;
        this.cam.cz = this.drag.cz - dy / this.cam.scale;
        return;
      }
    }
    this.setHovered(pickSystem(this.cam, this.systems, p.x, p.y));
  }

  pointerUp(e) {
    const wasClick = this.drag && !this.drag.moved;
    this.drag = null;
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    if (!wasClick) return;
    const p = this.localPoint(e);
    this.selected = pickSystem(this.cam, this.systems, p.x, p.y);
    this.refreshPanel();
  }

  doubleClick(e) {
    const p = this.localPoint(e);
    const idx = pickSystem(this.cam, this.systems, p.x, p.y);
    this.warp(idx >= 0 ? idx : this.selected);
  }

  setHovered(index) {
    if (index === this.hovered) return;
    this.hovered = index;
    this.canvas.style.cursor = index >= 0 ? 'pointer' : 'grab';
    this.refreshPanel();
  }

  // Zoom keeping the world point under the cursor fixed.
  wheel(e) {
    e.preventDefault();
    const p = this.localPoint(e);
    const before = toWorld(this.cam, p.x, p.y);
    const factor = Math.exp(-e.deltaY * 0.0015);
    this.cam.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.cam.scale * factor));
    this.cam.cx = before.x - (p.x - this.cam.w / 2) / this.cam.scale;
    this.cam.cz = before.z - (p.y - this.cam.h / 2) / this.cam.scale;
  }
}
