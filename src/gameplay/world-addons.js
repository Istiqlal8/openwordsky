// World addons that live on a planet surface, mounted by SurfaceGameplay on every landing.
//   new Addon(ctx)  ctx = { surface, player, sfx, fx, planet, creatures? (Wildlife, set just after mount) }
//   addon.update(dt, alive)   every surface frame while not paused
//   addon.dispose()           on take-off
// Keep one import + one array entry per addon so parallel edits never collide.
import { GuideMarkers } from '../guide/guide-markers.js';
import { WildExtras } from './wild-extras.js';
import { RescueBeacons } from '../missions/rescue-beacons.js';
import { FishingScene } from '../fishing/fishing-scene.js';
import { BaseSite } from '../build/build-world.js';
import { LegendWorld } from '../legend/legend-world.js';
import { RaidWorld } from '../raid/raid-world.js';
import { MechWorld } from '../mech/mech-world.js';
import { WaterWorld } from '../water/water-addon.js';
export const WORLD_ADDONS = [
  RescueBeacons,
  GuideMarkers,
  WildExtras,
  FishingScene,
  BaseSite,
  LegendWorld,
  RaidWorld,
  MechWorld,
  WaterWorld,
];
