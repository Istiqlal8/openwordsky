// Everything that runs while flying inside a star system.
import { SpaceCombat } from '../combat/space-combat.js';
import { SpaceTraffic } from '../npc/space-traffic.js';
import { AlienShips } from '../aliens/index.js';
import { Derelict } from '../surprise/derelict.js';
import { VoidFauna } from '../surprise/void-fauna.js';
import { collideRocks, rockImpactDamage } from './rock-collision.js';
import { SpaceEvents } from '../view/cosmos/space-events.js';

export const SPACE_HINTS = [['Mouse', 'Arah'], ['W A S D', 'Dorong'], ['Space', 'Pulse'], ['R / C', 'Naik / Turun'], ['Z / X', 'Guling'],
  ['Shift', 'Boost'], ['Klik\u00a0kiri', 'Laser'], ['Klik\u00a0kanan', 'Roket'], ['V / G', 'Kamera / Isi daya'], ['F / E', 'Pindai / Mendarat'],
  ['H / B', 'Hangar / Bengkel'], ['Shift+H / B', 'Kapal induk'], ['M', 'Peta Galaksi'], ['J / L', 'Misi / Koleksi'], ['U / Y', 'Racik / Armada'], ['`', 'Pengaturan']];

const PULSE_DRAIN = 1.2; // energy per second
const AUTO_LAND_GAP = (r) => Math.max(4, r * 0.25);

const IDLE = { down: () => false, pressed: () => false, mouseDown: () => false, clicked: () => false,
  mouse: { dx: 0, dy: 0 }, locked: false };

// Same input, but Shift (boost) reads as released.
function withoutBoost(input) {
  return { ...input, down: (code) => code !== 'ShiftLeft' && input.down(code), mouse: input.mouse,
    pressed: (c) => input.pressed(c), mouseDown: (b) => input.mouseDown(b), clicked: (b) => input.clicked(b) };
}

export class SpaceMode {
  constructor({ space, player, sfx }) {
    Object.assign(this, { space, player, sfx });
    this.combat = new SpaceCombat(space, player, sfx);
    this.traffic = new SpaceTraffic(space);
    this.alienShips = new AlienShips(space);
    this.derelict = new Derelict(space, { player, onLoot: (text) => player.emit('notice', { text }) });
    this.voidFauna = new VoidFauna(space, { player, sfx, fx: () => this.combat.fx,
      onNotice: (text) => player.emit('notice', { text }), onImpact: () => sfx.hit?.() });
    this.combat.onExtraHit = (bolt) => this.voidFauna.boltHit(bolt);
    this.lock = false;
    player.on('lockOn', ({ locked }) => { this.lock = locked; });
    // Stars scorch; a black hole's horizon is lethal within a second.
    space.onStarBurn = (dt) => player.damageShip((space.system.star.blackHole ? 400 : 35) * dt);
    this.events = new SpaceEvents(space.scene);
    this.events.onShake = (a) => space.shake(a);
  }

  enter(system, planets, spawnNear, design) {
    this.space.mount(system, planets, { spawnNear });
    this.traffic.mount(system);
    this.alienShips.mount(system);
    this.derelict.mount(system);
    this.voidFauna.mount(system);
    this.events.mount(system);
    if (design) this.space.setShip?.(design);
    this.combat.mount(system);
  }

  // Leaving for a planet surface: stop combat noise, keep the system scene.
  exit() {
    this.sfx.alarm(false);
    this.sfx.setEngine(0);
    this.combat.dispose();
    this.events.dispose();
  }

  // Space toggles the pulse drive; it burns energy and drops out near bodies or when empty.
  pulse(dt, input) {
    const sp = this.space;
    if (input.pressed('Space')) sp.setPulse(!sp.pulsing && this.player.ship.energy > 5);
    if (!sp.pulsing) return;
    this.player.ship.energy = Math.max(0, this.player.ship.energy - PULSE_DRAIN * dt);
    if (this.player.ship.energy <= 0) sp.setPulse(false, 'empty');
  }

  // Flying into a planet's atmosphere lands automatically (gas giants: an in-ship dive).
  autoLand(target) {
    return target && target.distance <= AUTO_LAND_GAP(target.planet.radius) ? target.planet : null;
  }

  update(dt, input) {
    const alive = !this.player.dead;
    const inp = !alive ? IDLE : this.combat.boostAllowed ? input : withoutBoost(input);
    if (alive) this.pulse(dt, input);
    this.space.update(dt, inp);
    this.traffic.update(dt);
    this.alienShips.update(dt);
    this.bumpRocks(alive);
    this.space.setHull?.(this.player.ship.hull);
    this.events.update(dt, this.space.camera);
    this.derelict.update(dt, this.space.shipObject.position);
    this.voidFauna.update(dt, this.space.shipObject.position);
    this.combat.update(dt, inp);
    this.sfx.setEngine(Math.min(1, this.space.speed / 320));
    this.sfx.alarm(alive && this.player.ship.hull < 25);
    const target = this.space.targetPlanet();
    return {
      target, looked: this.space.lookedPlanet(), landOn: alive ? this.autoLand(target) : null,
      hostiles: this.combat.hostiles, lock: this.lock, boostAllowed: this.combat.boostAllowed,
      pulse: this.space.pulsing, npcShip: this.traffic.nearest(this.space.ship.position, 300),
    };
  }

  // Solid asteroids: push the ship out, bounce it, and scratch the hull on hard hits.
  bumpRocks(alive) {
    const rocks = this.combat.asteroids?.visible;
    if (!rocks?.length) return;
    const impact = collideRocks(this.space.shipObject.position, this.space.velocity, rocks);
    if (!impact) return;
    this.space.shake?.(Math.min(1, impact / 60));
    this.sfx.hit?.();
    const dmg = rockImpactDamage(impact);
    if (alive && dmg > 0) this.player.damageShip(dmg);
  }

  onRespawn() {
    this.combat.onRespawn();
  }

  idle(dt) {
    this.space.update(dt, IDLE);
    this.voidFauna.update(dt, null);
    this.events.update(dt, this.space.camera);
    this.traffic.update(dt);
    this.alienShips.update(dt);
  }
}
