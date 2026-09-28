// The eclipse's grip on the surface sky: while a moon covers the star the day cycle's derived
// light factors are pulled down, and a dark disc rides in front of the sun sprite.
// Nothing here repaints the sky. SurfaceSky.applyDayCycle already derives lights, fog, sky
// colour, stars and dusk glow from DayCycle.daylight / nightFactor / twilight, so wrapping
// DayCycle.advance is the whole trick: drop the wrapper and the next frame is bright again.
// Raising nightFactor is also what makes night flora open at noon (src/gameplay/night-flora.js)
// and what lights the settlements up (src/game/surface-mode.js reads the same value).
import * as THREE from 'three';

const DEPTH = 0.88;        // deepest bite out of daylight: 12% survives, enough to walk by
const DIST = 2800;         // inside the sun sprite (3000), so the opaque disc occludes it by depth
const RIM = 0.6;           // how red the partial phases go
const MIN_R = 90, MAX_R = 420;
const CORE = 0.13;         // fraction of the sun sprite's width that reads as the star itself
const TRAVEL = 2.2;        // disc radii travelled between "clear" and "centred"
const Z = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3(), _side = new THREE.Vector3(), _face = new THREE.Vector3();

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class EclipseShadow {
  constructor(sky) {
    this.sky = sky;
    this.cycle = sky?.cycle ?? null;
    this.cover = 0;
    this.offset = -1;
    this.disc = null;
    if (!this.cycle) return;
    this.wrapCycle();
    this.buildDisc();
    this.place();
  }

  // Run our dimming right after every DayCycle.advance, including the one that
  // SurfaceSky.applyDayCycle makes each frame just before it reads the factors back.
  wrapCycle() {
    const c = this.cycle;
    this.hadOwn = Object.hasOwn(c, 'advance');
    this.prevAdvance = c.advance;
    const inner = c.advance.bind(c);
    c.advance = (dt) => { inner(dt); this.shade(); };
  }

  shade() {
    const k = this.cover * DEPTH;
    if (k <= 0) return;
    const c = this.cycle;
    c.daylight *= 1 - k;
    c.nightFactor = Math.max(c.nightFactor, k);
    // Partial phases redden like a long sunset; totality is colder, so the rim peaks mid-bite.
    c.twilight = Math.max(c.twilight, this.cover * (1 - this.cover) * 4 * RIM);
  }

  // A black disc sized off the sun sprite. Opaque on purpose: it renders in the opaque pass and
  // writes depth, so the additive sun sprite behind it is rejected. A star drawn as a sky-wide
  // glare is wider than MAX_R, and there the disc reads as a moon crossing rather than a bite.
  buildDisc() {
    const sprite = this.sky?.sunSprite;
    if (!sprite) return;
    this.radius = clamp(sprite.scale.x * CORE, MIN_R, MAX_R);
    this.geo = new THREE.CircleGeometry(this.radius, 48);
    this.mat = new THREE.MeshBasicMaterial({ color: 0x07080e, fog: false });
    this.disc = new THREE.Mesh(this.geo, this.mat);
    this.disc.frustumCulled = false;
    this.sky.group.add(this.disc); // the group already follows the player
  }

  // cover 0..1 of the star hidden; offset -1..1 is the moon's slide across it.
  set(cover, offset) {
    this.cover = cover;
    this.offset = offset;
    this.place();
  }

  place() {
    if (!this.disc) return;
    const d = _dir.copy(this.cycle.sunDir).normalize();
    _side.crossVectors(d, UP);
    if (_side.lengthSq() < 1e-6) _side.set(1, 0, 0);
    this.disc.position.copy(d).multiplyScalar(DIST)
      .addScaledVector(_side.normalize(), this.offset * this.radius * TRAVEL);
    this.disc.quaternion.setFromUnitVectors(Z, _face.copy(d).negate());
    this.disc.visible = d.y > -0.05; // nothing to see once the star has set
  }

  dispose() {
    const c = this.cycle;
    if (c) {
      if (this.hadOwn) c.advance = this.prevAdvance;
      else delete c.advance;
      c.advance(0); // honest factors again for readers later in this frame (lights, flora)
    }
    this.disc?.removeFromParent();
    this.geo?.dispose();
    this.mat?.dispose();
    this.cycle = this.sky = this.disc = this.geo = this.mat = null;
  }
}
