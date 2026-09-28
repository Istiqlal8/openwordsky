// Everything that runs while the player is on a planet surface.
import { Wildlife } from '../view/life/wildlife.js';
import { heightFn } from '../gen/terrain.js';
import { SurfaceGameplay } from '../gameplay/surface-gameplay.js';
import { floraTime } from '../view/life/flora-builder.js';
import { SPACE_ALTITUDE } from '../view/surface-flight.js';
import { SurfaceVisitors } from '../npc/surface-visitors.js';
import { Ruins } from '../surprise/ruins.js';
import { PetKeeper } from '../surprise/pets.js';
import { goldenToast } from '../surprise/golden.js';
import { SkyExtras } from '../view/cosmos/sky-extras.js';

export const SURFACE_HINTS = [['W A S D', 'Jalan'], ['Shift', 'Lari'], ['Space', 'Lompat / jetpack'], ['Klik\u00a0kiri', 'Tambang'],
  ['Klik\u00a0kanan', 'Tembak'], ['G', 'Isi suit'], ['T', 'Interaksi'], ['V', 'Kamera'], ['F', 'Pindai'], ['Tab', 'Inventori'], ['E', 'Naik pesawat']];
export const FLIGHT_HINTS = [['Mouse', 'Arah'], ['W', 'Maju'], ['Shift', 'Boost'], ['S', 'Rem'],
  ['Space / C', 'Naik / Turun'], ['E', 'Mendarat'], ['F', 'Pindai']];

export class SurfaceMode {
  constructor({ surface, player, sfx, hud }) {
    Object.assign(this, { surface, player, sfx, hud });
    this.gameplay = new SurfaceGameplay(surface, player, sfx);
    this.visitors = new SurfaceVisitors(surface);
    this.ruins = new Ruins(surface);
    this.pets = new PetKeeper(surface, player);
    this.wildlife = null;
    this.stepDist = 0;
    this.lastPos = null;
  }

  enter(planet, system, shipDesign, galaxySeed) {
    this.surface.mount(planet, system);
    if (shipDesign) this.surface.setShip?.(shipDesign);
    this.surface.resize(innerWidth, innerHeight);
    this.visitors.mount(planet);
    this.ruins.mount(planet, galaxySeed);
    this.skyExtras = new SkyExtras(this.surface.scene, planet);
    if (planet.golden) this.player.emit('notice', { text: goldenToast(planet) });
    this.wildlife = new Wildlife(this.surface.scene, planet, heightFn(planet), this.surface.position);
    this.wildlife.onBite = (sp, dmg) => { if (this.grounded()) this.player.damageSuit(dmg, `Diserang ${sp.name}`); };
    this.gameplay.mount(planet);
    this.gameplay.ctx.creatures = this.wildlife;
    this.wildlife.onKill = (pos, name) => this.creatureKilled(pos, name);
    this.lastPos = null;
  }

  creatureKilled(pos, name) {
    this.gameplay.ctx.fx.explode(pos, { color: 0x9cff6a, size: 0.5, debris: true });
    this.sfx.explosion(0.3);
    this.player.addItem('Protein Fauna', 1 + Math.floor(Math.random() * 3));
    this.player.emit('kill', { what: name });
  }

  // Only a player standing on (or just above) the ground can be bitten.
  grounded() {
    const s = this.surface;
    return !s.flying && s.feet.y - s.floorAt(s.feet.x, s.feet.z) < 2.5;
  }

  exit() {
    this.sfx.mineBeam(false);
    this.gameplay.dispose();
    this.wildlife?.dispose();
    this.wildlife = null;
    this.visitors.dispose();
    this.ruins.dispose();
    this.pets.dispose();
    this.skyExtras?.dispose();
    this.skyExtras = null;
    this.surface.dispose();
  }

  footsteps() {
    const pos = this.surface.position;
    if (this.lastPos) {
      const d = Math.hypot(pos.x - this.lastPos.x, pos.z - this.lastPos.z);
      this.stepDist += d < 5 ? d : 0;
      if (this.stepDist > 2.4) { this.stepDist = 0; this.sfx.step(); }
    }
    this.lastPos = { x: pos.x, z: pos.z };
  }

  // -> { creature, beam, wanted, storm } for the HUD.
  update(dt, input) {
    const alive = !this.player.dead;
    floraTime.value += dt;
    this.surface.update(dt, alive ? input : IDLE);
    if (alive) this.gameplay.update(dt, this.surface.flying ? IDLE : input);
    this.wildlife.update(dt, this.surface.position);
    this.visitors.update(dt);
    this.ruins.update(dt);
    this.skyExtras.update(dt, this.surface.camera, this.surface.sky?.nightFactor);
    this.pets.update(dt);
    if (alive && !this.surface.flying && input.pressed('KeyT')) this.interact();
    this.footsteps();
    if (alive && !this.surface.flying && input.pressed('Space')) this.sfx.jump();
    const beam = this.gameplay.beamTarget;
    this.sfx.mineBeam(Boolean(beam));
    const f = this.surface.flight;
    return { creature: this.wildlife.nearest(this.surface.position), beam,
      wanted: this.gameplay.wanted, storm: this.gameplay.storm,
      flying: f.active, canBoard: !f.active && f.canBoard(), canExit: f.canExit,
      leave: f.active && f.altitude > SPACE_ALTITUDE, speed: f.speed,
      visitor: this.visitors.nearest(this.surface.position, 40) };
  }

  // E: board the parked ship, or land and step out while flying low.
  door(s) {
    const flight = this.surface.flight, say = (text) => this.player.emit('notice', { text });
    if (s.flying && s.canExit) { flight.exit(); this.sfx.land(); }
    else if (s.flying) say('Terlalu tinggi, turunkan pesawat');
    else if (s.canBoard) { flight.board(); this.sfx.takeoff(); say('Terbang tinggi untuk ke luar angkasa'); }
    else say('Dekati pesawatmu untuk naik');
  }

  // T: tame a calm creature (costs Protein Fauna), else read a nearby ancient site.
  interact() {
    const tamed = this.pets.tryTame(this.wildlife, this.player);
    if (tamed) { this.player.emit('notice', { text: tamed }); return; }
    const r = this.ruins.interact(this.surface.feet, this.player);
    if (!r) { this.player.emit('notice', { text: 'Tidak ada yang bisa diajak berinteraksi' }); return; }
    this.player.emit('notice', { text: r.title });
    this.player.emit('notice', { text: r.text });
    if (r.reward?.label) this.player.emit('notice', { text: r.reward.label });
  }

  onRespawn() {
    this.gameplay.onRespawn();
    this.wildlife?.calmDown(10);
  }
}

const IDLE = { down: () => false, pressed: () => false, mouseDown: () => false, clicked: () => false,
  mouse: { dx: 0, dy: 0 }, locked: false };
