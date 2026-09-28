// Entry point: build the app, wire events, run the render loop.
import { discoveryCount } from './state.js';
import { createApp, attachOverlays } from './game/app.js';
import { Flow } from './game/flow.js';
import { FrameLoop } from './game/frame.js';
import { wirePlayerEvents } from './game/player-events.js';

const app = createApp();
const flow = new Flow(app);
attachOverlays(app, flow);
const loop = new FrameLoop(app, flow);
const { game, save, input, hud, sfx, player, space, surface, gas, spaceMode, surfaceMode, death, renderer } = app;

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  space.resize(innerWidth, innerHeight);
  surface.resize(innerWidth, innerHeight);
  gas.resize(innerWidth, innerHeight);
  app.freighterInterior.resize(innerWidth, innerHeight);
}

// Respawn: a death inside a gas giant drops you back to space next to it.
function respawned() {
  if (game.mode === 'gas') flow.depart();
  (game.mode === 'surface' ? surfaceMode : spaceMode).onRespawn();
  flow.persist();
}

function wire() {
  space.onPulse = (on, reason) => {
    if (on) { hud.toast('Pulse aktif'); sfx.warp(); } else if (reason === 'arrive') hud.toast('Pulse: tiba');
    else if (reason === 'empty') hud.toast('Energi habis');
  };
  gas.onDamage = (amount) => player.damageShip(amount);
  wirePlayerEvents({ player, vitals: app.vitals, inventory: app.inventory, death, hud, sfx, input }, respawned);
  addEventListener('resize', resize);
  addEventListener('beforeunload', () => flow.persist());
  app.canvas.addEventListener('click', () => { if (flow.isPlaying() && !death.isOpen) input.lock(); });
  hud.onStart(() => flow.start());
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  loop.frame(dt);
  requestAnimationFrame(tick);
}

wire();
flow.enterSystem(save.systemIndex);
resize();
flow.setMode('title');
hud.showTitle(true, { discoveries: discoveryCount(save), visited: save.visited.length });
requestAnimationFrame(tick);

// Debug/test hook: drive the game from the console or a headless browser.
window.__game = {
  game, save, quests: app.quests, input, hud, sfx, player, space, surface, gas, spaceMode, surfaceMode, app, flow,
  land: (p) => flow.land(p), takeOff: () => flow.takeOff(), arrive: (p) => flow.arrive(p), depart: () => flow.depart(),
  warpTo: (i) => flow.warpTo(i), jumpTo: (i) => flow.jumpTo(i), start: () => flow.start(), setMode: (m) => flow.setMode(m),
  enterGas: (p) => flow.enterGas(p),
};
