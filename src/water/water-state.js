// Where the on-foot player sits relative to the water, recomputed once per surface frame.
// Everything else in src/water reads this: foot depth, the live wave height under the player,
// how deep the head is, and the four transitions (entered, left, dived, surfaced).
// The impact speed carried by `entered` is the speed from the frame *before* the splash,
// because the Swimmer brakes velY on the way in.

const EYE = 1.7;      // matches EYE in src/view/surface.js
const WADE_IN = 0.26; // foot depth that counts as entering the water
const WADE_OUT = 0.1; // and the shallower depth you have to climb back to to be out of it
const HEAD_IN = 0.14;  // head this far under the wave surface counts as submerged
const HEAD_OUT = -0.06; // and this far above it to count as back in the air

export class WaterState {
  constructor(planet) {
    this.waterY = planet.terrain.waterY;
    this.reset();
  }

  reset() {
    this.inWater = false;
    this.submerged = false;
    this.swimming = false;
    this.depth = 0;
    this.headDepth = 0;
    this.surfaceY = this.waterY;
    this.entered = 0;
    this.left = false;
    this.dived = false;
    this.surfaced = false;
    this.lastVelY = 0;
  }

  // Aboard a ship or the submarine the player is sealed in: treat that as dry land.
  stand() {
    if (this.inWater) this.left = true;
    this.inWater = this.submerged = this.swimming = false;
    this.depth = this.headDepth = 0;
    this.lastVelY = 0;
  }

  update(surface) {
    this.entered = 0;
    this.left = this.dived = this.surfaced = false;
    if (surface.flying || surface.vehicle?.active || !surface.planet) { this.stand(); return; }
    const f = surface.feet, ground = surface.h(f.x, f.z);
    this.surfaceY = surface.waterSurface?.heightAt(f.x, f.z, this.waterY - ground) ?? this.waterY;
    this.depth = this.surfaceY - f.y;
    this.headDepth = this.surfaceY - (f.y + EYE);
    this.flip(Boolean(surface.swimming));
    this.lastVelY = surface.velY;
  }

  // Raises the transition flags for this frame from the freshly measured depths.
  flip(swimming) {
    const was = this.inWater, wasUnder = this.submerged;
    this.inWater = this.depth > (was ? WADE_OUT : WADE_IN); // hysteresis: the swell laps the shore
    this.swimming = swimming;
    this.submerged = this.inWater && this.headDepth > (wasUnder ? HEAD_OUT : HEAD_IN);
    if (this.inWater && !was) this.entered = Math.max(0.6, -this.lastVelY);
    if (!this.inWater && was) this.left = true;
    if (this.submerged && !wasUnder) this.dived = true;
    if (!this.submerged && wasUnder) this.surfaced = true;
  }
}
