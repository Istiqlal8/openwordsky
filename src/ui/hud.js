// Hud: DOM overlay for all in-game readouts. Builds everything inside #hud.
import { el, clear, show, hexCss, fmtTemp, fmtDistance, keyRow, hazardIcon } from './dom.js';
import { TitleScreen, PauseScreen } from './hud-screens.js';
import { ScanPanel } from './hud-scan.js';

const TOAST_MS = 3000;
const WARP_MS = 1200;

export class Hud {
  constructor(root) {
    this.root = root;
    root.classList.add('hud');
    this.buildSpaceWidgets();
    this.buildSurfaceWidgets();
    this.buildCommonWidgets();
    this.scan = new ScanPanel(root);
    this.title = new TitleScreen(root);
    this.pause = new PauseScreen(root);
    this.setMode('space');
  }

  buildSpaceWidgets() {
    this.system = el('div', 'panel sys only-space');
    this.target = el('div', 'target only-space is-hidden');
    this.speed = el('div', 'speed only-space');
    this.root.append(this.system, this.target, this.speed);
  }

  buildSurfaceWidgets() {
    this.location = el('div', 'panel loc only-surface');
    this.root.append(this.location);
  }

  buildCommonWidgets() {
    this.crosshair = el('div', 'crosshair');
    this.stats = el('div', 'stats');
    this.hints = el('div', 'hints');
    this.toasts = el('div', 'toasts');
    this.flash = el('div', 'warp');
    for (let i = 0; i < 18; i++) {
      const s = el('i', 'warp-streak');
      s.style.setProperty('--a', `${i * 20 + (i % 3) * 7}deg`);
      s.style.setProperty('--d', `${(i % 5) * 60}ms`);
      this.flash.append(s);
    }
    this.root.append(this.crosshair, this.stats, this.hints, this.toasts, this.flash);
  }

  onStart(cb) {
    this.title.onStart = cb;
  }

  showTitle(visible, info) {
    this.title.set(visible, info);
    this.root.classList.toggle('is-title', visible);
  }

  showPaused(visible) {
    this.pause.set(visible);
  }

  setMode(mode) {
    this.root.dataset.mode = mode;
  }

  setSystem(system, planets, currentPlanetIndex) {
    clear(this.system);
    const star = el('div', 'sys-star');
    const dot = el('span', 'dot');
    dot.style.setProperty('--c', hexCss(system.star.color));
    star.append(dot, el('span', null, (system.star.blackHole || system.star.label === "Matahari" ? system.star.label : `Bintang ${system.star.label}`)));
    const list = el('ol', 'sys-list');
    planets.forEach((p, i) => {
      const li = el('li', i === currentPlanetIndex ? 'is-current' : null);
      li.append(el('span', 'sys-planet', p.name), el('span', 'sys-biome', p.biome.label));
      list.append(li);
    });
    this.system.append(el('div', 'panel-label', 'Sistem'), el('div', 'sys-name', system.name), star, list);
  }

  setTarget(target, canLand) {
    show(this.target, !!target);
    if (!target) return;
    clear(this.target);
    const { planet, distance } = target;
    this.target.append(el('div', 'target-name', planet.name));
    const meta = el('div', 'target-meta');
    meta.append(el('span', null, planet.biome.label), el('span', 'target-dist', fmtDistance(distance)));
    this.target.append(meta);
    if (canLand) this.target.append(keyRow('E', 'Mendarat'));
    this.target.classList.toggle('can-land', !!canLand);
  }

  setSpeed(speed) {
    this.speed.textContent = `${Math.round(speed)} u/s`;
  }

  setSurface(planet, extra) {
    clear(this.location);
    this.location.append(el('div', 'panel-label', 'Lokasi'), el('div', 'loc-name', planet.name));
    this.location.append(el('div', 'loc-biome', planet.biome.label));
    const stats = el('div', 'loc-stats');
    stats.append(el('span', null, fmtTemp(planet.temperature)), el('span', null, planet.weather));
    this.location.append(stats);
    if (planet.hazard) {
      const hz = el('div', 'loc-hazard');
      hz.append(hazardIcon(), el('span', null, planet.hazard));
      this.location.append(hz);
    }
    this.appendCreature(extra?.creature ?? null);
  }

  appendCreature(creature) {
    if (!creature) return;
    const box = el('div', 'loc-creature');
    box.append(el('span', null, `${creature.name} · ${fmtDistance(creature.distance)}`));
    box.append(keyRow('F', 'Pindai'));
    this.location.append(box);
  }

  showScan(planet, isNew) {
    this.scan.show(planet, isNew);
  }

  get scanOpen() {
    return this.scan.isOpen;
  }

  hideScan() {
    this.scan.hide();
  }

  setHints(pairs) {
    clear(this.hints);
    for (const [keys, label] of pairs) this.hints.append(keyRow(keys, label));
  }

  setStats({ discoveries, visited, total }) {
    clear(this.stats);
    const disc = el('div', 'stat');
    disc.append(el('span', 'stat-key', 'Penemuan'), el('span', 'stat-val', `${discoveries} / ${Number(total).toLocaleString('id-ID')}`));
    const vis = el('div', 'stat');
    vis.append(el('span', 'stat-key', 'Sistem'), el('span', 'stat-val', String(visited)));
    this.stats.append(disc, vis);
  }

  toast(text) {
    const t = el('div', 'toast', text);
    this.toasts.append(t);
    setTimeout(() => t.classList.add('is-out'), TOAST_MS - 400);
    setTimeout(() => t.remove(), TOAST_MS);
    while (this.toasts.childElementCount > 4) this.toasts.firstChild.remove();
  }

  warpFlash() {
    this.flash.classList.remove('is-on');
    void this.flash.offsetWidth; // restart animation
    this.flash.classList.add('is-on');
    clearTimeout(this.warpTimer);
    this.warpTimer = setTimeout(() => this.flash.classList.remove('is-on'), WARP_MS);
  }

  setCrosshair(visible) {
    show(this.crosshair, visible);
  }
}
