// A planet devourer actually feeds: it parks over one world, opens a feeding beam, and tears a
// stream of rock out of the crust. The planet visibly shrinks while this goes on, so arriving in
// the system and arriving an hour later are not the same sight.
import * as THREE from 'three';

const DUST = 220; // debris motes in the stream
const EAT_RATE = 0.0016; // fraction of the planet consumed per second (~4 minutes to the floor)
const MIN_SCALE = 0.55; // it never finishes: the world is left a gnawed husk
const REACH = 2.4; // how far above the surface the maw hangs, in planet radii
const _a = new THREE.Vector3(), _b = new THREE.Vector3();

// Wide cone of light running from the maw down to the planet.
function buildBeam(color) {
  // Wide end at +Y (the crust), narrow end at the origin (the mouth), so the mesh can simply be
  // rotated to point +Y at the planet.
  const geo = new THREE.CylinderGeometry(1, 0.16, 1, 24, 1, true);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

// Motes that ride up the beam; t runs 1 (at the planet) to 0 (swallowed).
function buildDust(color) {
  const pos = new Float32Array(DUST * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size: 9, sizeAttenuation: true, transparent: true,
    opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}

export class VoidFeed {
  constructor(space) {
    this.space = space;
    this.body = null; // the PlanetBody being eaten
    this.eaten = 0; // 0 = untouched, 1 = down to MIN_SCALE
    this.beam = null;
    this.dust = null;
    this.motes = [];
  }

  // Picks the fattest planet in reach; moons and gas giants are left alone.
  mount(system, rng, color) {
    this.dispose();
    const meals = this.space.bodies.filter((b) => !b.planet.orbit?.parent && !b.planet.gas);
    if (!meals.length) return null;
    this.body = rng.pick(meals);
    this.baseScale = this.body.group.scale.x;
    this.baseRadius = this.body.radius;
    this.beam = buildBeam(color);
    this.dust = buildDust(color);
    for (let i = 0; i < DUST; i++) this.motes.push({ t: Math.random(), spin: Math.random() * 6.3, r: Math.random() });
    this.space.scene.add(this.beam, this.dust);
    return this.body;
  }

  // Where the maw should hang: straight out from the star, above the planet's day side.
  anchor(out) {
    const p = this.body.pos;
    const up = _a.copy(p).normalize();
    if (!Number.isFinite(up.x) || up.lengthSq() < 0.5) up.set(0, 1, 0);
    return out.copy(p).addScaledVector(up, this.body.radius * REACH);
  }

  // Grinds the planet down; returns the world scale it should now be drawn at.
  consume(dt) {
    this.eaten = Math.min(1, this.eaten + EAT_RATE * dt);
    const k = 1 - (1 - MIN_SCALE) * this.eaten;
    this.body.group.scale.setScalar(this.baseScale * k);
    this.body.radius = this.baseRadius * k; // keeps the landing ring on the shrinking surface
    return k;
  }

  // Beam from the maw down onto the crust, jittering as it bites.
  aimBeam(mawPos, t) {
    const to = _b.subVectors(this.body.pos, mawPos);
    const len = to.length();
    this.beam.position.copy(mawPos);
    this.beam.quaternion.setFromUnitVectors(_a.set(0, 1, 0), to.divideScalar(len));
    this.beam.scale.set(this.body.radius * 0.9, len, this.body.radius * 0.9);
    this.beam.material.opacity = 0.18 + Math.sin(t * 7) * 0.05 + Math.sin(t * 2.3) * 0.04;
  }

  // Motes stream from the crust up into the mouth and respawn at the bottom.
  streamDust(dt, mawPos) {
    const arr = this.dust.geometry.attributes.position.array;
    const spread = this.body.radius * 0.85;
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      m.t -= dt * 0.55;
      if (m.t <= 0) { m.t = 1; m.spin = Math.random() * 6.3; m.r = Math.random(); }
      // Lerp maw <- planet, swirling inward so the stream funnels rather than runs straight.
      const wob = Math.cos(m.spin + m.t * 9) * spread * m.r * m.t;
      _a.lerpVectors(mawPos, this.body.pos, m.t);
      arr[i * 3] = _a.x + wob;
      arr[i * 3 + 1] = _a.y + Math.sin(m.spin + m.t * 7) * spread * m.r * m.t;
      arr[i * 3 + 2] = _a.z + wob * 0.6;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
  }

  update(dt, mawPos, t) {
    if (!this.body) return;
    this.consume(dt);
    this.aimBeam(mawPos, t);
    this.streamDust(dt, mawPos);
  }

  // The devourer is dead or has let go: the beam stops, the scar stays.
  stop() {
    for (const o of [this.beam, this.dust]) {
      if (!o) continue;
      o.removeFromParent();
      o.geometry.dispose();
      o.material.dispose();
    }
    this.beam = this.dust = null;
    this.motes.length = 0;
  }

  dispose() {
    this.stop();
    this.body = null;
    this.eaten = 0;
  }
}
