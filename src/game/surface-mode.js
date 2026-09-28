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
import { HomeBase } from '../base/home-base.js';
import { AlienOutposts } from '../aliens/index.js';
import { Settlements } from '../villages/settlements.js';
import { breathable } from '../gameplay/life-support.js';
import { pushOut } from './colliders.js';
import { setCurvature, curveScene } from '../view/curvature.js';
import { huntTrophy } from '../quest/materials.js';
import { gatherFromAnimal } from '../gameplay/animal-gather.js';
import { NpcBadges, explorerNear } from '../npc/npc-badges.js';

export const SURFACE_HINTS = [['W A S D', 'Jalan'], ['Shift', 'Lari'], ['Space', 'Lompat / jetpack'], ['Klik\u00a0kiri', 'Tambang / Tembak'], ['1–7', 'Senjata'],
  ['Klik\u00a0kanan', 'Tembak'], ['G', 'Isi suit'], ['T', 'Interaksi'], ['Q', 'Ambil hasil hewan'], ['J', 'Misi'], ['V', 'Kamera'], ['F', 'Pindai'], ['Tab', 'Inventori'], ['E', 'Naik pesawat']];
export const FLIGHT_HINTS = [['Mouse', 'Arah'], ['W', 'Maju'], ['Shift', 'Boost'], ['S', 'Rem'],
  ['Space / C', 'Naik / Turun'], ['E', 'Mendarat'], ['F', 'Pindai']];

export class SurfaceMode {
  constructor({ surface, player, sfx, hud }) {
    Object.assign(this, { surface, player, sfx, hud });
    this.gameplay = new SurfaceGameplay(surface, player, sfx);
    this.visitors = new SurfaceVisitors(surface);
    this.badges = new NpcBadges(surface);
    this.ruins = new Ruins(surface);
    this.pets = new PetKeeper(surface, player);
    this.base = new HomeBase(surface);
    this.aliens = new AlienOutposts(surface, player);
    this.villages = new Settlements(surface);
    this.wildlife = null;
    this.stepDist = 0;
    this.lastPos = null;
  }

  enter(planet, system, shipDesign, galaxySeed) {
    this.surface.mount(planet, system);
    if (shipDesign) this.surface.setShip?.(shipDesign);
    this.surface.resize(innerWidth, innerHeight);
    this.base.mount(planet); // Earth only: home base; parks the ship on its pad
    this.aliens.mount(planet);
    this.villages.mount(planet);
    this.surface.avatar?.setCasual(breathable(planet)); // no suit where the air is breathable
    setCurvature(planet);
    this.curveT = 0;
    this.visitors.mount(planet);
    this.badges.mount(planet);
    this.ruins.mount(planet, galaxySeed);
    this.skyExtras = new SkyExtras(this.surface.scene, planet);
    if (planet.golden) this.player.emit('notice', { text: goldenToast(planet) });
    this.wildlife = new Wildlife(this.surface.scene, planet, heightFn(planet), this.surface.position);
    this.wildlife.onBite = (sp, dmg) => { if (this.grounded()) this.player.damageSuit(dmg, `Diserang ${sp.name}`); };
    this.gameplay.mount(planet);
    this.gameplay.ctx.creatures = this.wildlife;
    this.gameplay.ctx.visitors = this.visitors;
    this.wildlife.onKill = (pos, name, sp) => this.creatureKilled(pos, name, sp);
    this.lastPos = null;
  }

  creatureKilled(pos, name, sp) {
    this.gameplay.ctx.fx.explode(pos, { color: 0x9cff6a, size: 0.5, debris: true });
    this.sfx.explosion(0.3);
    this.player.addItem('Protein Fauna', 1 + Math.floor(Math.random() * 3));
    if (Math.random() < 0.7) this.player.addItem(huntTrophy(sp), 1);
    this.player.emit('kill', { what: name });
    this.player.emit('act', { type: 'hunt' });
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
    this.badges.dispose();
    this.base.dispose();
    this.aliens.dispose();
    this.villages.dispose();
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
    this.collide();
    this.environment(dt, alive);
    if ((this.curveT -= dt) <= 0) { this.curveT = 1; curveScene(this.surface.scene); } // bend newly spawned things too
    if (alive) this.gameplay.update(dt, this.surface.flying ? IDLE : input);
    this.wildlife.update(dt, this.surface.position);
    this.visitors.update(dt);
    this.badges.update(dt, this.visitors);
    this.ruins.update(dt);
    this.base.update(dt, this.surface.position, this.surface.sky?.nightFactor);
    this.aliens.update(dt, this.surface.position);
    this.villages.update(dt, this.surface.position, this.surface.sky?.nightFactor);
    this.skyExtras.update(dt, this.surface.camera, this.surface.sky?.nightFactor);
    this.pets.update(dt);
    const action = alive && !this.surface.flying && input.pressed('KeyT') ? this.interact() : null;
    if (alive && this.grounded() && input.pressed('KeyQ')) this.gather();
    this.footsteps();
    if (alive && !this.surface.flying && input.pressed('Space')) this.sfx.jump();
    const beam = this.gameplay.beamTarget;
    this.sfx.mineBeam(Boolean(beam));
    const f = this.surface.flight;
    // Engine hum while flying the ship over the planet (idle hum even when hovering).
    this.sfx.setEngine(f.active ? 0.25 + Math.min(0.75, f.speed / 240) : 0);
    return { creature: this.wildlife.nearest(this.surface.position), beam,
      wanted: this.gameplay.wanted, storm: this.gameplay.storm,
      flying: f.active, canBoard: !f.active && f.canBoard(), canExit: f.canExit,
      leave: f.active && f.altitude > SPACE_ALTITUDE, speed: f.speed,
      visitor: this.visitors.nearest(this.surface.position, 40), home: this.base.nearest(this.surface.feet), action,
      alien: this.aliens.nearest(this.surface.feet), villager: this.villages.nearest(this.surface.feet) };
  }

  // Entering from space: start airborne above the landing area, gliding toward it.
  arriveFlying() {
    const s = this.surface, g = s.landed?.model.group;
    if (!g) return;
    g.rotation.set(0, 0, 0);
    s.flight.board();
    const sp = s.spawn;
    g.position.set(sp.x, s.floorAt(sp.x, sp.z + 260) + 220, sp.z + 260);
    s.flight.speed = 90;
    s.pitch = -0.28;
  }

  // E: board the parked ship, or land and step out while flying low.
  door(s) {
    const flight = this.surface.flight, say = (text) => this.player.emit('notice', { text });
    if (s.flying && s.canExit) { flight.exit(); this.sfx.land(); }
    else if (s.flying) say('Terlalu tinggi, turunkan pesawat');
    else if (s.canBoard) { flight.board(); this.sfx.takeoff(); say('Terbang tinggi untuk ke luar angkasa'); }
    else say('Dekati pesawatmu untuk naik');
  }

  // Water and lava: oxygen drains underwater, lava burns.
  environment(dt, alive) {
    const life = this.gameplay.life;
    if (life) life.submerged = Boolean(this.surface.underwater);
    this.lavaDmg = alive && this.surface.inLava ? (this.lavaDmg ?? 0) + 20 * dt : 0;
    if (this.lavaDmg >= 10) { this.player.damageSuit(this.lavaDmg, 'Lava'); this.lavaDmg = 0; }
  }

  // Buildings and the parked ship are solid for a player on foot.
  collide() {
    const s = this.surface;
    if (s.flying || !s.feet) return;
    const solids = [...this.base.colliders(), ...this.aliens.colliders(), ...this.villages.colliders()];
    if (s.landed && s.shipPosition) solids.push({ x: s.shipPosition.x, z: s.shipPosition.z, r: (s.landed.radius ?? 3) * 0.8 });
    if (pushOut(s.feet, solids)) s.updateCamera(0);
  }

  // Landmarks for the radar: the home base (green) and ancient ruins (purple).
  places() {
    const out = [];
    const c = this.base.center;
    if (c) out.push({ x: c.x, z: c.z, color: '#7dffb2' });
    out.push(...this.villages.places());
    const site = this.aliens.site;
    if (site) out.push({ x: site.position.x, z: site.position.z, color: '#ffd166' });
    const r = this.ruins.nearest(this.surface.feet);
    if (r) out.push({ x: r.x, z: r.z, color: '#c89bff' });
    return out;
  }

  // T: tame a calm creature (costs Protein Fauna), else read a nearby ancient site.
  // Returns a base action ('hangar' | 'shipyard' | 'rest' | 'store') for main to handle, else null.
  interact() {
    const act = this.base.interact(this.surface.feet);
    if (act) return act;
    const chat = this.villages.interact(this.surface.feet); // villagers and doors (5 m)
    if (chat) {
      this.player.emit('notice', { text: chat.title });
      this.player.emit('notice', { text: chat.text });
      if (chat.gift) this.player.addItem(chat.gift.item, chat.gift.count);
      return null;
    }
    const deal = this.aliens.interact(this.surface.feet); // alien vendors/residents (5 m)
    if (deal) { this.player.emit('notice', { text: deal.title }); this.player.emit('notice', { text: deal.text }); return null; }
    const npc = explorerNear(this.visitors, this.surface.feet);
    if (npc) { this.player.emit('npcTalk', { seed: npc.seed, name: npc.name }); return null; }
    const tamed = this.pets.tryTame(this.wildlife, this.player);
    if (tamed) {
      this.player.emit('notice', { text: tamed });
      if (!tamed.startsWith('Butuh')) this.player.emit('act', { type: 'tame' });
      return null;
    }
    const r = this.ruins.interact(this.surface.feet, this.player);
    if (!r) { this.player.emit('notice', { text: 'Tidak ada yang bisa diajak berinteraksi' }); return null; }
    this.player.emit('notice', { text: r.title });
    this.player.emit('notice', { text: r.text });
    if (r.reward?.label) this.player.emit('notice', { text: r.reward.label });
    if (r.reward) this.player.emit('act', { type: 'ruin' });
    return null;
  }

  gather() {
    this.player.emit('notice', { text: gatherFromAnimal(this.wildlife, this.surface.feet, this.player) });
  }

  onRespawn() {
    this.gameplay.onRespawn();
    this.wildlife?.calmDown(10);
  }
}

const IDLE = { down: () => false, pressed: () => false, mouseDown: () => false, clicked: () => false,
  mouse: { dx: 0, dy: 0 }, locked: false };
