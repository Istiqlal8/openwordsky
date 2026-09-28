// Playing as one of the alien races: the race's own body (read-only builders from src/aliens)
// plus an outfit layer (helmet + pack in the suit, a vest in casual clothes) fitted to that body.
import * as THREE from 'three';
import { Rng, hash32 } from '../core/rng.js';
import { AlienBody } from '../aliens/alien-body.js';
import { GeoKit } from '../aliens/body-kit.js';
import { RACES, RACE_BY_ID } from '../aliens/races.js';
import { mesh, sphere, box, cyl, torus, localBox } from './parts.js';
import { alienHeight } from './look-store.js';

// Colour variant seed: the same race + variant always builds the same individual.
function seedOf(id, variant) {
  let h = 0x811c9dc5;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return hash32(h, variant | 0, 0xc0de);
}

function outfitMats(look) {
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true, ...o });
  const mats = {
    suit: std({ color: look.suit.color }),
    trim: std({ color: look.suit.trim, emissive: look.suit.trim, emissiveIntensity: 0.3 }),
    dark: std({ color: 0x2a2f38, roughness: 0.85 }),
    shirt: std({ color: look.casual.shirtColor }),
    visor: new THREE.MeshStandardMaterial({ color: look.suit.visor, metalness: 0.8, roughness: 0.15,
      transparent: true, opacity: 0.42 }),
  };
  mats.all = Object.values(mats);
  return mats;
}

export class AlienFigure {
  constructor(look) {
    this.look = look;
    this.race = RACE_BY_ID[look.species] ?? RACES[0];
    this.kit = new GeoKit();
    this.body = new AlienBody(this.race, this.kit, new Rng(seedOf(this.race.id, look.alien.variant)));
    this.height = alienHeight(look);
    this.body.height = this.height;
    this.body.group.scale.setScalar(this.height / this.body.rig.unit);
    this.group = new THREE.Group();
    this.group.add(this.body.group);
    this.mats = outfitMats(look);
    this.suitParts = [];
    this.vest = null;
    if (look.alien.outfit) this.buildOutfit();
    this.setCasual(false);
  }

  get arms() { return this.body.rig.arms; }
  get legs() { return this.body.rig.legs; }

  buildOutfit() {
    this.buildHelmet();
    this.buildVest();
  }

  // Glass dome sized from the race's own head, worn only where the air is not breathable.
  buildHelmet() {
    const head = this.body.rig.head;
    if (!head) return;
    const b = localBox(head), size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    this.headR = Math.max(size.x, size.y, size.z) * 0.62;
    this.headW = size.x;
    const dome = mesh(sphere(this.headR, 16), this.mats.visor, c.x, c.y, c.z);
    const collar = mesh(torus(this.headR * 0.78, this.headR * 0.1), this.mats.trim, c.x, c.y - this.headR * 0.72, c.z);
    collar.rotation.x = Math.PI / 2;
    head.add(dome, collar);
    this.suitParts.push(dome, collar);
  }

  // Vest hanging under the head, sized from it so it never swallows the race's own silhouette.
  buildVest() {
    const { torso, head } = this.body.rig;
    if (!torso || !head || !this.headR) return;
    const w = this.headW ?? this.headR, h = w * 1.7;
    head.updateWorldMatrix(true, true);
    torso.updateWorldMatrix(true, true);
    const p = torso.worldToLocal(head.getWorldPosition(new THREE.Vector3()));
    const y = p.y - this.headR * 0.8 - h * 0.5;
    this.vest = mesh(cyl(w * 0.52, w * 0.92, h, 14), this.mats.suit, p.x, y, p.z);
    const pack = mesh(box(w * 0.9, h * 0.75, w * 0.5), this.mats.dark, p.x, y, p.z + w * 0.85);
    torso.add(this.vest, pack);
    this.suitParts.push(pack);
  }

  setCasual(on) {
    this.casual = Boolean(on);
    for (const p of this.suitParts) p.visible = !this.casual;
    if (this.vest) this.vest.material = this.casual ? this.mats.shirt : this.mats.suit;
  }

  update(dt, speed) {
    this.body.update(dt, speed, 'none');
  }

  dispose() {
    this.group.traverse((o) => o.geometry?.dispose());
    this.body.dispose();
    this.kit.dispose();
    for (const mat of this.mats.all) mat.dispose();
  }
}
