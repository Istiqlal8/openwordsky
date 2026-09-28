// Layout plan per capital-ship archetype (ids match freighter-hulls-*.js). A plan is data —
// areas, walls, doors, pads, stations, crew routes, lights — plus a decorate(ctx, rng) that
// adds its signature props and returns animators.
import { classicPlan, hammerheadPlan } from './plans-long.js';
import { catamaranPlan, ringPlan } from './plans-twin.js';
import { citadelPlan, saucerPlan } from './plans-round.js';
import { whalePlan, cruiserPlan } from './plans-war.js';

const PLANS = {
  classic: classicPlan, hammerhead: hammerheadPlan, catamaran: catamaranPlan, ring: ringPlan,
  citadel: citadelPlan, saucer: saucerPlan, whale: whalePlan, cruiser: cruiserPlan,
};

export const ARCHETYPES = Object.keys(PLANS);

export function planOf(archetype) {
  return PLANS[archetype] ?? PLANS.classic;
}
