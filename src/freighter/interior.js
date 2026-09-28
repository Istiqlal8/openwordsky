// FreighterInterior: the walkable inside of the "Kapal Induk" (separate scene, 1 unit = 1 m).
// Each exterior archetype has its own layout plan (interior/plans.js), palette and signature
// props; every plan offers the parked ship, the space door, the five stations and crew.
// update() returns { exit, prompt, action }: T at a terminal gives an action, E at the ship
// launches it out of the space door and then reports exit = true.
import * as THREE from 'three';
import { Rng, hash32 } from '../core/rng.js';
import { disposeTree } from './kit.js';
import { interiorMaterials } from './interior-mats.js';
import { buildShell } from './interior-shell.js';
import { parkShips, doorFrame } from './interior-hangar.js';
import { stations, light } from './interior-rooms.js';
import { buildOutside } from './interior-outside.js';
import { sign, ceilingLights } from './interior-props.js';
import { InteriorLife } from './interior-life.js';
import { Walkable } from './walkable.js';
import { Walker } from './walker.js';
import { Launch } from './interior/launch.js';
import { paletteOf } from './interior/palette.js';
import { planOf } from './interior/plans.js';
import { mergeStatic } from './interior/merge.js';

const USE_RANGE = 2.2;   // metres from a terminal
const BOARD_RANGE = 2;   // metres from the ship's footprint

// Plan lights: [[hex | palette key, intensity, x, y, z, range]] plus the palette's sky fill.
function addLights(g, plan, pal) {
  const [hemi, amb] = plan.ambient ?? [0.9, 0.5];
  g.add(new THREE.HemisphereLight(pal.sky, pal.ground, hemi), new THREE.AmbientLight(pal.ground, amb));
  for (const [c, i, x, y, z, range] of plan.lights) light(g, typeof c === 'string' ? pal[c] : c, i, x, y, z, range);
}

function dressing(ctx, plan) {
  for (const [text, x, y, z, rotY, width, color] of plan.signs) sign(ctx, ctx.g, text, x, y, z, rotY, width, color ?? ctx.pal.sign);
  for (const l of plan.lamps ?? []) ceilingLights(ctx, ctx.g, l.spots, l.y, l.w, l.d, ctx.mats[l.mat ?? 'cool']);
}

export class FreighterInterior {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02040a);
    const aspect = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1;
    this.cam = new THREE.PerspectiveCamera(70, aspect, 0.1, 4000);
    this.root = null;
    this.result = { exit: false, prompt: null, action: null };
  }

  get camera() { return this.cam; }

  // design: the player's ship design; name: freighter name (signage + outside view seed).
  // view = { near: [planet, planet], starColor, style? } — the real system outside the windows.
  // style = { archetype, name, accent, hull, glow } from interiorStyleOf(freighter).
  mount(design, name = 'Kapal Induk', view = {}, style = view.style ?? {}) {
    this.dispose();
    const S = { ...style, name: style.name ?? name }, pal = paletteOf(S);
    this.scene.background.setHex(pal.bg);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    const g = new THREE.Group();
    this.root.add(g);
    const { mats, textures } = interiorMaterials(pal);
    const rng = new Rng(hash32(design.seed ?? 1, 0xf7e1));
    const ctx = this.ctx = { mats, textures, blocks: [], terminals: [], g, dyn: this.root, pal, S };
    const plan = this.plan = planOf(pal.id)(S, rng);
    buildShell(ctx, plan);
    const { playerShip, npcShips } = parkShips(ctx, plan.pads, design, rng);
    for (const D of plan.doors) doorFrame(ctx, D);
    const animators = [stations(ctx, plan.stations), ...(plan.decorate?.(ctx, rng) ?? [])];
    dressing(ctx, plan);
    addLights(this.root, plan, pal);
    mergeStatic(g);
    this.outside = buildOutside(this.root, S.name, textures, view.near, view.starColor, plan.doors);
    this.outside.light.intensity *= plan.sun ?? 1; // dim the star where the mood is its own light
    this.enter(playerShip, npcShips, plan, animators);
  }

  enter(ship, npcShips, plan, animators) {
    this.ship = ship;
    this.ships = [ship, ...npcShips];
    this.walker = new Walker(this.cam, new Walkable(plan.walk, this.ctx.blocks));
    this.root.add(this.walker.avatar.group);
    const p = plan.pads.player;
    this.walker.place(p.x, ship.box.max.z + 2.2, 0);
    this.life = new InteriorLife(this.root, this.ctx.mats, this.ships.map((s) => s.group.position), plan, animators);
    this.launch = new Launch(ship, this.cam, plan.door);
  }

  update(dt, input) {
    const r = this.result;
    r.exit = false; r.prompt = null; r.action = null;
    if (!this.root) return r;
    dt = Math.min(dt, 0.1);
    this.life.update(dt);
    this.outside.field.tex.offset.y -= dt * 0.15;
    if (this.launch.active) {
      this.launch.update(dt);
      r.exit = this.launch.done;
      return r;
    }
    this.walker.update(dt, input);
    this.interact(input, r);
    return r;
  }

  interact(input, r) {
    if (this.shipDistance() < BOARD_RANGE) {
      r.prompt = '[E] Naik pesawat';
      if (input.pressed('KeyE')) this.board();
      return;
    }
    const t = this.nearestTerminal();
    if (!t) return;
    r.prompt = t.prompt;
    if (input.pressed('KeyT')) r.action = t.action;
  }

  // Floor distance from the player to the parked ship's footprint (same deck only).
  shipDistance() {
    const b = this.ship.box, f = this.walker.feet;
    if (Math.abs(f.y - (this.plan.pads.player.y ?? 0)) > 1.5) return Infinity;
    const dx = Math.max(b.min.x - f.x, 0, f.x - b.max.x), dz = Math.max(b.min.z - f.z, 0, f.z - b.max.z);
    return Math.hypot(dx, dz);
  }

  nearestTerminal() {
    const f = this.walker.feet;
    let best = null, bestD = USE_RANGE;
    for (const t of this.ctx.terminals) {
      if (Math.abs((t.y ?? 0) - f.y) > 1.5) continue;
      const d = Math.hypot(t.x - f.x, t.z - f.z);
      if (d < bestD) { best = t; bestD = d; }
    }
    return best;
  }

  board() {
    this.walker.avatar.group.visible = false;
    this.launch.start();
  }

  get launching() { return Boolean(this.launch?.active); }

  render(renderer) {
    renderer.render(this.scene, this.cam);
  }

  resize(w, h) {
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
  }

  dispose() {
    if (!this.root) return;
    this.life.dispose();
    this.walker.dispose();
    for (const s of this.ships) { s.group.removeFromParent(); s.dispose(); }
    disposeTree(this.root, this.ctx.textures);
    this.root = null;
    this.ships = [];
  }
}
