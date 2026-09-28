// Poses the third-person avatar for water: upright sculling while treading, a prone front
// crawl once the player moves or dives, and a quick shake-off after climbing out.
// Runs after Avatar.update() each frame and only writes limb/body rotations, so the avatar's
// own walk animation takes back over the moment the player leaves the water.
const HEAD = 1.55;        // local height of the head joint on the figure
const HEAD_OUT = 1.52;    // where the head rides above the feet, so it clears the swell
const LEAN = -1.12;       // body pitch (radians) at full prone
const SHAKE = 0.85;       // seconds of shake-off after leaving the water

export class SwimPose {
  constructor() {
    this.t = 0;
    this.prone = 0;
    this.blend = 0;
    this.shake = 0;
    this.posed = false;
  }

  get shaking() { return this.shake > 0; }

  // state: WaterState; moving: the player is holding a direction key.
  apply(dt, surface, state, moving) {
    const fig = surface.avatar?.figure;
    if (!fig?.group) return;
    if (this.shake > 0) { this.shakeOff(dt, fig); return; }
    // Wading is walking: only a real swimmer (or a submerged head) gets the water pose.
    const swimming = state.swimming || state.submerged;
    if (!swimming && !this.posed) return;
    this.ease(dt, state, moving, swimming);
    if (!swimming && this.blend < 0.04) { this.clear(fig); return; }
    this.poseBody(fig, state);
    this.poseArms(surface.avatar.arms);
    this.poseLegs(surface.avatar.legs);
    this.posed = true;
  }

  ease(dt, state, moving, swimming) {
    const want = swimming ? Math.min(1, Math.max(moving ? 0.92 : 0.14, state.headDepth / 0.5)) : 0;
    this.prone += (want - this.prone) * Math.min(1, dt * 4);
    this.blend += ((swimming ? 1 : 0) - this.blend) * Math.min(1, dt * 6);
    this.t += dt * (1.1 + this.prone * 2.2 + (moving ? 1.4 : 0));
  }

  // Hangs the figure off the head so it keeps riding the surface as the body goes prone.
  poseBody(fig, state) {
    const lean = LEAN * this.prone * this.blend, s = fig.group.scale.y || 1;
    const bob = Math.sin(this.t * 0.9) * 0.07 * (1 - this.prone * 0.6);
    fig.group.rotation.set(lean, 0, Math.sin(this.t) * 0.11 * this.prone * this.blend);
    fig.group.position.y = (HEAD_OUT - s * HEAD * Math.cos(lean) + bob) * this.blend;
    if (fig.head) fig.head.rotation.x = this.prone * this.blend * (state.submerged ? 0.45 : 0.8);
  }

  // Front crawl when prone, wide sculling sweeps when treading water.
  poseArms(arms) {
    if (arms.length < 2) return;
    const swing = 1.05 + 0.5 * this.prone, base = -0.85 - 0.8 * this.prone;
    const spread = 0.34 + 0.75 * (1 - this.prone);
    for (let i = 0; i < 2; i++) {
      const ph = this.t * (1 + this.prone * 0.6) + i * Math.PI;
      arms[i].rotation.x = (base + Math.sin(ph) * swing) * this.blend;
      arms[i].rotation.z = (i ? 1 : -1) * (spread + Math.cos(ph) * 0.2 * (1 - this.prone)) * this.blend;
    }
  }

  // Flutter kick when prone, a slow bicycle while treading.
  poseLegs(legs) {
    if (legs.length < 2) return;
    const amp = 0.32 + 0.24 * this.prone, rate = 1.6 + this.prone * 1.2;
    for (let i = 0; i < 2; i++) {
      const ph = this.t * rate + i * Math.PI;
      legs[i].rotation.x = (Math.sin(ph) * amp - 0.25 * (1 - this.prone)) * this.blend;
      legs[i].rotation.z = (i ? 1 : -1) * 0.12 * (1 - this.prone) * this.blend;
    }
  }

  // Called once when the player steps out of the water.
  startShake() {
    if (this.posed) this.shake = SHAKE;
  }

  shakeOff(dt, fig) {
    this.shake -= dt;
    const fade = Math.max(0, this.shake / SHAKE);
    if (this.shake <= 0) { this.clear(fig); return; }
    this.blend *= Math.max(0, 1 - dt * 6);
    fig.group.rotation.set(0, Math.sin((SHAKE - this.shake) * 34) * 0.17 * fade, 0);
    fig.group.position.y = Math.abs(Math.sin((SHAKE - this.shake) * 22)) * 0.05 * fade;
  }

  clear(fig) {
    fig.group.rotation.set(0, 0, 0);
    fig.group.position.y = 0;
    if (fig.head) fig.head.rotation.x = 0;
    this.prone = this.blend = 0;
    this.posed = false;
  }

  reset(surface) {
    const fig = surface?.avatar?.figure;
    this.shake = 0;
    if (fig?.group) this.clear(fig);
  }
}
