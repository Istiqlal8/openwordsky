// The human figure: one body built from a look, with a suit layer and a casual-clothes layer.
// Limb pivots keep the old Astronaut convention so surface.js muzzle() still finds the right hand.
import * as THREE from 'three';
import { mesh, pivot, sphere, cap, box, limb } from './parts.js';
import { humanMats } from './human-mats.js';
import { buildHead } from './human-face.js';
import { buildHairAndHat } from './human-hair.js';
import { buildHelmet, buildSuitBody } from './human-gear.js';
import { BASE_HEIGHT } from './look-options.js';

const SHOES = { sepatu: [0.15, 0.09, 0.27, -0.57], bot: [0.17, 0.17, 0.26, -0.52], sandal: [0.15, 0.045, 0.26, -0.6] };

export class HumanFigure {
  constructor(look) {
    this.look = look;
    this.mats = humanMats(look);
    this.group = new THREE.Group();
    this.suitParts = [];
    this.casualParts = [];
    this.swaps = [];
    this.width = 0.85 + look.body.build * 0.4;
    this.height = look.body.height;
    this.buildBody();
    this.buildHeadGroup();
    this.group.scale.setScalar(look.body.height / BASE_HEIGHT);
    this.t = 0;
    this.setCasual(false);
  }

  buildBody() {
    const m = this.mats, w = this.width;
    const torso = mesh(cap(0.28, 0.45), m.suit, 0, 1.05, 0, w, 1, w * 0.95);
    this.group.add(torso);
    this.swaps.push({ mesh: torso, suit: m.suit, casual: m.shirt });
    this.buildArms();
    this.buildLegs();
    const gear = buildSuitBody(this.look, m, w);
    this.suitParts.push(...gear);
    this.group.add(...gear);
    this.buildOuterwear();
  }

  buildArms() {
    const m = this.mats, w = this.width;
    this.arms = [limb(m.suit, -0.36 * w, 1.32, 0.38, 0.08), limb(m.suit, 0.36 * w, 1.32, 0.38, 0.08)];
    for (const arm of this.arms) {
      this.swaps.push({ mesh: arm.children[0], suit: m.suit, casual: m.shirt });
      const hand = mesh(sphere(0.075, 10), m.skin, 0, -0.47, 0);
      arm.add(hand);
      this.swaps.push({ mesh: hand, suit: m.dark, casual: m.skin });
    }
    this.group.add(...this.arms);
  }

  buildLegs() {
    const m = this.mats, w = this.width, style = this.look.casual.trousers;
    const len = style === 'pendek' ? 0.2 : 0.42, wide = style === 'kargo' ? 0.128 : 0.108;
    this.legs = [];
    for (const side of [-1, 1]) {
      const leg = pivot(side * 0.13 * w, 0.72, 0);
      const shin = mesh(cap(0.1, 0.42), m.suit, 0, -0.26, 0);
      this.swaps.push({ mesh: shin, suit: m.suit, casual: m.skin });
      const pant = mesh(cap(wide, len), m.trousers, 0, -len / 2 - 0.05, 0);
      this.casualParts.push(pant);
      leg.add(shin, pant, this.buildShoe());
      this.legs.push(leg);
    }
    this.group.add(...this.legs);
  }

  buildShoe() {
    const [w, h, d, y] = SHOES[this.look.casual.shoes] ?? SHOES.sepatu;
    const shoe = mesh(box(w, h, d), this.mats.dark, 0, y, -0.04);
    this.swaps.push({ mesh: shoe, suit: this.mats.dark, casual: this.mats.shoes });
    return shoe;
  }

  // Jacket / shirt collar / vest worn over the shirt in casual mode.
  buildOuterwear() {
    const m = this.mats, w = this.width, style = this.look.casual.shirt;
    const extra = [];
    if (style === 'jaket') extra.push(mesh(cap(0.3, 0.4), m.jacket, 0, 1.07, 0, w, 1, w * 0.95));
    if (style === 'rompi') extra.push(mesh(cap(0.295, 0.24), m.jacket, 0, 1.14, 0, w, 1, w * 0.95));
    if (style === 'kemeja') extra.push(mesh(box(0.2 * w, 0.06, 0.26 * w), m.jacket, 0, 1.32, 0),
      mesh(box(0.035, 0.42, 0.03), m.jacket, 0, 1.06, -0.27 * w));
    if (!extra.length) return; // plain kaos: nothing worn over the shirt
    this.casualParts.push(...extra);
    this.group.add(...extra);
  }

  buildHeadGroup() {
    const head = buildHead(this.look, this.mats);
    head.position.set(0, 1.55, 0);
    const { hair, hat } = buildHairAndHat(this.look, this.mats);
    const helmet = buildHelmet(this.look, this.mats);
    head.add(hair, hat, helmet);
    this.suitParts.push(helmet);
    if (this.look.hair.style !== 'botak' && hair.visible) this.casualParts.push(hair);
    this.casualParts.push(hat);
    this.head = head;
    this.group.add(head);
  }

  // Breathable worlds: casual clothes and bare head; otherwise the sealed suit.
  setCasual(on) {
    this.casual = Boolean(on);
    for (const p of this.suitParts) p.visible = !this.casual;
    for (const p of this.casualParts) p.visible = this.casual;
    for (const s of this.swaps) s.mesh.material = this.casual ? s.casual : s.suit;
  }

  update(dt, speed, onGround) {
    this.t += dt * speed * 1.2;
    const swing = onGround ? Math.sin(this.t) * Math.min(1, speed / 7) * 0.7 : 0.35;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.arms[0].rotation.x = -swing * 0.8;
    this.arms[1].rotation.x = swing * 0.8;
  }

  dispose() {
    this.group.traverse((o) => o.geometry?.dispose());
    for (const mat of this.mats.all) mat.dispose();
  }
}
