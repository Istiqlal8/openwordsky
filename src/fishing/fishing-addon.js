// Meta addon: fishing on water planets. X at the shore (or on a pier) casts; X again strikes on a
// bite, then hold X to keep the reel marker in the zone. State in log.s.fish (see fish-log.js).
import { fishHub } from './hub.js';
import { FishSession } from './fish-session.js';
import { castSpot, tooFar } from './fish-spot.js';
import { rollFish, rollSize, fishOf, TIER } from './fish-species.js';
import { fishState, recordCatch, speciesRows } from './fish-log.js';
import { castSound, splashSound, biteSound, catchSound, snapSound } from './fish-sfx.js';
import { FishingReel, fishCard } from '../ui/fishing-view.js';

const KEY = 'KeyX';

export class FishingAddon {
  constructor(w) {
    this.w = w;
    this.s = fishState(w.log.s);
    this.session = new FishSession();
    this.reel = new FishingReel(w.panel.tracker.parentNode);
    this.last = performance.now();
    this.spot = null;
    this.from = null;
    w.panel.sections.push({ journal: () => this.journal() });
  }

  update(input) {
    const now = performance.now(), dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    const scene = fishHub.scene;
    if (!this.w.planet || !scene || this.w.player.dead) { this.stop(scene); return; }
    if (!this.session.active) { if (input.pressed(KEY)) this.cast(scene); }
    else this.step(dt, input, scene);
    scene.show(this.session.state, this.spot);
    this.reel.draw(this.session);
  }

  cast(scene) {
    const sf = scene.surface;
    if (sf.flying || !sf.planet?.terrain.hasWater) return; // X is ship roll in flight
    const spot = castSpot(sf);
    if (spot.why) { this.w.hud.toast(spot.why); return; }
    this.spot = spot;
    this.from = { x: sf.feet.x, z: sf.feet.z };
    this.session.cast(rollFish(sf.planet, Math.random, scene.night || scene.storm));
    castSound(this.w.sfx);
  }

  step(dt, input, scene) {
    const sf = scene.surface, ses = this.session;
    if (sf.flying || sf.swimming || tooFar(sf, this.spot, this.from)) { this.lose('Tali pancing putus'); return; }
    if (ses.state === 'wait' && input.pressed(KEY)) { ses.cancel(); this.w.hud.toast('Kail digulung'); return; }
    const ev = ses.update(dt, input.down(KEY), input.pressed(KEY));
    if (ev) this.on(ev, ses.fish);
  }

  on(ev, fish) {
    const { hud, sfx } = this.w;
    if (ev === 'landed') splashSound(sfx);
    else if (ev === 'bite') { biteSound(sfx); hud.toast('Tarik! (X)'); }
    else if (ev === 'hooked') splashSound(sfx);
    else if (ev === 'missed') hud.toast('Umpan dimakan, ikannya kabur');
    else if (ev === 'escaped') { snapSound(sfx); hud.toast(`${fish.item} lolos!`); }
    else if (ev === 'caught') this.land(fish);
  }

  land(fish) {
    const { w } = this, size = rollSize(fish, Math.random);
    const rec = recordCatch(this.s, fish, size);
    w.player.addItem(fish.item, 1);
    w.player.emit('act', { type: 'fish', item: fish.item, tier: fish.tier, size });
    const extra = rec.isNew ? ' · spesies baru!' : rec.best ? ' · rekor baru!' : '';
    w.hud.toast(`Tertangkap: ${fish.item} (${TIER[fish.tier].label}) · ${size} cm${extra}`);
    if (fish.tier === 'legendary' || rec.isNew) w.sfx.discover?.(); else catchSound(w.sfx);
    w.log.version++;
  }

  lose(text) {
    this.session.cancel();
    snapSound(this.w.sfx);
    this.w.hud.toast(text);
  }

  stop(scene) {
    if (this.session.active) this.session.cancel();
    scene?.show('idle');
    this.reel.hide();
  }

  departed() { this.stop(null); }

  journal() {
    const p = this.w.planet, water = p?.terrain?.hasWater && !p.gas;
    if (!this.s.caught && !water) return null;
    return fishCard(this.s, speciesRows(this.s), water ? fishOf(p) : null);
  }
}
