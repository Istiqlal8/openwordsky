// Builds every long-lived object of the game once; `app` is shared by flow.js and frame.js.
import * as THREE from 'three';
import { Input } from '../core/input.js';
import { attachTouch } from '../core/touch.js';
import { allSystems } from '../gen/galaxy.js';
import { loadSave } from '../state.js';
import { SpaceView } from '../view/space.js';
import { SurfaceView } from '../view/surface.js';
import { GalaxyMap } from '../view/galaxymap.js';
import { GasDive } from '../view/gas-dive/gas-dive.js';
import { Freighter } from '../freighter/freighter.js';
import { FreighterInterior } from '../freighter/interior.js';
import { shipDesign } from '../view/ship/ship-design.js';
import { customDesign } from '../view/ship/ship-custom.js';
import { Hud } from '../ui/hud.js';
import { Vitals } from '../ui/hud-vitals.js';
import { Inventory } from '../ui/inventory.js';
import { DeathScreen } from '../ui/death-screen.js';
import { Hangar } from '../ui/hangar.js';
import { Transition } from '../ui/transition.js';
import { WarpFx } from '../ui/warp-fx.js';
import { Shipyard } from '../ui/shipyard/shipyard.js';
import { activeSpec } from '../ui/shipyard/shipyard-store.js';
import { Minimap } from '../ui/minimap.js';
import { Markers } from '../ui/markers.js';
import { Sfx } from '../audio/sfx.js';
import { PlayerState } from './player-state.js';
import { SpaceMode } from './space-mode.js';
import { SurfaceMode } from './surface-mode.js';
import { QuestWiring } from './quest-wiring.js';
import { Overlays } from './overlays.js';
import { useItem } from '../items/use.js';
import { CapitalFleet } from '../fleet/index.js';
import { loadLook } from '../character/look-store.js';
import { FreighterShop } from '../fleet/freighter-shop.js';
import { FreighterYard } from '../fleet/freighter-yard.js';
import { bootAntialias, bindRenderer } from '../settings/graphics.js';

function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: bootAntialias() });
  bindRenderer(renderer); // pixel ratio from the quality setting
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  return renderer;
}

function makeUi(hudRoot) {
  return {
    hud: new Hud(hudRoot), vitals: new Vitals(hudRoot), inventory: new Inventory(hudRoot),
    death: new DeathScreen(hudRoot), minimap: new Minimap(hudRoot), markers: new Markers(hudRoot),
    transition: new Transition(document.body), warpFx: new WarpFx(), hangar: new Hangar(),
  };
}

function initialDesign(save) {
  const spec = activeSpec(save);
  return spec ? customDesign(spec) : shipDesign(save.shipSeed ?? 1);
}

export function createApp() {
  const canvas = document.getElementById('view');
  const hudRoot = document.getElementById('hud');
  const save = loadSave();
  const input = new Input(canvas);
  attachTouch(input, canvas);
  const a = { canvas, hudRoot, save, input, renderer: makeRenderer(canvas), ...makeUi(hudRoot) };
  a.sfx = new Sfx();
  a.player = new PlayerState(save.player);
  a.fleet = new CapitalFleet(save);
  a.inventory.onUse = (name, action) => useItem(a.player, name, action);
  a.quests = new QuestWiring({ save, player: a.player, hud: a.hud, sfx: a.sfx, hudRoot });
  a.space = new SpaceView();
  a.surface = new SurfaceView();
  a.surface.setLook(loadLook(save));
  a.gas = new GasDive();
  a.freighter = new Freighter(a.space);
  a.freighterInterior = new FreighterInterior();
  a.map = new GalaxyMap(save.galaxySeed);
  a.spaceMode = new SpaceMode({ space: a.space, player: a.player, sfx: a.sfx });
  a.surfaceMode = new SurfaceMode({ surface: a.surface, player: a.player, sfx: a.sfx, hud: a.hud });
  a.surfaceMode.gameplay.arsenal?.attachSave(save);
  a.quests.app = a; // meta addons that need the live 3D scenes (e.g. src/devourer/)
  a.totalPlanets = allSystems(save.galaxySeed).reduce((n, s) => n + s.planetCount, 0);
  a.game = { mode: 'title', system: null, planets: [], planet: null, design: initialDesign(save), saveTimer: 0 };
  a.space.setShip(a.game.design);
  return a;
}

// Overlays need callbacks into the flow, so they are attached after the flow exists.
export function attachOverlays(a, flow) {
  a.overlays = new Overlays({ input: a.input, sfx: a.sfx, hangar: a.hangar, save: a.save, player: a.player, hud: a.hud,
    arsenal: a.surfaceMode.gameplay.arsenal,
    setMode: (m) => flow.setMode(m), getMode: () => a.game.mode,
    onShip: (d, spec) => flow.useShip(d, spec), persist: () => flow.persist(), surface: a.surface });
  a.overlays.shipyard = new Shipyard();
  a.overlays.freighterShop = new FreighterShop();
  a.overlays.freighterYard = new FreighterYard();
  a.overlays.fleet = a.fleet;
  a.overlays.onFleetChange = () => flow.enterSystem(a.game.system.index);
}
