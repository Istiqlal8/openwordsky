// Meta addon (src/game/addons.js): the raid board. Owns the boss health bar, the damage
// numbers, the journal card and the timed contracts, and drives the space fight. The surface
// fight runs in the world addon (raid-world.js) and reports back through raidWorld.
import { RaidHud } from '../ui/raid-hud.js';
import { raidJournal, raidTrack } from '../ui/raid-view.js';
import { bindRaidStore, onRaidChange, offerContract, dropContract, activeContract } from './raid-store.js';
import { raidWorld } from './raid-world-link.js';
import { SpaceRaid } from './space-raid.js';
import { RAIDS, RAID_IDS } from './raid-data.js';

export class RaidMeta {
  constructor(w) {
    this.w = w;
    w.log.s.raid ??= {};
    bindRaidStore(w.log.s.raid);
    onRaidChange(() => w.log.version++);
    this.hud = new RaidHud(w.panel.tracker.parentNode);
    this.space = new SpaceRaid(w, { onDamage: (n, pos, core) => this.hud.damage(n, false, core), onState: () => this.changed() });
    this.last = performance.now();
    this.offerT = 0;
    raidWorld.onDamage = (n, ref, soaked) => this.hud.damage(n, soaked, ref?.part === 'core');
    raidWorld.onState = () => this.changed();
    raidWorld.onDefeat = (def, bonus) => this.surfaceDefeat(def, bonus);
    w.panel.sections.push({ journal: () => raidJournal(w.save.galaxySeed, this.status()), track: () => raidTrack(this.status()) });
    this.expose();
  }

  changed() { this.w.log.version++; }

  status() {
    return raidWorld.raid?.status() ?? this.space.status();
  }

  update(input) {
    const now = performance.now(), dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    // On a planet the space fight is let go entirely: its SpaceCombat is gone by then, and the
    // surface raid owns the bar. Landing next to a boss is the escape route.
    if (this.w.planet) this.space.dispose();
    else this.space.update(dt);
    this.hud.set(this.status());
    this.hud.update(dt);
    this.tickContract(dt);
    if (this.w.panel.isOpen && input.pressed('Backspace') && dropContract()) this.w.hud.toast('Kontrak raid dibatalkan');
  }

  tickContract(dt) {
    this.offerT -= dt;
    if (this.offerT > 0) return;
    this.offerT = 2;
    const before = activeContract();
    const c = offerContract();
    if (c) {
      const def = RAIDS[c.id];
      this.w.hud.toast(`Kontrak raid: ${def.name} · +${c.reward.nanit} Nanit bonus (J)`);
      this.w.sfx.discover?.();
    } else if (before && !activeContract()) this.w.hud.toast('Kontrak raid kedaluwarsa');
    this.changed();
  }

  surfaceDefeat(def, bonus) {
    // The loot was already handed over on the surface; this books the XP (and any rank-up).
    const { log } = this.w;
    log.record('boss', { id: def.id });
    log.award({ title: `Raid: ${def.name}`, reward: { nanit: 0, xp: def.reward.xp, items: [] } });
    if (bonus) log.award({ title: `Kontrak raid: ${def.name}`, reward: bonus });
    this.changed();
  }

  departed() { this.hud.set(null); }

  // Debug hooks for the console and headless runs.
  expose() {
    globalThis.__raid = {
      ids: RAID_IDS,
      spawn: (id) => (RAIDS[id]?.kind === 'space' ? this.space.spawnHere(id) : raidWorld.raid?.spawnHere(id) ?? false),
      boss: () => raidWorld.raid?.active ?? this.space.active,
      status: () => this.status(),
      state: () => this.w.log.s.raid,
    };
  }
}
