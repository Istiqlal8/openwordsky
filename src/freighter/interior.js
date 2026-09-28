// FreighterInterior: the walkable inside of the "Kapal Induk" (separate scene, 1 unit = 1 m).
// Hangar bay with the player's parked ship, corridor, bridge, quarters and workshop.
// update() returns { exit, prompt, action }: T at a terminal gives an action, E at the ship
// launches it out of the space door and then reports exit = true.
import * as THREE from 'three';
import { Rng, hash32 } from '../core/rng.js';
import { disposeTree } from './kit.js';
import { interiorMaterials } from './interior-mats.js';
import { buildShell, WALK } from './interior-shell.js';
import { buildHangar, PLAYER_PAD } from './interior-hangar.js';
import { buildRooms } from './interior-rooms.js';
import { buildOutside } from './interior-outside.js';
import { sign } from './interior-props.js';
import { InteriorLife } from './interior-life.js';
import { Walkable } from './walkable.js';
import { Walker } from './walker.js';
import { Launch } from './launch.js';

const USE_RANGE = 2.2;   // metres from a terminal
const BOARD_RANGE = 2;   // metres from the ship's footprint

function hangarLights(g) {
  g.add(new THREE.HemisphereLight(0xc8dcff, 0x2a2e36, 0.9), new THREE.AmbientLight(0x404858, 0.5));
  for (const [hex, i, x, y, z] of [[0xbfe6ff, 60, -15, 12, -2], [0xbfe6ff, 60, 15, 12, -2], [0xffd09a, 40, 0, 9, 7]]) {
    const l = new THREE.PointLight(hex, i, 40, 1.2);
    l.position.set(x, y, z);
    g.add(l);
  }
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
  mount(design, name = 'Kapal Induk') {
    this.dispose();
    this.root = new THREE.Group();
    this.scene.add(this.root);
    const { mats, textures } = interiorMaterials();
    const ctx = this.ctx = { mats, textures, blocks: [], terminals: [] };
    const rng = new Rng(hash32(design.seed ?? 1, 0xf7e1));
    this.root.add(buildShell(mats));
    const hangar = buildHangar(ctx, this.root, design, rng);
    const rooms = buildRooms(ctx, this.root);
    this.outside = buildOutside(this.root, name, textures);
    sign(ctx, this.root, name.toUpperCase(), 0, 14.4, -14.6, 0, 9);
    hangarLights(this.root);
    this.ship = hangar.playerShip;
    this.ships = [hangar.playerShip, ...hangar.npcShips];
    this.walker = new Walker(this.cam, new Walkable(WALK, ctx.blocks));
    this.root.add(this.walker.avatar.group);
    this.walker.place(PLAYER_PAD.x, this.ship.box.max.z + 2.2, 0);
    this.life = new InteriorLife(this.root, mats, this.ships.map((s) => s.group.position));
    Object.assign(this.life, { crane: hangar.crane, holo: rooms.holo });
    this.launch = new Launch(this.ship, this.cam);
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

  // Floor distance from the player to the parked ship's footprint.
  shipDistance() {
    const b = this.ship.box, f = this.walker.feet;
    const dx = Math.max(b.min.x - f.x, 0, f.x - b.max.x), dz = Math.max(b.min.z - f.z, 0, f.z - b.max.z);
    return Math.hypot(dx, dz);
  }

  nearestTerminal() {
    const f = this.walker.feet;
    let best = null, bestD = USE_RANGE;
    for (const t of this.ctx.terminals) {
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
