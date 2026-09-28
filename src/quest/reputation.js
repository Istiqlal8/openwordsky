// Reputation per alien race: trading with their vendors and finishing quests on their outpost
// planets earns points. Each tier-up pays a gift; Sahabat+ unlocks the race's own contract on
// their planets. State lives in log.s.rep (race id -> points).
import { RACES, RACE_BY_ID, hasOutpost, raceFor } from '../aliens/races.js';
import { raceContract } from './contracts.js';

export const TIERS = [[0, 'Asing'], [30, 'Dikenal'], [100, 'Sahabat'], [250, 'Saudara']];
const FRIEND = 2; // tier index that unlocks race contracts
const TRADE_PTS = 8, QUEST_PTS = 12;
const QUEST_KINDS = new Set(['story', 'contract', 'npc', 'daily']);

export function tierOf(points) {
  let i = 0;
  while (i + 1 < TIERS.length && points >= TIERS[i + 1][0]) i++;
  return { index: i, name: TIERS[i][1], next: TIERS[i + 1]?.[0] ?? null };
}

export class Reputation {
  constructor(wiring) {
    this.w = wiring;
    this.log = wiring.log;
    this.s = (this.log.s.rep ??= {});
    const p = wiring.player;
    p.on('act', (a) => { if (a.type === 'alienTrade' && RACE_BY_ID[a.race]) this.gain(RACE_BY_ID[a.race], TRADE_PTS); });
    p.on('questDone', (q) => this.questDone(q));
  }

  points(race) { return this.s[race.id] ?? 0; }

  // Races sorted by standing, for the journal.
  get standings() {
    return RACES.map((race) => ({ race, pts: this.points(race), tier: tierOf(this.points(race)) }))
      .sort((a, b) => b.pts - a.pts);
  }

  localRace(planet = this.w.planet) { return hasOutpost(planet) ? raceFor(planet) : null; }

  questDone(q) {
    if (!QUEST_KINDS.has(q.kind)) return;
    const race = q.race ? RACE_BY_ID[q.race] : this.localRace();
    if (race) this.gain(race, q.race ? QUEST_PTS * 2 : QUEST_PTS);
  }

  gain(race, n) {
    const before = tierOf(this.points(race)).index;
    this.s[race.id] = this.points(race) + n;
    this.log.version++;
    const t = tierOf(this.s[race.id]);
    if (t.index > before) this.tierUp(race, t);
  }

  tierUp(race, t) {
    const item = race.gifts === 'Nanit' ? 'Kristal Alien' : race.gifts;
    const nanit = 100 * t.index * t.index;
    this.w.hud.toast(`${race.name} kini menganggapmu ${t.name}!`);
    if (t.index === FRIEND) this.w.hud.toast(`Pesanan khusus ${race.name} terbuka di planet mereka`);
    this.log.award({ title: `Hadiah ${race.name}`, reward: { nanit, items: [[item, t.index]], xp: 30 * t.index } });
    this.offerContract();
  }

  arrived() { this.offerContract(); }

  // Sahabat+: swap an untouched contract on their outpost planet for the race's own order.
  offerContract() {
    const planet = this.w.planet, race = this.localRace(planet);
    if (!race || tierOf(this.points(race)).index < FRIEND) return;
    const list = this.log.s.contracts;
    if (list.some((c) => c.race === race.id)) return;
    const i = list.findIndex((c) => !c.progress);
    const c = raceContract(race, planet, this.log.rank.index);
    if (i >= 0) list[i] = c; else list.push(c);
    this.log.version++;
    this.log.checkDeliveries();
  }

  update() {}
}
