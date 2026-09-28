// Per-planet checklist: every fauna and flora species, plus the items this planet can give.
// Finishing a planet's list pays a one-time bonus.
import { endemicOf, SOURCE_LABEL } from './endemic.js';
import { pickupsOf } from './materials.js';

function checklistOf(planet) {
  const items = [
    ...endemicOf(planet).map((e) => ({ name: e.name, hint: `Khas · ${SOURCE_LABEL[e.source]}`, endemic: true })),
    ...pickupsOf(planet).map((name) => ({ name, hint: 'Benda di tanah' })),
    ...planet.resources.map((name) => ({ name, hint: 'Tambang / panen' })),
  ];
  const unique = [...new Map(items.map((i) => [i.name, i])).values()];
  return { fauna: planet.species.fauna.map((s) => s.name), flora: planet.species.flora.map((s) => s.name), items: unique };
}

export class PlanetCollection {
  constructor(log, player) {
    this.log = log;
    this.s = log.s;
    this.s.found ??= {};
    this.s.cleared ??= {};
    this.planet = null;
    this.list = null;
    player.on('item', ({ name, n }) => { if (n > 0) this.found(name); });
  }

  setPlanet(planet) {
    this.planet = planet && !planet.gas ? planet : null;
    this.list = this.planet ? checklistOf(this.planet) : null;
    this.log.version++;
  }

  found(name) {
    if (!this.list || !this.list.items.some((i) => i.name === name)) return;
    const box = (this.s.found[this.planet.key] ??= {});
    if (box[name]) return;
    box[name] = 1;
    this.log.version++;
  }

  // -> { fauna: [{name, done}], flora: [...], items: [{name, hint, endemic, done}], done, total, cleared } | null
  get status() {
    if (!this.list) return null;
    const cat = this.s.catalog, box = this.s.found[this.planet.key] ?? {};
    const fauna = this.list.fauna.map((name) => ({ name, done: Boolean(cat.fauna[name]) }));
    const flora = this.list.flora.map((name) => ({ name, done: Boolean(cat.flora[name]) }));
    const items = this.list.items.map((i) => ({ ...i, done: Boolean(box[i.name]) }));
    const all = [...fauna, ...flora, ...items];
    return { planet: this.planet.name, fauna, flora, items, done: all.filter((x) => x.done).length,
      total: all.length, cleared: Boolean(this.s.cleared[this.planet.key]) };
  }

  get clearedCount() { return Object.keys(this.s.cleared).length; }

  // Called after any quest-log change: pays out once when the list is complete.
  check() {
    const st = this.status;
    if (!st || st.cleared || st.done < st.total) return;
    this.s.cleared[this.planet.key] = Date.now();
    const nanit = 150 + st.total * 20;
    this.log.award({ title: `Koleksi ${st.planet} tuntas`, reward: { nanit, items: [['Emas', 3]], xp: 40 + st.total * 3 } });
    this.log.record('clear');
  }
}
