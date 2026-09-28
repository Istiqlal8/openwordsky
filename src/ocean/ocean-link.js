// Glue between the surface mode and the ocean: owns the deep-sea world (registered as a
// Wildlife group) and the submarine, and turns both into one HUD state object.
import { DeepSea } from './deep-sea.js';
import { Submarine } from './submarine.js';

export const SUB_HINTS = [['Mouse', 'Arah'], ['W / S', 'Maju / Mundur'], ['A / D', 'Geser'], ['Shift', 'Boost'],
  ['Space / C', 'Naik / Turun'], ['F', 'Lampu'], ['P', 'Sonar'], ['E', 'Keluar']];
export const SUMMON_KEY = 'KeyK'; // "Kapal selam": free on foot (K only rerolls inside the journal)

export class OceanLink {
  constructor(surface, player, sfx) {
    Object.assign(this, { surface, player, sfx });
    this.sub = new Submarine(surface);
    this.sea = null;
    this.state = { sub: false, depth: 0, subPrompt: null, sonar: null };
  }

  get active() { return this.sub.active; }

  // heightFn: the planet's terrain function; wildlife: the group list the sea joins.
  mount(planet, heightFn, wildlife) {
    this.sea = new DeepSea(this.surface.scene, planet, heightFn, this.surface.spawn);
    wildlife.groups.push(this.sea);
    this.sea.onBite = wildlife.groups[0].onBite; // pushed in after Wildlife.onBite was set
    this.sub.mount(planet);
    this.sub.sonarSources = [this.sea, wildlife];
    this.surface.vehicle = this.sub;
  }

  // Before surface.update(): while aboard, the submarine places feet, head and camera.
  // Also hands the sea its view, which Wildlife.update reads when it ticks the group.
  update(dt, input) {
    const s = this.sub.update(dt, input), sf = this.surface;
    const f = sf.flight, depth = this.sub.active ? s.depth : f.active ? f.depth : 0;
    Object.assign(this.state, { sub: this.sub.active, depth, sonar: s.sonar, subPrompt: this.prompt(s) });
    if (s.sonar) this.sfx.scan();
    if (this.sea) Object.assign(this.sea.view, { camera: sf.camera.position, underwater: sf.underwater,
      swimming: sf.swimming, player: sf.feet, daylight: sf.sky?.cycle?.daylight ?? 1 });
    return this.state;
  }

  // After the wildlife tick: below the surface the sea darkens the fog and the lights.
  afterWildlife() {
    if (this.surface.underwater) this.sea?.applyLook(this.surface.sky);
  }

  // One stable line for the HUD (the live depth goes in the hints, so it can't spam toasts).
  prompt(s) {
    if (!this.sub.active) return s.prompt ? 'E  Naik kapal selam' : null;
    if (s.hull <= 0) return 'Lambung rusak! Naik ke permukaan';
    return s.depth < 1.2 ? 'E  Keluar dari kapal selam' : null;
  }

  // E next to (or inside) the submarine. Returns a message, or null when E means something else.
  door() {
    const msg = this.sub.door();
    if (msg) this.sfx.land();
    return msg;
  }

  // The summon key on foot: bring the submarine to the nearest deep water.
  summon() {
    const say = (text) => this.player.emit('notice', { text });
    if (this.surface.flying) return;
    if (!this.sub.summon(this.surface.feet)) { say('Tidak ada laut yang cukup dalam di dekat sini'); return; }
    this.sfx.land();
    say('Kapal selam tiba — dekati lalu tekan E');
  }

  // Called before the wildlife (and with it the sea) is disposed.
  dispose() {
    this.sub.dispose();
    this.sea = null;
    this.surface.vehicle = null;
  }
}
