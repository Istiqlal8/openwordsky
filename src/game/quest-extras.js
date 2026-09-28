// Quest extras addon: daily challenges, NPC chains, the rival explorer and alien reputation.
// Registered once in addons.js; forwards the addon hooks and adds journal/tracker sections.
import { DailyChallenges } from '../quest/daily.js';
import { NpcChains } from '../quest/npc-chains.js';
import { Rival } from '../quest/rival.js';
import { Reputation } from '../quest/reputation.js';
import { dailyCard, dailyTrack, rivalCard, rivalTrack, repCard } from '../ui/quest-extras-view.js';

export class QuestExtras {
  constructor(wiring) {
    this.daily = new DailyChallenges(wiring);
    this.chains = new NpcChains(wiring);
    this.rival = new Rival(wiring);
    this.rep = new Reputation(wiring);
    this.parts = [this.daily, this.chains, this.rival, this.rep];
    wiring.panel.sections.push(
      { journal: () => dailyCard(this.daily), track: () => dailyTrack(this.daily) },
      { journal: () => rivalCard(this.rival), track: () => rivalTrack(this.rival, wiring.collection.status) },
      { journal: () => repCard(this.rep) },
    );
  }

  update(input, wiring) { for (const p of this.parts) p.update(input, wiring); }
  arrived(planet) { for (const p of this.parts) p.arrived?.(planet); }
  departed() { for (const p of this.parts) p.departed?.(); }
}
