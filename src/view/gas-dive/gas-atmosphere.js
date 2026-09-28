// Altitude -> atmosphere state: fog, sky gradient, sunlight. Altitude 0 = cloud tops,
// +400 = edge of space, -3000 = crushing depth. Writes into one pooled object.
import * as THREE from 'three';

export const TOP_EXIT = 400;
export const CRUSH_DEPTH = -3000;
const BLACK = new THREE.Color(0x010104);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export class GasAtmosphere {
  constructor(pal) {
    this.pal = pal;
    this.state = {
      depth: 0, above: 0, fog: new THREE.Color(), density: 0, zenith: new THREE.Color(),
      nadir: new THREE.Color(), haze: 0.5, sun: 1, ambient: 1, space: 0,
    };
    // Fixed cloud lighting by height: sunlit tops, murky depths.
    this.light = {
      top: new THREE.Color(1.12, 1.1, 1.05),
      deep: pal.mean.clone().lerp(pal.deep, 0.5).multiplyScalar(0.9).addScalar(0.02),
    };
  }

  // Returns the pooled state for altitude alt; flash (0..1) brightens everything briefly.
  at(alt, flash = 0) {
    const s = this.state, p = this.pal;
    s.depth = clamp01(-alt / -CRUSH_DEPTH);
    s.above = clamp01(alt / TOP_EXIT);
    const murk = Math.pow(s.depth, 0.75);
    s.fog.copy(p.haze).lerp(p.deep, murk);
    s.density = alt > 0 ? THREE.MathUtils.lerp(0.00005, 0.000025, s.above)
      : THREE.MathUtils.lerp(0.00007, 0.00095, Math.pow(s.depth, 1.1));
    this.zenith(alt, murk);
    s.nadir.copy(p.haze).multiplyScalar(0.75).lerp(p.deep, Math.min(1, murk * 1.2));
    s.haze = alt > 0 ? THREE.MathUtils.lerp(0.32, 0.14, s.above) : Math.min(1, 0.32 + -alt / 400);
    s.sun = Math.pow(1 - s.depth, 1.6);
    s.ambient = 0.25 + 0.75 * (1 - s.depth);
    s.space = clamp01(0.25 + s.above * 0.75) * (1 - clamp01(-alt / 250));
    if (flash > 0) this.flash(flash);
    return s;
  }

  zenith(alt, murk) {
    const s = this.state, p = this.pal;
    const under = clamp01(-alt / 350); // below the tops the ceiling is cloud, not sky
    s.zenith.copy(p.zenith).lerp(BLACK, s.above);
    s.zenith.lerp(p.haze, under * 0.85).lerp(p.deep, murk);
  }

  flash(f) {
    const s = this.state;
    const k = f * 0.6;
    s.fog.lerp(this.pal.glow, k * 0.3).multiplyScalar(1 + k);
    s.zenith.multiplyScalar(1 + k * 2);
    s.ambient += f;
  }
}
