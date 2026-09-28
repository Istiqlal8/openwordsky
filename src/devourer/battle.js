// Battle: the devourer, the swarm and the capital line inside the live space scene, plus the
// planet being drained. Player damage reaches the entity by registering duck-typed hitboxes in
// SpaceCombat's `pirates` list, so lasers, rockets, lock-on and hostile markers all just work.
import * as THREE from 'three';
import { DevourerEntity, CORE_R, NODE_R } from './entity.js';
import { Swarm } from './swarm.js';
import { Capitals } from './capitals.js';
import { Bursts } from './bursts.js';
import { chatter } from './chatter.js';

const STANDOFF = 1900;         // entity sits this far out from the planet's surface
const SWEEP_GAP = 7;
const SWEEP_RANGE = 9000;
const SWEEP_DMG = 16;
const SHIELD_SOAK = 0.12;      // fraction of player damage that gets through the shield phase
const NODE_HP = 2600;
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

function box(name, pos, radius, onHit) {
  return { kind: { name }, alive: true, gone: false, radius, pos, group: { position: pos },
    hit: onHit, update() {}, dispose() {}, relocate() {} };
}

export class Battle {
  constructor({ space, combat, player, sfx, hud, state, body, ev }) {
    Object.assign(this, { space, combat, player, sfx, hud, state, body, ev });
    this.root = new THREE.Group();
    this.root.name = 'devourer-battle';
    space.scene.add(this.root);
    this.offset = new THREE.Vector3(0.62, 0.32, 0.72).normalize().multiplyScalar(body.radius + STANDOFF);
    this.entity = new DevourerEntity(ev.seed, tmpA.copy(this.offset).normalize().negate());
    this.root.add(this.entity.group);
    this.entity.position.copy(body.pos).add(this.offset);
    this.bursts = new Bursts(this.root);
    this.swarm = new Swarm(this.root, ev.seed, globalThis.__devourerShips ?? 150, this.entity.position);
    this.capitals = new Capitals(this.root, ev.seed, this.entity.position, 5);
    this.capitals.onDeath = (name) => this.capitalLost(name);
    this.buildDrain();
    this.ctx = { center: this.entity.position, targets: [], camPos: space.camera.position, dt: 0,
      launchPoints: this.capitals.launchPoints };
    Object.assign(this, { sweep: SWEEP_GAP, talk: 8, phase: '', nodes: 6, nodeHp: NODE_HP, boxes: [] });
    this.addBoxes();
  }

  // The drain beam plus the blight/crack shells that grow on the planet as it is eaten.
  buildDrain() {
    const geo = new THREE.CylinderGeometry(CORE_R * 0.55, this.body.radius * 0.7, 1, 14, 1, true);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, 0.5);
    this.beam = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true,
      opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    this.beam.frustumCulled = false;
    this.root.add(this.beam);
    const r = this.body.radius;
    this.blight = new THREE.Mesh(new THREE.SphereGeometry(r * 1.02, 32, 20), new THREE.MeshBasicMaterial({
      color: 0x14100e, transparent: true, opacity: 0 }));
    this.cracks = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 1.05, 2), new THREE.MeshBasicMaterial({
      color: 0xff5a18, transparent: true, opacity: 0, wireframe: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.body.group.add(this.blight, this.cracks);
  }

  // Hitboxes handed to SpaceCombat. The core soaks damage until the six nodes are gone.
  addBoxes() {
    const core = box('Pemakan Planet', this.entity.position, CORE_R * 0.92, (dmg) => this.hitCore(dmg));
    this.boxes = [core];
    this.combat.pirates.push(core);
    for (let i = 0; i < 6; i++) {
      const pos = this.entity.nodeWorld(i).clone();
      const b = box(`Simpul Perisai ${i + 1}`, pos, NODE_R * 1.6, (dmg) => this.hitNode(i, dmg));
      b.nodeIndex = i;
      this.boxes.push(b);
      this.combat.pirates.push(b);
    }
  }

  hitCore(dmg) {
    const shielded = this.state.phase() === 'shield';
    const dealt = this.state.addPlayerDamage(dmg * (shielded ? SHIELD_SOAK : 1));
    if (dealt > 0) this.joined();
    if (shielded) this.bursts.flare(this.entity.position, 0x63a8ff, 260, 0.35);
    return false;
  }

  hitNode(i, dmg) {
    if (this.state.phase() !== 'shield') return false;
    this.nodeHp -= dmg;
    this.state.addPlayerDamage(dmg * 0.9);
    this.joined();
    if (this.nodeHp > 0) return false;
    this.nodeHp = NODE_HP;
    return false; // the node count follows the shared progress; see syncNodes()
  }

  joined() {
    if (this.ev.joined) return;
    this.ev.joined = true;
    this.player.emit('act', { type: 'devourer', stage: 'join', planet: this.ev.planetName });
    this.hud.toast('Kamu bergabung dalam pertempuran — kerusakanmu dihitung');
  }

  update(dt, now) {
    const st = this.state;
    this.entity.position.copy(this.body.pos).add(this.offset);
    this.syncNodes(now);
    this.setPhase(st.phase(now));
    this.entity.update(dt, this.space.camera.position, 1);
    this.drain(st.progress(now) * this.healFactor(dt));
    this.runFleet(dt, now);
    this.hazards(dt, now);
    this.bursts.update(dt);
  }

  // Node count is derived from the shared progress, so every client agrees on it.
  syncNodes(now) {
    const want = this.state.nodesLeft(now);
    if (want === this.nodes) return;
    for (const at of this.entity.setNodes(want)) {
      this.bursts.blast(at, 0x9fd0ff, 120);
      this.sfx.explosion?.(0.6);
    }
    if (want < this.nodes) this.hud.toast(`Simpul perisai jatuh — sisa ${want}`);
    this.nodes = want;
    for (const b of this.boxes) if (b.nodeIndex !== undefined) b.alive = b.nodeIndex < want;
  }

  setPhase(phase) {
    if (phase === this.phase) return;
    this.phase = phase;
    this.entity.setPhase(phase);
    if (phase === 'open') this.hud.toast('PERISAI RUNTUH — semua kapal, tembak intinya!');
    if (phase === 'enraged') this.hud.toast('PEMAKAN PLANET MENGAMUK — sinarnya menyapu armada!');
  }

  drain(progress) {
    const shrink = 1 - progress * 0.45;
    this.body.body.scale.setScalar(shrink);
    this.body.radius = this.body.planet.radius * shrink;
    this.blight.material.opacity = progress * 0.72;
    this.cracks.material.opacity = 0.15 + Math.sin(this.entity.time * 2) * 0.05 + progress * 0.35;
    tmpA.copy(this.body.pos).sub(this.entity.position);
    const len = tmpA.length();
    this.beam.position.copy(this.entity.position);
    this.beam.lookAt(this.body.pos);
    this.beam.scale.set(1, 1, len);
    this.beam.material.opacity = 0.12 + 0.16 * (0.5 + 0.5 * Math.sin(this.entity.time * 3));
  }

  runFleet(dt, now) {
    const ctx = this.ctx;
    ctx.dt = dt;
    ctx.targets.length = 0;
    for (let i = 0; i < this.nodes; i++) ctx.targets.push(this.entity.nodeWorld(i));
    if (!this.nodes) ctx.targets.push(this.entity.position);
    this.swarm.update(ctx);
    const hazard = this.phase === 'enraged' ? 1 : this.phase === 'open' ? 0.45 : 0.18;
    this.capitals.update(dt, this.entity.time, this.entity.position, hazard, this.bursts);
    for (const b of this.boxes) if (b.nodeIndex !== undefined && b.alive) b.pos.copy(this.entity.nodeWorld(b.nodeIndex));
    this.talk -= dt;
    if (this.talk > 0) return;
    this.talk = 12 + Math.random() * 10;
    this.hud.toast(chatter(this.phase, this.state.left(now), this.capitals.alive));
  }

  // The sweeping beam: chews the swarm and hurts the player's ship when it is close.
  hazards(dt) {
    this.sweep -= dt;
    if (this.sweep > 0) return;
    this.sweep = SWEEP_GAP * (this.phase === 'enraged' ? 0.6 : 1.6);
    const at = this.entity.position;
    this.swarm.cull(this.phase === 'enraged' ? 6 : 2, at, 6000, this.bursts);
    if (this.phase !== 'enraged' && this.phase !== 'open') return;
    const ship = this.space.shipObject.position;
    const d = ship.distanceTo(at);
    if (d > SWEEP_RANGE || this.player.dead) return;
    this.bursts.flare(tmpB.lerpVectors(at, ship, 0.5), 0xff3a1a, 400, 0.5);
    this.player.damageShip(SWEEP_DMG * (this.phase === 'enraged' ? 1 : 0.5));
    this.space.shake?.(0.5);
    this.sfx.hit?.();
  }

  capitalLost(name) {
    this.hud.toast(`${name} hancur — armada kehilangan kapal induk`);
    this.sfx.explosion?.(1);
    this.space.shake?.(0.4);
  }

  // After the kill the planet visibly recovers instead of snapping back on cleanup.
  healFactor(dt) {
    if (this.heal === undefined) return 1;
    this.heal = Math.max(0, this.heal - dt * 0.18);
    return this.heal;
  }

  // Victory: the entity tears itself apart. Called once, then the addon disposes the battle.
  playDeath() {
    const at = this.entity.position;
    for (let i = 0; i < 14; i++) {
      tmpA.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
        .multiplyScalar(Math.random() * 1800).add(at);
      this.bursts.blast(tmpA, i % 2 ? 0xfff0b0 : 0xff5a20, 200 + Math.random() * 260);
    }
    this.bursts.blast(at, 0xffffff, 1200);
    this.sfx.explosion?.(1);
    this.space.shake?.(2.5);
    this.beam.visible = false;
    this.entity.group.visible = false;
    this.heal = 1;
  }

  dispose() {
    for (const b of this.boxes) { b.alive = false; b.gone = true; }
    const list = this.combat.pirates;
    for (const b of this.boxes) { const i = list.indexOf(b); if (i >= 0) list.splice(i, 1); }
    this.body.body.scale.setScalar(1);
    this.body.radius = this.body.planet.radius;
    for (const m of [this.blight, this.cracks]) { m.removeFromParent(); m.geometry.dispose(); m.material.dispose(); }
    this.beam.geometry.dispose();
    this.beam.material.dispose();
    this.swarm.dispose();
    this.capitals.dispose();
    this.bursts.dispose();
    this.entity.dispose();
    this.root.removeFromParent();
  }
}
