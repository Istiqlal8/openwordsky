// The Pemakan Planet itself: a procedural colossus about 5,200 units across (the Kapal Induk
// freighter is ~340), built from a dark core, a glowing intake maw, three slow rings, radial
// spines and six shield nodes. Two impostors keep it readable: a world-space halo and a
// screen-space beacon that fades in once the mesh gets too small to see.
import * as THREE from 'three';
import { Rng } from '../core/rng.js';
import { glowTexture } from '../assets/textures.js';
import { readyModel, cloneModel, tintedMaterial } from '../view/life/models/model-cache.js';

export const CORE_R = 520;
export const SPAN = 3400;             // spine tips: the silhouette is ~6,800 units wide
export const NODE_R = 150;
const NODE_RING = 1350;
const GREEBLE_FADE = 14000;           // spines/rings hide past this camera distance
const BEACON_FADE = [9000, 26000];

const tmpV = new THREE.Vector3();
const ramp = (x, a, b) => THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);

function sprite(hex, scale, attenuate = true) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(hex), color: hex, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: attenuate }));
  s.scale.setScalar(scale);
  return s;
}

function darkMat(emissive, intensity, color = 0x191a22) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.4, flatShading: true,
    emissive: new THREE.Color(emissive), emissiveIntensity: intensity });
}

function buildRings(rng, mat) {
  const group = new THREE.Group();
  const out = [];
  for (let i = 0; i < 3; i++) {
    const r = 1050 + i * 420;
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, 42 + i * 14, 6, 60), mat);
    mesh.rotation.set(rng.range(-0.5, 0.5) + i * 0.4, rng.range(0, Math.PI), rng.range(-0.4, 0.4));
    group.add(mesh);
    out.push({ mesh, spin: rng.range(0.02, 0.06) * (i % 2 ? -1 : 1) });
  }
  return { group, out };
}

// Eight tapered spines on one InstancedMesh: a single draw call for the whole crown.
function buildSpines(rng, mat) {
  const geo = new THREE.ConeGeometry(150, SPAN, 5, 1, true);
  geo.translate(0, SPAN * 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, mat, 8);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tilt = rng.range(-0.5, 0.5);
    tmpV.set(Math.cos(a), Math.sin(tilt), Math.sin(a)).normalize();
    q.setFromUnitVectors(up, tmpV);
    m.compose(new THREE.Vector3(), q, new THREE.Vector3(1, rng.range(0.7, 1.1), 1));
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export class DevourerEntity {
  // `seed` fixes the silhouette; `facing` is the unit direction toward the planet it is eating.
  constructor(seed, facing) {
    const rng = new Rng(seed ^ 0x0de7);
    this.group = new THREE.Group();
    this.group.name = 'devourer';
    this.time = 0;
    this.hull = darkMat(0x4a1409, 0.95);
    this.limb = darkMat(0x862c0e, 1.5, 0x241a18);
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.buildBody(rng);
    this.buildNodes();
    this.buildAura();
    this.face(facing);
  }

  buildBody(rng) {
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(CORE_R, 2), this.hull);
    this.maw = new THREE.Mesh(new THREE.TorusGeometry(CORE_R * 1.25, 120, 8, 40), this.hull);
    this.maw.position.z = -CORE_R * 0.55;
    this.mawGlow = new THREE.Mesh(new THREE.CircleGeometry(CORE_R * 1.15, 40), this.glowMat);
    this.mawGlow.position.z = -CORE_R * 0.5;
    const rings = buildRings(rng, this.hull);
    this.rings = rings.out;
    this.spines = buildSpines(rng, this.limb);
    this.greebles = new THREE.Group();
    this.greebles.add(rings.group, this.spines);
    this.group.add(this.core, this.maw, this.mawGlow, this.greebles);
    this.model = null;
    this.swapIn(); // the shapes above stand in until the sculpted model has loaded
  }

  // Replaces the placeholder core and maw ring with the sculpted devourer model. The rings,
  // spines and shield nodes stay: the battle's hitboxes are measured against CORE_R and NODE_R.
  swapIn() {
    if (this.model) return true;
    const tpl = readyModel('devourer');
    if (!tpl) return false;
    this.modelMat = tintedMaterial(tpl, 0xff7a2a, 0.35);
    this.modelMat.emissive = new THREE.Color(0xff5a1e);
    this.modelMat.emissiveIntensity = 0.7; // it sits in its own shadow inside the spine crown
    this.model = cloneModel(tpl, this.modelMat);
    const s = CORE_R * 3.4; // normalized to height 1; this gives it the old core's visual mass
    this.model.scene.scale.setScalar(s);
    this.model.scene.position.y = -s * 0.5; // feet-at-origin model, recentred on the core
    this.model.scene.rotation.y = Math.PI / 2; // its mouth (+X) onto this group's maw axis (-Z)
    this.group.add(this.model.scene);
    for (const o of [this.core, this.maw, this.mawGlow]) o.visible = false;
    return true;
  }

  buildNodes() {
    const geo = new THREE.OctahedronGeometry(NODE_R, 1);
    const mat = darkMat(0x2a6fff, 1.4);
    this.nodeMat = mat;
    this.nodes = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(Math.cos(a) * NODE_RING, Math.sin(a * 2) * 220, Math.sin(a) * NODE_RING);
      const halo = sprite(0x63a8ff, NODE_R * 5);
      mesh.add(halo);
      this.group.add(mesh);
      this.nodes.push({ mesh, halo, alive: true, world: new THREE.Vector3() });
    }
    this.shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1700, 2), new THREE.MeshBasicMaterial({
      color: 0x4d8cff, transparent: true, opacity: 0.08, side: THREE.BackSide,
      blending: THREE.AdditiveBlending, depthWrite: false, wireframe: true }));
    this.group.add(this.shell);
  }

  buildAura() {
    this.halo = sprite(0xff5a1e, 9000);
    this.beacon = sprite(0xff3a2a, 0.09, false);
    this.group.add(this.halo, this.beacon);
  }

  // Point the maw (-Z) at the planet it is draining.
  face(dir) {
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), tmpV.copy(dir).negate(), new THREE.Vector3(0, 1, 0));
    this.group.quaternion.setFromRotationMatrix(m);
  }

  get position() { return this.group.position; }

  nodeWorld(i) {
    const n = this.nodes[i];
    return n.mesh.getWorldPosition(n.world);
  }

  // Keep `count` nodes standing; the rest wink out (the caller plays the explosion).
  setNodes(count) {
    const killed = [];
    this.nodes.forEach((n, i) => {
      const alive = i < count;
      if (n.alive && !alive) killed.push(this.nodeWorld(i).clone());
      n.alive = alive;
      n.mesh.visible = alive;
    });
    this.shell.visible = count > 0;
    return killed;
  }

  // phase drives the colour temperature: blue-white shielded, orange open, red-hot enraged.
  setPhase(phase) {
    const hot = phase === 'enraged' || phase === 'collapse';
    if (this.modelMat) {
      this.modelMat.emissive.set(hot ? 0xff2e12 : 0xff5a1e);
      this.modelMat.emissiveIntensity = hot ? 1.6 : 0.7;
    }
    this.hull.emissive.set(hot ? 0x7a1206 : 0x4a1409);
    this.hull.emissiveIntensity = hot ? 1.8 : 0.95;
    this.limb.emissive.set(hot ? 0xc42a0a : 0x862c0e);
    this.glowMat.color.set(hot ? 0xff2e12 : 0xff7a2a);
    this.halo.material.color.set(hot ? 0xff2412 : 0xff5a1e);
    this.phase = phase;
  }

  update(dt, camPos, intensity = 1) {
    this.time += dt;
    const t = this.time;
    this.swapIn();
    this.group.rotation.z += dt * 0.008;
    for (const r of this.rings) r.mesh.rotation.z += r.spin * dt;
    const pulse = 0.6 + 0.4 * Math.sin(t * (this.phase === 'enraged' ? 4.5 : 1.6));
    this.glowMat.opacity = (0.45 + 0.5 * pulse) * intensity;
    this.mawGlow.scale.setScalar(0.85 + 0.2 * pulse);
    const d = camPos.distanceTo(this.group.position);
    this.greebles.visible = d < GREEBLE_FADE;
    this.halo.material.opacity = 0.35 + 0.25 * pulse;
    this.beacon.material.opacity = ramp(d, BEACON_FADE[0], BEACON_FADE[1]) * (0.55 + 0.45 * pulse);
    if (this.shell.visible) this.shell.material.opacity = 0.05 + 0.05 * pulse;
    for (const n of this.nodes) if (n.alive) n.halo.material.opacity = 0.5 + 0.35 * Math.sin(t * 3 + n.mesh.position.x);
  }

  dispose() {
    this.group.traverse((o) => {
      o.geometry?.dispose();
      if (o.isSprite) o.material.dispose();
    });
    this.hull.dispose();
    this.limb.dispose();
    this.modelMat?.dispose();
    this.glowMat.dispose();
    this.nodeMat.dispose();
    this.shell.material.dispose();
    this.group.removeFromParent();
  }
}
