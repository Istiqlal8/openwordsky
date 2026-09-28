// The player's avatar in third person: a human figure or one of the alien races, from a `look`.
// Drop-in replacement for the old Astronaut: same constructor call, update(), setCasual(), dispose().
import * as THREE from 'three';
import { normalizeLook } from './look-store.js';
import { HumanFigure } from './human-figure.js';
import { AlienFigure } from './alien-figure.js';

// Old call style: new Astronaut(0xffa040) -> default human with that accent as suit trim.
const fromAccent = (hex) => ({ suit: { trim: `#${(hex >>> 0).toString(16).padStart(6, '0').slice(-6)}` } });

export class Avatar {
  // look: anything normalizeLook() accepts (a saved look, a partial one, an accent colour, nothing).
  constructor(look) {
    this.look = normalizeLook(typeof look === 'number' ? fromAccent(look) : look ?? null);
    this.figure = this.look.species === 'manusia' ? new HumanFigure(this.look) : new AlienFigure(this.look);
    this._group = new THREE.Group();
    this._group.add(this.figure.group);
    this.casual = false;
  }

  get group() { return this._group; }
  // Materials of the figure (NPC code tints mats.suit to tell characters apart).
  get mats() { return this.figure.mats; }
  // Arm pivots, so surface.js muzzle() can still hang the mining beam off the right hand.
  get arms() { return this.figure.arms ?? []; }
  get legs() { return this.figure.legs ?? []; }
  get height() { return this.figure.height ?? 1.8; }
  get species() { return this.look.species; }
  get name() { return this.look.name; }

  // Breathable planets show casual clothes; hostile ones seal the suit.
  setCasual(on) {
    this.casual = Boolean(on);
    this.figure.setCasual(this.casual);
  }

  // Place at the feet, facing yaw; swing the limbs while walking.
  update(dt, feet, yaw, speed, onGround) {
    this._group.position.copy(feet);
    this._group.rotation.y = yaw;
    this.figure.update(dt, speed, onGround);
  }

  dispose() {
    this._group.removeFromParent();
    this.figure.dispose();
    this.figure = null;
  }
}
