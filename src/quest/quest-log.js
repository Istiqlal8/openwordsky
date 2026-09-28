// Quest state: story chain + side contracts + species catalog. Lives inside the save object.
import { STORY, CHAPTERS } from './story.js';
import { makeContract } from './contracts.js';
import { bindNpcState, markAnswered } from './npc-requests.js';

const MAX_CONTRACTS = 3;
const MAX_IN_SPACE = 2; // leave room for planet contracts on the next landing
const RANKS = [[0, 'Pengembara'], [150, 'Penjelajah'], [500, 'Naturalis'], [1200, 'Pemburu Bintang'],
  [2500, 'Perintis'], [5000, 'Legenda Galaksi']];

function freshState() {
  return { story: 0, storyProgress: 0, contracts: [], npc: [], xp: 0, done: 0, catalog: { fauna: {}, flora: {} } };
}

export class QuestLog {
  constructor(save, player) {
    save.quests = { ...freshState(), ...save.quests };
    this.s = save.quests;
    this.s.npc ??= [];
    bindNpcState(this.s);
    this.player = player;
    this.granting = false;
    this.onComplete = null; // (quest) => void
    this.version = 0;       // bumps on every change so the UI knows to redraw
    this.watchers = [];     // (type, data) => void, called on every record (daily challenges)
    player.on('item', ({ name, n }) => {
      if (n > 0 && !this.granting) this.record('item', { item: name, n });
      this.checkDeliveries();
    });
    player.on('act', (a) => this.onAct(a));
  }

  get story() {
    const def = STORY[this.s.story];
    return def ? { ...def, kind: 'story', progress: this.s.storyProgress, chapterName: CHAPTERS[def.chapter] } : null;
  }

  get contracts() { return this.s.contracts; }
  get active() { return [this.story, ...this.s.npc, ...this.s.contracts].filter(Boolean); }

  get rank() {
    let i = 0;
    while (i + 1 < RANKS.length && this.s.xp >= RANKS[i + 1][0]) i++;
    const next = RANKS[i + 1]?.[0] ?? null;
    return { index: i, name: RANKS[i][1], xp: this.s.xp, next };
  }

  // Species catalog; returns true the first time a species is recorded.
  catalog(kind, name) {
    const book = this.s.catalog[kind];
    if (!name || book[name]) return false;
    book[name] = Date.now();
    this.version++;
    return true;
  }

  catalogCount(kind) { return Object.keys(this.s.catalog[kind]).length; }

  // 'floraSeen' / 'faunaSeen' feed the catalog; only first sightings count for quests.
  onAct(a) {
    const kind = a.type === 'floraSeen' ? 'flora' : a.type === 'faunaSeen' ? 'fauna' : null;
    if (!kind) { this.record(a.type, a); return; }
    if (!this.catalog(kind, a.name)) return;
    this.player.emit('notice', { text: `Spesies ${kind} baru tercatat: ${a.name}` });
    this.record(kind === 'flora' ? 'floraNew' : 'scanFauna');
  }

  record(type, data = {}) {
    const story = STORY[this.s.story];
    if (story && matches(story.goal, type, data)) {
      this.s.storyProgress = Math.min(story.goal.n, this.s.storyProgress + (data.n ?? 1));
      this.version++;
      if (this.s.storyProgress >= story.goal.n) this.finishStory();
    }
    for (const c of [...this.s.npc, ...this.s.contracts]) {
      if (!matches(c.goal, type, data)) continue;
      c.progress = Math.min(c.goal.n, c.progress + (data.n ?? 1));
      this.version++;
      if (c.progress >= c.goal.n) this.finishContract(c);
    }
    for (const w of this.watchers) w(type, data);
  }

  // Take on an explorer's request (npc-requests.js); deliveries may complete at once.
  accept(q) {
    markAnswered(q.seed);
    this.s.npc.push(q);
    this.version++;
    this.checkDeliveries();
  }

  npcQuest(seed) { return this.s.npc.find((q) => q.seed === seed) ?? null; }

  // 'deliver' goals track what the player carries; the items are handed over when complete.
  checkDeliveries() {
    for (const q of [...this.s.npc, ...this.s.contracts]) {
      if (q.goal.type !== 'deliver') continue;
      const have = Math.min(q.goal.n, this.player.count(q.goal.item));
      if (have !== q.progress) { q.progress = have; this.version++; }
      if (have < q.goal.n || this.granting) continue;
      this.player.removeItem(q.goal.item, q.goal.n);
      this.finishContract(q);
    }
  }

  // One-off reward outside the quest board (e.g. a finished planet collection).
  award(q) { this.grant(q); }

  finishStory() {
    const q = this.story;
    this.s.story++;
    this.s.storyProgress = 0;
    this.grant(q);
  }

  finishContract(c) {
    this.s.contracts = this.s.contracts.filter((x) => x !== c);
    this.s.npc = this.s.npc.filter((x) => x !== c);
    this.grant(c);
  }

  grant(q) {
    this.granting = true;
    const { nanit, items, xp } = q.reward;
    if (nanit) this.player.addItem('Nanit', nanit);
    for (const [name, n] of items) this.player.addItem(name, n);
    this.granting = false;
    const before = this.rank.index;
    this.s.xp += xp;
    this.s.done++;
    this.version++;
    this.onComplete?.(q, this.rank.index > before ? this.rank : null);
    this.player.emit('questDone', q);
  }

  // Top the contract board back up; planet = current surface planet or null.
  refill(planet) {
    let added = 0;
    while (this.s.contracts.length < (planet ? MAX_CONTRACTS : MAX_IN_SPACE)) {
      this.s.contracts.push(makeContract(planet, this.rank.index));
      added++;
    }
    if (added) this.version++;
    return added;
  }

  // Drop the oldest contract and draw a new one (K while the journal is open).
  reroll(planet) {
    if (!this.s.contracts.length) return false;
    this.s.contracts.shift();
    this.refill(planet);
    return true;
  }
}

export function matches(goal, type, data) {
  if (goal.type !== type) return false;
  if (goal.item && goal.item !== data.item) return false;
  if (goal.planet && goal.planet !== data.planet) return false;
  return !goal.biome || goal.biome === data.biome;
}
