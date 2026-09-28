// GasDive: fly your ship inside a gas giant (no landing, no walking). Enter at the cloud tops
// (altitude 0), dive down to crushing depth (-3000), climb above +400 to leave for space.
// Contract: mount(planet, system, design) / update(dt, input) / render / resize / dispose.
import * as THREE from 'three';
import { buildShip } from '../ship/ship-model.js';
import { gasPalette } from './gas-palette.js';
import { GasAtmosphere, TOP_EXIT } from './gas-atmosphere.js';
import { CloudSea } from './cloud-sea.js';
import { GasSky } from './gas-sky.js';
import { GasStormEye } from './gas-storm-eye.js';
import { GasLightning } from './gas-lightning.js';
import { GasWind } from './gas-wind.js';
import { GasCreatures } from './gas-creatures.js';
import { GasRocks } from './gas-rocks.js';
import { GasFlight } from './gas-flight.js';
import { GasHazards } from './gas-hazards.js';

const ENTRY_ALT = 120;
const SUN_DIR = new THREE.Vector3(0.35, 0.75, -0.55).normalize();
const WIND = new THREE.Vector3(14, 0, 4);
const _air = new THREE.Vector3();

export class GasDive {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0001);
    this._camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.5, 45000);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 1);
    this.scene.add(this.sun, this.sun.target, this.hemi);
    this.hazards = new GasHazards();
    this.onDamage = null; // set by the owner: (amount, cause) => void
    this.hazards.onDamage = (a, c) => this.onDamage?.(a, c);
    this.result = { leave: false, depth: 0, altitude: 0, speed: 0, warning: null };
    this.parts = null;
  }

  get camera() { return this._camera; }

  mount(planet, system, design) {
    this.unmount();
    const pal = gasPalette(planet);
    const s = this.scene, starColor = system?.star?.color ?? 0xfff1c8;
    const ship = buildShip(design);
    s.add(ship.group);
    this.parts = {
      pal, ship, atm: new GasAtmosphere(pal), clouds: new CloudSea(s, pal), sky: new GasSky(s, pal, starColor, SUN_DIR),
      eye: new GasStormEye(s, pal), lightning: new GasLightning(s, pal.glow.getHex()), wind: new GasWind(s, pal.glow.getHex()),
      creatures: new GasCreatures(s, pal), rocks: new GasRocks(s, pal), flight: new GasFlight(ship, design),
    };
    this.sun.color.set(starColor);
    this.parts.flight.reset(ENTRY_ALT);
    this.hazards.reset();
    this.planet = planet;
    this.time = 0;
  }

  update(dt, input) {
    const p = this.parts, r = this.result;
    if (!p) return r;
    this.time += dt;
    const pos = p.flight.position;
    const storm = p.clouds.stormAt(pos, this.time);
    this.storm = storm;
    const turb = GasHazards.turbulence(pos.y, storm);
    p.flight.update(dt, input, turb);
    p.flight.placeCamera(this._camera, turb);
    const cam = this._camera.position;
    const ev = p.lightning.update(dt, { cam, alt: pos.y, depth: r.depth, storm, clouds: p.clouds, time: this.time });
    if (ev.shake > 0) p.flight.kick(ev.shake);
    const atm = p.atm.at(pos.y, p.lightning.flash.level * this.flashNear(cam));
    this.applyAtmosphere(atm, pos);
    this.updateWorld(dt, cam, atm, turb);
    r.warning = this.hazards.update(dt, pos.y, storm, ev.hit);
    Object.assign(r, { leave: pos.y > TOP_EXIT, depth: atm.depth, altitude: pos.y, speed: p.flight.speed });
    return r;
  }

  // 0..1: how close the current lightning flash is (distant flashes barely light the fog).
  flashNear(cam) {
    const d = this.parts.lightning.flash.pos.distanceTo(cam);
    return Math.max(0, 1 - d / 1800);
  }

  applyAtmosphere(atm, pos) {
    this.scene.fog.color.copy(atm.fog);
    this.scene.fog.density = atm.density;
    this.sun.intensity = 2.4 * atm.sun;
    this.sun.position.copy(pos).addScaledVector(SUN_DIR, 200);
    this.sun.target.position.copy(pos);
    this.hemi.intensity = 0.4 + atm.ambient * 0.9;
    this.hemi.color.copy(atm.zenith).lerp(atm.fog, 0.5).addScalar(0.15);
    this.hemi.groundColor.copy(atm.nadir);
  }

  updateWorld(dt, cam, atm, turb) {
    const p = this.parts, t = this.time;
    p.clouds.update(t, cam, p.atm.light, p.lightning.flash);
    p.sky.update(cam, atm);
    p.eye.update(t, cam);
    this.updateFauna(dt, cam);
    p.rocks.update(t, cam);
    _air.copy(WIND).addScaledVector(p.flight.gust, -0.5);
    p.wind.update(dt, cam, _air, p.flight.velocity, turb);
  }

  // Creatures react to the ship; storm eels may zap nearby (shake, rare light damage).
  updateFauna(dt, cam) {
    const p = this.parts;
    const ev = p.creatures.update({ dt, time: this.time, cam, ship: p.flight.position, vel: p.flight.velocity, storm: this.storm });
    if (ev.shake > 0) p.flight.kick(ev.shake);
    if (ev.damage > 0) this.onDamage?.(ev.damage, 'Belut Badai');
  }

  // Closest creature to the ship for the scanner: { name, distance } (metres) or null.
  nearestCreature() {
    return this.parts ? this.parts.creatures.nearest(this.parts.flight.position) : null;
  }

  render(renderer) {
    renderer.render(this.scene, this._camera);
  }

  resize(w, h) {
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
  }

  unmount() {
    const p = this.parts;
    if (!p) return;
    for (const k of ['clouds', 'sky', 'eye', 'lightning', 'wind', 'creatures', 'rocks']) p[k].dispose();
    p.ship.group.removeFromParent();
    p.ship.dispose();
    p.pal.bandTex.dispose();
    this.parts = null;
  }

  dispose() {
    this.unmount();
    this.sun.dispose();
    this.hemi.dispose();
  }
}
