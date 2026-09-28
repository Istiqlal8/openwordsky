// Entry point for the player-OWNED capital ship (buy + DIY). Note: this folder also holds the
// older frigate-expedition feature, whose own `Fleet` lives in fleet-state.js — import the
// capital-ship one from here (or as CapitalFleet) so the two never get mixed up.
export { Fleet, Fleet as CapitalFleet, CURRENCY } from './fleet.js';
export { FreighterShop, FREIGHTER_PRICES } from './freighter-shop.js';
export { FreighterYard } from './freighter-yard.js';
export { buildSpecFreighter } from './spec-model.js';
export { FREIGHTER_CATALOG, catalogById } from './fleet-catalog.js';
export { normalizeSpec, specStats, buildCost, refitCost, randomSpec, DEFAULT_SPEC,
  ARCHETYPE_IDS, ARCHETYPE_LABELS } from './fleet-spec.js';
