// The wreck itself: the player's own ship, built from their own design, then killed.
//
// It reuses buildShip() rather than a bespoke hull, because the whole point is that the silhouette
// is exactly theirs — same parts, same name, same paint. Everything that makes a live ship look
// alive is then stripped: engine flames, canopy glow, emissive trim. What is left is a cold shape
// tumbling on starlight alone.
import * as THREE from 'three';
import { toHsl, hsl } from '../core/color.js';
import { glowTexture } from '../assets/textures.js';
import { buildShip } from '../view/ship/ship-model.js';

const SCALE = 0.14; // model metres -> space-view units, same as the player's ship (ship-rig.js)
export const READ_RANGE = 25; // boarding distance, in the same family as a planet's landing gap

const _v = new THREE.Vector3();

// Burnt paint: most of the hue survives, almost none of the saturation or the light.
function ash(hex, keepLight) {
  const [h, s, l] = toHsl(hex);
  return hsl(h, s * 0.22, l * keepLight);
}

function scorch(design) {
  const p = design.palette;
  return { ...design, palette: { hull: ash(p.hull, 0.32), trim: ash(p.trim, 0.28), glow: 0x0d0f13 } };
}

// Kills every self-lit surface. The sculpted GLB hull arrives asynchronously with a material of
// its own, so this runs again for a few seconds after the wreck is built; `done` is the wreck's
// own set of already-darkened materials, which keeps the repeats idempotent.
export function deaden(group, done) {
  group.traverse((o) => {
    if (o.isSprite) { o.visible = false; return; } // engine glow sprites
    const m = o.material;
    if (!m || done.has(m)) return;
    done.add(m);
    m.emissive?.setHex(0x000000);
    if (m.isMeshBasicMaterial) m.color.multiplyScalar(0.06); // additive flames -> invisible
    else if (m.isMeshStandardMaterial) { m.color.multiplyScalar(0.55); m.roughness = 1; m.metalness = 0.15; }
  });
}

export class TwinWreck {
  // design: the player's live ship design. rng: seeded on (galaxySeed, systemIndex).
  constructor(space, design, rng) {
    this.space = space;
    this.name = design.name;
    this.model = buildShip(scorch(design));
    this.model.setLegs(false);
    this.model.setThrust(0);
    this.darkened = new Set();
    deaden(this.model.group, this.darkened);
    this.scorchLeft = 6;
    this.scorchTick = 0;
    this.group = this.model.group;
    this.group.scale.setScalar(SCALE);
    this.group.position.copy(this.place(rng));
    this.group.rotation.set(rng.next() * 6, rng.next() * 6, rng.next() * 6);
    this.spin = new THREE.Vector3(rng.range(-0.05, 0.05), rng.range(-0.04, 0.04), rng.range(-0.06, 0.06));
    this.makeMark();
    space.scene.add(this.group, this.mark);
  }

  // A ship this small is a speck between orbits. The marker is not a light on the hull: it is the
  // transponder ID, which the player's own HUD paints because the ID is already its own.
  makeMark() {
    this.markMat = new THREE.SpriteMaterial({ map: glowTexture(0x8fa6bb), color: 0x7e94a8,
      sizeAttenuation: false, transparent: true, opacity: 0.5, depthWrite: false });
    this.mark = new THREE.Sprite(this.markMat);
    this.mark.scale.setScalar(0.035);
    this.mark.position.copy(this.group.position);
  }

  // Parked between two neighbouring orbits, the way the derelict hulk is: far from any planet, so
  // it is only ever found by someone already flying the long way round.
  place(rng) {
    const orbits = this.space.bodies.map((b) => b.planet.orbit.radius).sort((a, b) => a - b);
    const i = rng.int(orbits.length);
    const r = i < orbits.length - 1 ? (orbits[i] + orbits[i + 1]) / 2 : orbits[i] + 1200;
    const a = rng.range(0, Math.PI * 2);
    return _v.set(Math.cos(a) * r, rng.range(-120, 120), Math.sin(a) * r);
  }

  update(dt) {
    const r = this.group.rotation;
    r.x += this.spin.x * dt;
    r.y += this.spin.y * dt;
    r.z += this.spin.z * dt;
    this.rescorch(dt);
  }

  // The GLB hull swaps itself in a few frames late; re-scorch until it has surely landed.
  rescorch(dt) {
    if (this.scorchLeft <= 0) return;
    this.scorchLeft -= dt;
    this.scorchTick -= dt;
    if (this.scorchTick > 0) return;
    this.scorchTick = 0.75;
    deaden(this.group, this.darkened);
  }

  // Once the log has been read the transponder is acknowledged and stops being painted.
  quiet() { this.mark.visible = false; }

  moveTo(pos) {
    this.group.position.copy(pos);
    this.mark.position.copy(pos);
  }

  distance(pos) {
    return Math.max(0, pos.distanceTo(this.group.position) - this.model.length * SCALE * 0.5);
  }

  dispose() {
    this.space.scene.remove(this.group, this.mark);
    this.model.dispose();
    this.markMat.dispose(); // the glow texture is cached in textures.js, kept alive
  }
}
