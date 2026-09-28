// An NPC explorer walking around its landed ship: wander, scan, greet the player, go home.
import * as THREE from 'three';
import { Astronaut } from '../view/astronaut.js';
import { isWet, walkTarget } from './terrain-spots.js';
import { Vitals } from '../life-sim/vitals.js';

const WALK = 2.2, HURRY = 3.4;
const FRIEND_RANGE = 40, WAVE_RANGE = 8, STOP_RANGE = 4.5;
const SCAN_TIME = 3;

function scanCone() {
  const geo = new THREE.ConeGeometry(0.9, 3.2, 18, 1, true).translate(0, -1.6, 0).rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0x5ff4ff, transparent: true, opacity: 0, depthWrite: false,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const cone = new THREE.Mesh(geo, mat);
  cone.position.set(0.36, 1.2, -0.45);
  cone.rotation.x = -0.35; // aim at the ground ahead
  cone.visible = false;
  return cone;
}

export class Explorer {
  // info: { seed, name, accent, ship: SurfaceShip, door: {x, z}, friendly, stay }
  constructor(scene, info) {
    Object.assign(this, info);
    this.suit = new Astronaut(info.accent);
    this.suit.mats?.suit?.color.lerp(new THREE.Color(info.accent), 0.3); // tell NPCs apart from the player (old Astronaut only)
    this.cone = scanCone();
    this.suit.group.add(this.cone);
    this.suit.group.visible = false;
    scene.add(this.suit.group);
    this.feet = new THREE.Vector3(info.door.x, 0, info.door.z);
    this.goal = new THREE.Vector3();
    Object.assign(this, { yaw: 0, speed: 0, state: 'inside', timer: 0, t: 0, greetCd: 0, playerDist: Infinity });
    this.vitals = new Vitals(this, { armed: true, faction: 'explorer', color: info.accent, damage: 10, rate: 0.6 });
  }

  get position() { return this.feet; }
  get outside() { return this.suit.group.visible; }

  // Step out of the ship's door and start wandering.
  exit(h) {
    this.feet.set(this.door.x, h(this.door.x, this.door.z), this.door.z);
    this.suit.group.visible = true;
    this.setState('idle', 1 + Math.random() * 2);
  }

  setState(state, timer = 0) {
    this.state = state;
    this.timer = timer;
    this.cone.visible = state === 'scan';
  }

  update(dt, h, planet, player) {
    this.vitals.active = false;
    if (this.state === 'inside') return;
    this.t += dt;
    this.timer -= dt;
    this.stay -= dt;
    this.greetCd -= dt;
    this.playerDist = Math.hypot(player.x - this.feet.x, player.z - this.feet.z);
    this.vitals.active = this.playerDist < 170 && !this.vitals.hidden;
    const alarm = this.vitals.update(dt);
    this.speed = 0;
    if (alarm) this.defend(alarm, dt, h, planet);
    else { this.shelterEnd(h); this.react(player); this.act(dt, h, planet, player); }
    this.feet.y = h(this.feet.x, this.feet.z);
    this.suit.update(dt, this.feet, this.yaw, this.speed, true);
    this.pose(alarm);
  }

  // Attacked by an animal: shoot back, or run into the ship when badly hurt.
  defend(mode, dt, h, planet) {
    this.cone.visible = false;
    const t = this.vitals.target?.ref?.root?.position;
    if (mode === 'fight' && t) {
      this.turnTo(dt * 1.5, t.x, t.z);
      if (Math.hypot(t.x - this.feet.x, t.z - this.feet.z) < 2.5) this.walk(dt, h, planet, 2 * this.feet.x - t.x, 2 * this.feet.z - t.z, 2, 0.1);
      this.vitals.shoot(1.3);
    }
    if (mode !== 'flee' || this.vitals.hidden) return;
    if (this.walk(dt, h, planet, this.door.x, this.door.z, HURRY + 1, 0.8)) {
      this.vitals.hidden = true;
      this.vitals.modeT = Math.max(this.vitals.modeT, 10);
      this.suit.group.visible = false;
    }
  }

  // Danger over: step back out of the ship.
  shelterEnd(h) {
    if (this.suit.group.visible || this.state === 'inside') return;
    this.exit(h);
  }

  // Player proximity overrides: wave when close, walk over when friendly and near.
  react(player) {
    const busy = this.state === 'return';
    if (busy) return;
    if (this.playerDist < WAVE_RANGE && this.state !== 'greet') return this.setState('greet', 3);
    if (this.state === 'greet' && this.playerDist > WAVE_RANGE + 2) return this.setState('idle', 1);
    const idle = this.state === 'idle' || this.state === 'wander';
    if (idle && this.friendly && this.greetCd <= 0 && this.playerDist < FRIEND_RANGE) {
      this.greetCd = 30 + Math.random() * 30;
      if (Math.random() < 0.6) this.setState('approach', 20);
    }
  }

  act(dt, h, planet, player) {
    const s = this.state;
    if (s === 'greet') return this.turnTo(dt, player.x, player.z);
    if (s === 'approach') return this.doApproach(dt, h, planet, player);
    if (s === 'return') return this.doReturn(dt, h, planet);
    if (s === 'wander' && !this.walk(dt, h, planet, this.goal.x, this.goal.z, WALK, 0.6)) return;
    if (s === 'scan' && this.timer > 0) return;
    if (s === 'idle' && this.timer > 0) return;
    this.decide(h, planet);
  }

  decide(h, planet) {
    if (this.stay <= 0) return this.setState('return');
    const r = Math.random();
    if (r < 0.35) return this.setState('scan', SCAN_TIME);
    if (r < 0.5) return this.setState('idle', 1.5 + Math.random() * 3);
    const c = this.ship.position;
    if (walkTarget(h, planet, c.x, c.z, 6, 28, this.goal)) this.setState('wander', 25);
    else this.setState('idle', 2);
  }

  doApproach(dt, h, planet, player) {
    if (this.timer <= 0 || this.playerDist > FRIEND_RANGE + 5) return this.setState('idle', 2);
    if (this.playerDist < STOP_RANGE) return this.turnTo(dt, player.x, player.z);
    this.walk(dt, h, planet, player.x, player.z, HURRY, STOP_RANGE);
  }

  doReturn(dt, h, planet) {
    if (this.walk(dt, h, planet, this.door.x, this.door.z, HURRY, 0.8) || this.timer < -40) {
      this.suit.group.visible = false;
      this.setState('inside');
      this.boarded = true;
    }
  }

  // Walk toward (x, z); returns true on arrival or when blocked by water.
  walk(dt, h, planet, x, z, speed, stopAt) {
    const dx = x - this.feet.x, dz = z - this.feet.z;
    const d = Math.hypot(dx, dz);
    if (d <= stopAt) return true;
    this.turnTo(dt, x, z);
    const step = Math.min(d - stopAt, speed * dt);
    const nx = this.feet.x + (dx / d) * step, nz = this.feet.z + (dz / d) * step;
    if (isWet(h, planet, nx, nz)) return true;
    this.feet.x = nx;
    this.feet.z = nz;
    this.speed = speed;
    return false;
  }

  turnTo(dt, x, z) {
    const want = Math.atan2(-(x - this.feet.x), -(z - this.feet.z));
    const diff = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw));
    this.yaw += diff * (1 - Math.exp(-6 * dt));
  }

  // Arm poses on top of the walk cycle: wave, or hold the scanner out with a pulsing beam.
  pose(alarm) {
    const arm = this.suit.arms[1], g = this.suit.group;
    arm.rotation.z = 0;
    g.rotation.x = alarm === 'down' ? -1.45 : alarm === 'up' ? -0.5 : 0;
    g.position.y += alarm === 'down' ? 0.25 : 0;
    if (alarm === 'fight') { arm.rotation.x = 1.55; this.suit.arms[0].rotation.x = 1.3; return; }
    if (alarm === 'cheer') { arm.rotation.z = 2.7 + Math.sin(this.t * 9) * 0.3; return; }
    if (this.state === 'greet' && this.timer > 0) arm.rotation.z = 2.7 + Math.sin(this.t * 9) * 0.4;
    if (this.state !== 'scan') return;
    arm.rotation.x = 1.25;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 14);
    this.cone.material.opacity = 0.12 + 0.2 * pulse;
    this.cone.scale.setScalar(0.85 + 0.25 * (1 - this.timer / SCAN_TIME));
  }

  dispose() {
    this.vitals.dispose();
    this.cone.geometry.dispose();
    this.cone.material.dispose();
    this.suit.dispose();
  }
}
