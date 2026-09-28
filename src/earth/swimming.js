// Swimming for the on-foot player on worlds with water (not lava): in water deeper than
// DEEP the player sinks, floats up to tread water with the head above the surface, swims
// with Space (up) / C or Ctrl (dive), and can reach the sea floor. The jetpack still works
// from the surface.
const DEEP = 1.3;       // water depth where wading turns into swimming
const HEAD_OUT = 0.3;   // head height above the surface while treading water
const SWIM_V = 2.2, BUOYANCY = 0.7;

export const SWIM_SPEED = 3, SWIM_SPRINT = 5;

export class Swimmer {
  constructor(view, eye) {
    this.view = view;
    this.waterY = view.planet.terrain.waterY;
    this.eye = eye;
    this.float = this.waterY - eye + HEAD_OUT; // feet height while treading water (bobs with the swell)
    this.active = false;
  }

  // Deep enough to swim at x/z.
  deep(x, z) { return this.view.h(x, z) < this.waterY - DEEP; }

  // Vertical motion in deep water. Returns false (nothing done) on land or in shallows.
  step(dt, input) {
    const v = this.view, f = v.feet;
    if (!this.deep(f.x, f.z)) { this.active = false; return false; }
    const wasIn = this.active, up = input.down('Space'), ground = v.h(f.x, f.z);
    const surface = v.waterSurface?.heightAt(f.x, f.z, this.waterY - ground) ?? this.waterY;
    this.float = surface - this.eye + HEAD_OUT;
    this.active = f.y < this.float + 0.02;
    v.onGround = false;
    if (!this.active) {
      v.velY -= (v.planet.gravity || 9.8) * dt; // falling in (or jetting out)
      v.jetpack(dt, input);
    } else if (up && f.y > this.float - 0.3 && v.jet > 0) {
      v.jetpack(dt, input); // lift off from the surface
    } else {
      this.paddle(dt, input, wasIn);
    }
    f.y += v.velY * dt;
    if (f.y < ground) { f.y = ground; v.velY = Math.max(0, v.velY); }
    return true;
  }

  paddle(dt, input, wasIn) {
    const v = this.view, f = v.feet;
    if (!wasIn && v.velY < -2) v.velY *= 0.35; // splash: water brakes the fall
    const dive = input.down('KeyC') || input.down('ControlLeft') || input.down('ControlRight');
    const want = input.down('Space') ? SWIM_V : dive ? -SWIM_V : Math.min(BUOYANCY, (this.float - f.y) * 0.6);
    v.velY += (want - v.velY) * Math.min(1, dt * 3);
    v.jet = Math.min(1, v.jet + dt / 1.5);
    if (f.y + v.velY * dt > this.float) { f.y = this.float - v.velY * dt; } // ride the swell
  }
}
