// Teleport between your own bases. Only the meta addon can do this: it reaches the flow
// (app.flow) that owns landing and system changes.
import { systemAt, planetsOf } from '../gen/galaxy.js';
import { hub, bases } from './hub.js';
import { TELEPORT_COST } from './pieces.js';
import { affordable, pay } from '../craft/recipes.js';

// -> notice text.
export function travelTo(wiring, key) {
  const flow = wiring.app?.flow, save = wiring.app?.save;
  if (!flow || !save) return 'Jaringan teleport tidak tersedia';
  const b = bases()[key];
  const target = b && planetOf(save.galaxySeed, b.sys, key);
  if (!target) return 'Markas tujuan tidak ditemukan';
  if (!affordable(wiring.player, TELEPORT_COST)) return 'Nanit tidak cukup untuk melompat';
  pay(wiring.player, TELEPORT_COST);
  const pad = b.pieces.find((p) => p.type === 'teleport') ?? b.pieces[0];
  hub.arriveAt = { key, x: pad.x, z: pad.z };
  jump(flow, save, target);
  return `Teleport ke ${b.name}`;
}

function planetOf(galaxySeed, sysIndex, key) {
  const system = systemAt(galaxySeed, sysIndex);
  return planetsOf(galaxySeed, system).find((p) => p.key === key) ?? null;
}

function jump(flow, save, target) {
  if (flow.game.mode === 'surface') flow.depart();
  if (save.systemIndex !== target.systemIndex) flow.jumpTo(target.systemIndex, false);
  flow.arrive(target);
}
