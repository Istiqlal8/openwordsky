// One alien individual's body: race builder + color variant + procedural animation
// (walk / float cycle, idle breathing, gestures, blinking or pulsing eyes).
import { makeMats } from './body-kit.js';
import { buildVorran, buildKsirr, buildAquor } from './bodies-a.js';
import { buildBlubo, buildMekanid } from './bodies-b.js';
import { buildKristalin, buildMikoni, buildAveli, buildBatugar } from './bodies-c.js';
import { buildRimbuna, buildTintari, buildKribo, buildLumari } from './bodies-d.js';
import { buildSaurak, buildWolla, buildNexar } from './bodies-e.js';

export const BUILDERS = { vorran: buildVorran, ksirr: buildKsirr, aquor: buildAquor, blubo: buildBlubo, mekanid: buildMekanid,
  kristalin: buildKristalin, mikoni: buildMikoni, aveli: buildAveli, batugar: buildBatugar, rimbuna: buildRimbuna,
  tintari: buildTintari, kribo: buildKribo, lumari: buildLumari, saurak: buildSaurak, wolla: buildWolla, nexar: buildNexar };

export class AlienBody {
  // kit: GeoKit shared by the whole outpost; rng: the individual's Rng.
  constructor(race, kit, rng) {
    this.race = race;
    this.mats = makeMats(race, rng);
    this.rig = BUILDERS[race.id](kit, this.mats, rng);
    this.height = rng.range(race.height[0], race.height[1]);
    this.group = this.rig.root;
    this.group.scale.setScalar(this.height / this.rig.unit);
    this.group.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    this.phase = rng.range(0, 10);
    Object.assign(this, { t: 0, walkT: 0, blinkIn: rng.range(1, 4), blink: 0, gesture: 'none' });
  }

  // speed: ground speed (m/s); gesture: 'none' | 'wave' | 'work' | 'talk' | 'look'.
  update(dt, speed, gesture = 'none') {
    this.t += dt;
    this.walkT += dt * (speed * 3.2 / Math.max(1, this.height));
    const swing = Math.sin(this.walkT) * Math.min(1, speed / 2) * 0.6;
    if (this.rig.float) this.floatCycle(swing, speed);
    else this.walkCycle(swing, speed);
    this.armPose(swing, gesture);
    this.idle(dt, gesture);
    this.blinkEyes(dt);
  }

  walkCycle(swing, speed) {
    const legs = this.rig.legs, bob = Math.abs(Math.sin(this.walkT)) * Math.min(1, speed / 2) * 0.04;
    legs[0].rotation.x = (legs[0].userData.base ?? 0) + swing;
    legs[1].rotation.x = (legs[1].userData.base ?? 0) - swing;
    this.rig.torso.position.y = this.rig.torso.userData.y0 ??= this.rig.torso.position.y;
    this.rig.torso.position.y += bob;
  }

  // Floaters (Blubo, Tintari, Lumari): hover bob, tentacles ripple, lean into motion.
  floatCycle(swing, speed) {
    const t = this.t + this.phase, torso = this.rig.torso;
    torso.userData.y0 ??= torso.position.y;
    torso.position.y = torso.userData.y0 + 0.12 + Math.sin(t * 1.7) * 0.08;
    torso.rotation.x = -Math.min(1, speed / 3) * 0.25;
    const squash = 1 + Math.sin(t * 3.1) * 0.04;
    torso.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    for (const leg of this.rig.legs) {
      const p = leg.userData.phase;
      leg.rotation.x = Math.sin(t * 2.4 + p) * 0.35 + speed * 0.12;
      leg.rotation.z = Math.cos(t * 2 + p) * 0.25;
    }
  }

  armPose(swing, gesture) {
    const arms = this.rig.arms, t = this.t + this.phase;
    for (let i = 0; i < arms.length; i++) {
      const side = i % 2 ? 1 : -1;
      arms[i].rotation.set((i % 2 ? swing : -swing) * 0.8, 0, side * 0.08);
    }
    const right = arms[1];
    if (gesture === 'wave') right.rotation.set(0, 0, 2.5 + Math.sin(t * 9) * 0.45);
    if (gesture === 'work') {
      for (let i = 0; i < arms.length; i++) arms[i].rotation.x = 0.9 + Math.sin(t * 6 + i * 1.7) * 0.5;
    }
    if (gesture === 'talk') {
      arms[0].rotation.set(0.7 + Math.sin(t * 3) * 0.25, 0, -0.35);
      right.rotation.set(0.7 + Math.sin(t * 3.4 + 1) * 0.25, 0, 0.35);
    }
  }

  // Breathing, head sway / nodding, fluttering frills and spinning parts.
  idle(dt, gesture) {
    const t = this.t + this.phase, r = this.rig;
    if (!r.float) r.torso.scale.y = 1 + Math.sin(t * 1.6) * 0.015;
    r.head.rotation.y = Math.sin(t * 0.37) * 0.35;
    r.head.rotation.x = gesture === 'talk' ? Math.sin(t * 5) * 0.12 : gesture === 'look' ? -0.2 : Math.sin(t * 0.5) * 0.06;
    for (let i = 0; i < r.frills.length; i++) r.frills[i].rotation.x = (r.frills[i].userData.x0 ??= r.frills[i].rotation.x) + Math.sin(t * 4 + i) * 0.12;
    for (const s of r.spin) { s.rotation.y += dt * 1.4; s.rotation.x += dt * 0.6; }
    if (r.blinkTip) r.blinkTip.visible = Math.sin(t * 5) > -0.2;
  }

  // Eyelids: squash the eyes shut for a moment; glowing eyes pulse instead.
  blinkEyes(dt) {
    const glowy = this.rig.eyes[0]?.material === this.mats.glow;
    this.mats.glow.emissiveIntensity = 1.3 + Math.sin((this.t + this.phase) * 2.2) * 0.5;
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) { this.blink = 0.14; this.blinkIn = 2 + ((this.t * 7.3) % 4); }
    this.blink = Math.max(0, this.blink - dt);
    const k = this.blink > 0 ? 0.1 : 1;
    for (const e of this.rig.eyes) {
      e.userData.sy ??= e.scale.y;
      e.scale.y = e.userData.sy * (glowy ? Math.max(0.3, k) : k);
    }
  }

  dispose() {
    this.group.removeFromParent();
    for (const m of this.mats.all) m.dispose(); // geometries belong to the shared GeoKit
  }
}
