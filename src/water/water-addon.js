// Surface addon: everything that happens when the player on foot meets the water.
// Entering makes a splash sized by the impact, being in it swims (pose, wake, bubbles,
// muffled sound, screen wash, oxygen drain) and leaving drips and shakes off.
// Registered once in src/gameplay/world-addons.js; inert on worlds without (non-lava) water.
import * as THREE from 'three';
import { WaterState } from './water-state.js';
import { SplashFx } from './splash-fx.js';
import { SwimPose } from './swim-pose.js';
import { WaterScreen } from './water-screen.js';
import { WaterSound } from './water-sound.js';
import { BubbleTrail } from '../ocean/sub-fx.js';

const SPRING = 46, DAMP = 9.5; // camera dip spring
const _b = new THREE.Vector3();
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export class WaterWorld {
  constructor(ctx) {
    const t = ctx.planet.terrain;
    this.ctx = ctx;
    this.off = !t.hasWater || ctx.planet.biome.id === 'volcanic';
    if (this.off) return;
    this.state = new WaterState(ctx.planet);
    this.splash = new SplashFx(ctx.surface.scene, ctx.fx);
    this.pose = new SwimPose();
    this.screen = new WaterScreen();
    this.sound = new WaterSound(ctx.sfx);
    this.bubbles = new BubbleTrail(ctx.surface.scene, t.waterY);
    this.dip = 0;
    this.dipV = 0;
    this.sink = 0;
    this.dripT = 0;
    this.dripAcc = 0;
    this.strokeT = 0;
    this.underT = 0;
    this.swamOnce = false;
  }

  update(dt, alive) {
    if (this.off || !this.ctx.surface.planet) return;
    const s = this.ctx.surface;
    this.state.update(s);
    this.transitions(s, alive);
    this.underT = this.state.submerged ? this.underT + dt : 0;
    this.pose.apply(dt, s, this.state, s.moveSpeed > 0);
    this.aimCamera(dt, s);
    this.ambient(dt, s);
    this.splash.update(dt, s.planet.gravity || 9.8);
    // Oxygen: the camera-based flag in surface-mode misses a dive in third person, so the
    // head-based one gets its own field (life-support ORs the two).
    const life = this.ctx.gameplay?.life;
    if (life) life.headUnderWater = this.state.submerged;
  }

  transitions(s, alive) {
    const st = this.state, f = s.feet;
    if (st.entered) this.enter(s, st.entered);
    if (st.left) this.leave();
    if (st.dived) this.screen.splashed(0.6);
    // A swimmer bobs through the swell constantly; only a real dive earns a gasp.
    if (st.surfaced && this.underT > 0.45) {
      this.sound.gasp();
      this.screen.splashed(1);
      this.splash.splash(f.x, st.surfaceY, f.z, 2.6);
    }
    if (st.swimming && !this.swamOnce && alive) {
      this.swamOnce = true;
      this.ctx.player?.emit?.('act', { type: 'swim' });
    }
  }

  // power: the fall speed the player hit the water with (0.6 stepping in, 20+ from a cliff).
  enter(s, power) {
    this.splash.splash(s.feet.x, this.state.surfaceY, s.feet.z, power);
    this.sound.splash(power);
    this.dipV = -Math.min(4.6, 0.8 + power * 0.24);
    this.screen.splashed(Math.min(1, 0.22 + power * 0.07));
  }

  leave() {
    this.pose.startShake();
    this.screen.splashed(0.8);
    this.dripT = 2.8;
  }

  // Per-frame water presence: wake rings, suit bubbles, drips, screen wash and muffling.
  ambient(dt, s) {
    const st = this.state, moving = s.moveSpeed > 0;
    if (st.inWater) this.splash.wake(dt, s.feet.x, st.surfaceY, s.feet.z, moving && !st.submerged);
    if (st.swimming && moving) this.strokes(dt);
    _b.set(s.feet.x + 0.1, s.feet.y + 1.32, s.feet.z + 0.05);
    this.bubbles.update(dt, _b, st.submerged ? (moving ? 10 : 4) : 0);
    if (st.submerged) this.sound.bubbles(dt);
    this.drip(dt, s);
    // A ship cockpit or the submarine is sealed: no visor wash, no muffling in there.
    const sealed = s.flying || Boolean(s.vehicle?.active);
    const camD = sealed ? 0 : this.camDepth(s), k = clamp01(camD / 0.4);
    this.screen.update(dt, k, Math.max(0, camD));
    this.sound.setMuffle(k);
  }

  strokes(dt) {
    if ((this.strokeT -= dt) > 0) return;
    this.strokeT = 0.62;
    this.sound.stroke(this.state.submerged ? 0.5 : 1);
  }

  // Water running off the suit for a few seconds after climbing out.
  drip(dt, s) {
    if (this.dripT <= 0) return;
    this.dripT -= dt;
    if ((this.dripAcc += dt) < 0.07) return;
    this.dripAcc = 0;
    const shaking = this.pose.shaking;
    this.splash.drop(s.feet.x, s.feet.y + 0.45 + Math.random() * 1.15, s.feet.z,
      shaking ? 5 : 2, shaking ? 0.85 : 0.18, shaking ? 1.1 : 0.5, s.feet.y - 0.05);
  }

  // Wave height at any x/z on this planet's sea.
  waterAt(s, x, z) {
    const wy = this.state.waterY;
    return s.waterSurface?.heightAt(x, z, wy - s.h(x, z)) ?? wy;
  }

  // How far the camera itself is below the swell (drives the tint and the muffling).
  camDepth(s) {
    const c = s.camera.position;
    return this.waterAt(s, c.x, c.z) - c.y;
  }

  // The chase camera sits well above the head, so a dive would otherwise leave it in the air
  // and the whole underwater look would never show. Ease it under with the player, but never
  // through the sea floor. Only ever pushes the camera down, and never on land.
  aimCamera(dt, s) {
    this.sink += ((this.state.submerged ? 1 : 0) - this.sink) * Math.min(1, dt * 5);
    const c = s.camera.position;
    if (this.sink > 0.01) {
      const want = Math.max(s.h(c.x, c.z) + 0.55, this.waterAt(s, c.x, c.z) - 0.55);
      if (c.y > want) c.y += (want - c.y) * this.sink;
    }
    this.dipCamera(dt, s);
  }

  dipCamera(dt, s) {
    if (this.dip === 0 && this.dipV === 0) return;
    this.dipV += (-this.dip * SPRING - this.dipV * DAMP) * dt;
    this.dip += this.dipV * dt;
    if (Math.abs(this.dip) < 0.002 && Math.abs(this.dipV) < 0.02) { this.dip = this.dipV = 0; return; }
    s.camera.position.y += this.dip;
    s.camera.rotation.x += this.dip * 0.16;
  }

  dispose() {
    if (this.off) return;
    if (this.ctx.gameplay?.life) this.ctx.gameplay.life.headUnderWater = false;
    this.pose.reset(this.ctx.surface);
    this.splash.dispose();
    this.bubbles.dispose();
    this.screen.dispose();
    this.sound.dispose();
  }
}
