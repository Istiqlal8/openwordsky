// Connects the quest log to the game: journal keys, completion feedback, contract refills.
import { QuestLog } from '../quest/quest-log.js';
import { QuestPanel } from '../ui/quest-panel.js';
import { PlanetCollection } from '../quest/planet-collection.js';
import { requestOf } from '../quest/npc-requests.js';
import { ADDONS } from './addons.js';

export class QuestWiring {
  constructor({ save, player, hud, sfx, hudRoot }) {
    Object.assign(this, { save, player, hud, sfx });
    this.log = new QuestLog(save, player);
    this.collection = new PlanetCollection(this.log, player);
    this.panel = new QuestPanel(hudRoot, this.log, this.collection);
    this.seen = -1;
    this.planet = null;
    this.log.onComplete = (q, rankUp) => this.completed(q, rankUp);
    this.log.refill(null);
    player.on('npcTalk', ({ seed, name }) => this.talk(seed, name));
    this.addons = ADDONS.map((A) => new A(this));
  }

  completed(q, rankUp) {
    this.sfx.discover?.();
    this.hud.toast(`Misi selesai: ${q.title} · +${q.reward.nanit} Nanit`);
    if (rankUp) this.hud.toast(`Pangkat baru: ${rankUp.name}`);
    this.log.refill(this.planet);
  }

  arrived(planet) {
    this.planet = planet;
    this.collection.setPlanet(planet);
    this.player.emit('act', { type: 'land', biome: planet.biome?.id });
    this.log.refill(planet);
    for (const a of this.addons) a.arrived?.(planet);
  }

  departed() {
    this.planet = null;
    this.collection.setPlanet(null);
    this.log.refill(null);
    for (const a of this.addons) a.departed?.();
  }

  scanned(isNew) {
    this.player.emit('act', { type: 'scan' });
    if (isNew) this.player.emit('act', { type: 'discover' });
  }

  sawCreature(creature) {
    if (creature?.name) this.player.emit('act', { type: 'faunaSeen', name: creature.name });
  }

  // T next to an explorer: offer its request, report progress, or just thank the player.
  talk(seed, name) {
    const say = (text) => this.hud.toast(`${name}: ${text}`);
    const open = this.log.npcQuest(seed);
    if (open) { say(`Bagaimana? ${open.progress}/${open.goal.n} sejauh ini.`); return; }
    const req = this.planet && requestOf(seed, this.planet, name);
    if (!req) { say(this.log.s.npcDone[seed] ? 'Terima kasih atas bantuanmu!' : 'Aku baik-baik saja, terima kasih.'); return; }
    say(req.line);
    this.hud.toast(`Permintaan diterima: ${req.title} (J)`);
    this.sfx.scan?.();
    this.log.accept(req);
  }

  warped() { this.player.emit('act', { type: 'warp' }); }

  // J opens the journal, K (journal open) swaps the oldest contract for a new one.
  update(input) {
    if (input.pressed('KeyJ')) this.panel.toggle();
    if (this.panel.isOpen && input.pressed('KeyK') && this.log.reroll(this.planet)) this.hud.toast('Kontrak diganti');
    if (this.seen !== this.log.version) { this.seen = this.log.version; this.collection.check(); }
    this.panel.update();
    for (const a of this.addons) a.update(input, this);
  }
}
