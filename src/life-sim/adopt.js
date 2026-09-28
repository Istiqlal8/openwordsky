// Settlement animals taken from a planet's procedural species: which species make good mounts
// or livestock, and how an owned animal follows its owner (rider / herder) each frame.
const WILD = ['Agresif', 'Pemangsa', 'Teritorial'];
const walker = (sp) => sp.genes.move === 'jalan' && sp.genes.body !== 'ular' && sp.genes.legs >= 2;

// Biggest calm four-legged walker (any walker as a fallback) -> species | null.
export function pickMountSpecies(species) {
  const calm = species.filter((sp) => walker(sp) && !WILD.includes(sp.lore.temperament));
  const quad = calm.filter((sp) => sp.genes.legs >= 4);
  const pool = quad.length ? quad : calm.length ? calm : species.filter(walker);
  return pool.reduce((best, sp) => (!best || sp.genes.size > best.genes.size ? sp : best), null);
}

// A calm small-to-medium walker or hopper for a herder's flock -> species | null.
export function pickFlockSpecies(species, seed) {
  const farm = species.filter((sp) => sp.livestock);
  if (farm.length) return farm[seed % farm.length];
  const pool = species.filter((sp) => (walker(sp) || sp.genes.move === 'lompat') && !WILD.includes(sp.lore.temperament)
    && sp.genes.size < 1.8);
  return pool.length ? pool[seed % pool.length] : null;
}

// Owner-driven step for Herds animals: owner.drive(a, dt) -> { x, z, speed, graze }.
export function driveOwned(h, a, dt) {
  a.stateT -= dt;
  const o = a.owner.drive(a, dt), g = a.goal, grazing = o.speed === 0 && o.graze;
  a.dest.set(o.x, 0, o.z);
  a.want = o.speed;
  a.state = o.speed > 0 ? 'wander' : grazing ? 'graze' : 'idle';
  a.fleeing = false;
  a.looking = false;
  g.head = grazing ? 1 : 0; g.lie = 0; g.mouth = 0; g.alert = o.speed > a.walkSpeed * 1.4 ? 0.6 : 0; g.sleep = false;
}
