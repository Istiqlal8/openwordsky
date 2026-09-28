// Meta addons driven by QuestWiring (panels, economy, challenges). Each entry is a class:
//   new Addon(wiring)   wiring = { player, hud, sfx, log (QuestLog), collection, planet, panel }
//   addon.update(input, wiring)   every playing frame, space and surface (wiring.planet null in space)
//   addon.arrived(planet) / addon.departed()   optional
// Persistent state goes in wiring.log.s.<addonName> (saved with the game).
// Keep one import + one array entry per addon so parallel edits never collide.
import { GuideAddon } from '../guide/guide-addon.js';
import { QuestExtras } from './quest-extras.js';
import { CraftAddon } from '../craft/craft-addon.js';
import { MissionsAddon } from '../missions/missions-addon.js';
import { FishingAddon } from '../fishing/fishing-addon.js';
import { FleetAddon } from '../fleet/fleet-addon.js';
import { BuildAddon } from '../build/build-addon.js';
import { LegendMeta } from '../legend/legend-meta.js';
import { MetaAddon } from '../settings/meta-addon.js';
import { DevourerAddon } from '../devourer/devourer-addon.js';
import { RaidMeta } from '../raid/raid-meta.js';
import { MechAddon } from '../mech/mech-addon.js';
export const ADDONS = [
  MissionsAddon,
  GuideAddon,
  QuestExtras,
  CraftAddon,
  FishingAddon,
  FleetAddon,
  BuildAddon,
  MetaAddon,
  LegendMeta,
  DevourerAddon,
  RaidMeta,
  MechAddon,
];
