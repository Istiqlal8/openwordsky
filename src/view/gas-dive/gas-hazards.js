// Dive hazards: crushing pressure below -2500 m (damage every second), a pressure warning
// below -1800 m, lightning strikes near the ship and storm turbulence. Reports via onDamage.
const WARN_DEPTH = -1800, DAMAGE_DEPTH = -2500, CRUSH = -3000;

export class GasHazards {
  constructor() {
    this.onDamage = null; // (amount, cause) => void
    this.reset();
  }

  reset() {
    this.tick = 1;
    this.shockTimer = 0;
  }

  // Turbulence 0..1 at altitude alt with storm proximity storm (0..1).
  static turbulence(alt, storm) {
    const depth = Math.max(0, Math.min(1, -alt / -CRUSH));
    const base = alt > 0 ? 0.05 * Math.max(0, 1 - alt / 300) : 0.1 + depth * 0.55;
    return Math.min(1, base + storm * 0.75);
  }

  // Returns the warning text for this frame, or null.
  update(dt, alt, storm, hit) {
    this.shockTimer = Math.max(0, this.shockTimer - dt);
    if (hit) {
      this.shockTimer = 1.6;
      this.damage(3 + Math.random() * 4, 'Petir');
    }
    this.pressure(dt, alt);
    if (this.shockTimer > 0) return 'Tersambar petir!';
    if (alt < DAMAGE_DEPTH) return 'Tekanan kritis! Lambung rusak';
    if (alt < WARN_DEPTH) return 'Tekanan tinggi!';
    if (storm > 0.45) return 'Turbulensi badai';
    return null;
  }

  // One damage tick per second while below the damage depth; worse the deeper you go.
  pressure(dt, alt) {
    if (alt >= DAMAGE_DEPTH) { this.tick = 1; return; }
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick += 1;
    const k = Math.min(1.2, (DAMAGE_DEPTH - alt) / (DAMAGE_DEPTH - CRUSH));
    this.damage(5 + 20 * k, 'Tekanan');
  }

  damage(amount, cause) {
    this.onDamage?.(Math.round(amount), cause);
  }
}
