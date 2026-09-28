// Space-view builders: planet bodies (shape, atmosphere, clouds, rings, moons) and the star.
// Body geometry and coloring live in planet-shapes/, space-surface.js and space-gas.js.
import * as THREE from 'three';
import { Rng } from '../core/rng.js';
import { glowTexture, ringTexture, cloudTexture } from '../assets/textures.js';
import { buildShape } from './planet-shapes/shapes.js';
import { paintGeometry } from './planet-shapes/paint.js';
import { moonColorer } from './space-surface.js';
import { gasGlowColor, isGasLike } from './space-gas.js';

const WHITE = new THREE.Color(0xffffff);
const AXIS_TILT = { earth: 0.41, mars: 0.44, saturn: 0.47, uranus: 1.71, neptune: 0.49, jupiter: 0.05, venus: 0.05, mercury: 0.01 };
const RING_STYLE = { saturn: { inner: 1.22, outer: 2.35, color: 0xdcc9a0 } };

const ATMO_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

// Rendered on the back faces: fades to zero at the shell edge, peaks at the planet limb.
const ATMO_FRAG = /* glsl */ `
uniform vec3 color;
uniform float strength;
varying vec3 vN;
varying vec3 vV;
void main() {
  float d = -dot(normalize(vN), normalize(vV));
  float f = pow(clamp(d / 0.4, 0.0, 1.0), 1.6);
  gl_FragColor = vec4(color * f * strength, 1.0);
}`;

export function orbitPosition(orbit, time, out) {
  const a = orbit.phase + orbit.speed * time;
  const x = Math.cos(a) * orbit.radius;
  const s = Math.sin(a) * orbit.radius;
  return out.set(x, s * Math.sin(orbit.tilt), s * Math.cos(orbit.tilt));
}

function atmosphereMaterial(planet, glow) {
  const gas = isGasLike(planet);
  const color = gas ? gasGlowColor(planet) : planet.style === 'earth' ? 0x7fb4ff : planet.palette.sky;
  const strength = (0.5 + planet.atmosphereDensity * 1.1) * glow * (gas ? 0.7 : 1);
  return new THREE.ShaderMaterial({
    vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG,
    uniforms: { color: { value: new THREE.Color(color) }, strength: { value: strength } },
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  });
}

function hasClouds(planet) {
  return planet.style === 'earth' || (!planet.style && planet.atmosphereDensity >= 0.33);
}

// Cloud textures cost ~85 ms each to paint, so procedural planets share a small
// pool (varied by a random spin phase); Solar System bodies get their own.
const CLOUD_POOL = 4;

function cloudMaterial(planet) {
  const map = cloudTexture(planet.style ? planet.seed : 0xc10d + (planet.seed % CLOUD_POOL));
  if (map.wrapS !== THREE.RepeatWrapping) {
    map.wrapS = THREE.RepeatWrapping; // cube cloud shells use u in 0..1.5
    map.needsUpdate = true;
  }
  return new THREE.MeshStandardMaterial({
    map, transparent: true, depthWrite: false, roughness: 1,
    opacity: Math.min(0.9, 0.5 + planet.atmosphereDensity * 0.4),
  });
}

// Glow shell (and clouds) hugging each visible part of the body.
function addShells(planet, shape, clouds, rng) {
  const glow = planet.atmosphereDensity > 0 || isGasLike(planet) ? atmosphereMaterial(planet, shape.glow) : null;
  const cloudMat = hasClouds(planet) && shape.parts.some((p) => p.cloudGeo) ? cloudMaterial(planet) : null;
  for (const part of shape.parts) {
    if (glow) {
      const atmo = new THREE.Mesh(part.shellGeo ?? part.mesh.geometry, glow);
      atmo.scale.setScalar(1.08);
      part.mesh.add(atmo);
    }
    if (!cloudMat || !part.cloudGeo) continue;
    const cloud = new THREE.Mesh(part.cloudGeo, cloudMat);
    cloud.scale.setScalar(1.035);
    cloud.rotation.set(rng.range(-0.3, 0.3), rng.range(0, Math.PI * 2), 0);
    cloud.userData.phase = cloud.rotation.y;
    part.mesh.add(cloud);
    if (part.spinClouds) clouds.push(cloud);
  }
}

function buildRings(planet, rng) {
  const style = RING_STYLE[planet.style];
  const inner = planet.radius * (style?.inner ?? 1.5);
  const outer = planet.radius * (style?.outer ?? 2.4);
  const geo = new THREE.RingGeometry(inner, outer, 192, 1);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const d = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (d - inner) / (outer - inner), 0.5);
  }
  const map = ringTexture(planet.seed, style?.color ?? planet.palette.rock);
  const mat = new THREE.MeshStandardMaterial({
    map, emissiveMap: map, emissive: WHITE, emissiveIntensity: style ? 0.35 : 0.15, // ice glints on the unlit side
    side: THREE.DoubleSide, transparent: true, depthWrite: false, roughness: 1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  if (style) mesh.rotation.set(-Math.PI / 2, 0, 0); // equatorial: tilts with the axis
  else mesh.rotation.set(-Math.PI / 2 + rng.range(-0.45, 0.45), 0, rng.range(-0.3, 0.3));
  return mesh;
}

function buildMoon(planet, rng, i, spacing) {
  const r = planet.radius * rng.range(0.1, 0.25);
  const geo = new THREE.SphereGeometry(r, 40, 26);
  paintGeometry(geo, moonColorer(planet.seed + i * 977), { bump: 0.05 });
  const shade = rng.range(0.7, 1);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, color: new THREE.Color(shade, shade, shade * 0.97), roughness: 1 });
  return {
    mesh: new THREE.Mesh(geo, mat), dist: planet.radius * (2.3 + i * spacing + rng.range(0, 0.25)),
    speed: rng.range(0.05, 0.2) * (rng.chance(0.5) ? 1 : -1),
    phase: rng.range(0, Math.PI * 2), tilt: rng.range(-0.3, 0.3),
  };
}

// Moons orbit 2.3..4 x radius, sized 0.1..0.25 x radius.
function buildMoons(planet, rng) {
  const spacing = planet.moons > 1 ? Math.min(0.6, 1.4 / (planet.moons - 1)) : 0;
  return Array.from({ length: planet.moons }, (_, i) => buildMoon(planet, rng, i, spacing));
}

// One planet in the system: body + extras, positioned on its orbit.
// `radius` is the bounding radius used for collision and landing.
export class PlanetBody {
  constructor(planet) {
    const rng = new Rng(planet.seed ^ 0x9e37);
    this.planet = planet;
    this.radius = planet.radius;
    this.pos = new THREE.Vector3();
    this.group = new THREE.Group();
    const axis = new THREE.Group();
    const tilt = rng.range(-0.4, 0.4);
    axis.rotation.z = AXIS_TILT[planet.style] ?? tilt;
    this.group.add(axis);
    this.shape = buildShape(planet);
    this.body = this.shape.root;
    axis.add(this.body);
    this.clouds = [];
    addShells(planet, this.shape, this.clouds, rng);
    if (planet.rings) (RING_STYLE[planet.style] ? axis : this.group).add(buildRings(planet, rng));
    this.moons = buildMoons(planet, rng);
    for (const m of this.moons) this.group.add(m.mesh);
  }

  update(time) {
    orbitPosition(this.planet.orbit, time, this.pos);
    if (this.parentBody) this.pos.add(this.parentBody.pos); // moons (e.g. Bulan) orbit their planet
    this.group.position.copy(this.pos);
    this.body.rotation.y = time * 0.03;
    this.shape.update(time);
    for (const c of this.clouds) c.rotation.y = c.userData.phase + time * 0.015;
    for (const m of this.moons) {
      const a = m.phase + m.speed * time;
      m.mesh.position.set(Math.cos(a) * m.dist, Math.sin(a) * m.dist * m.tilt, Math.sin(a) * m.dist);
    }
  }
}

// Star core + additive glow sprite (~7x the core size). Lighting is a decay-0
// PointLight added by space.js, so far planets stay lit.
export function buildStar(star) {
  const group = new THREE.Group();
  const coreColor = new THREE.Color(star.color).lerp(WHITE, 0.35);
  const core = new THREE.Mesh(new THREE.SphereGeometry(star.size, 64, 48), new THREE.MeshBasicMaterial({ color: coreColor }));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(star.color), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  }));
  glow.scale.setScalar(star.size * 7);
  group.add(core, glow);
  return group;
}
