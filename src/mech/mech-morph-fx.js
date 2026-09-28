// Energy work for the ship <-> mech transformation: the charge glow that builds around the hull,
// the white burst and expanding shock ring at the swap, a lens glint and the sparks that rain off
// the frame as the locks settle. Pooled objects in one group; nothing allocates per frame.
import * as THREE from 'three';
import { glowTexture } from '../assets/textures.js';
import { shockTexture } from '../fx/fx-textures.js';

const COLUMNS = 6;
const _v = new THREE.Vector3();

function additive(map, color, opacity = 1) {
  return new THREE.SpriteMaterial({ map, color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false });
}

function sprite(parent, mat, out) {
  const s = new THREE.Sprite(mat);
  s.visible = false;
  parent.add(s);
  out.push(s);
  return s;
}

export class MorphFx {
  constructor(parent, color = 0x9fd8ff) {
    this.group = new THREE.Group();
    this.group.frustumCulled = false;
    parent.add(this.group);
    this.owned = [];
    this.glowTex = glowTexture(0xffffff);
    this.shockTex = shockTexture();
    this.mats = {
      core: additive(this.glowTex, 0xffffff),
      ring: additive(this.shockTex, color),
      halo: additive(this.glowTex, color, 0.7),
      column: additive(this.glowTex, color, 0.8),
    };
    this.core = sprite(this.group, this.mats.core, this.owned);
    this.ring = sprite(this.group, this.mats.ring, this.owned);
    this.halo = sprite(this.group, this.mats.halo, this.owned);
    this.columns = [];
    for (let i = 0; i < COLUMNS; i++) this.columns.push(sprite(this.group, this.mats.column, this.owned));
    this.mats.glint = additive(this.glowTex, 0xffffff, 0);
    this.glint = sprite(this.group, this.mats.glint, this.owned);
    this.spin = 0;
  }

  setColor(hex) {
    this.mats.ring.color.set(hex);
    this.mats.halo.color.set(hex);
    this.mats.column.color.set(hex);
  }

  // pos: centre of the frame in this group's parent space. world: the same point in world space,
  // which is where the shared FxSystem wants its one-shots. unit: the frame height in world units.
  update(dt, tr, pos, unit, fx, world = pos) {
    const on = tr.busy || (tr.t > 0.001 && tr.t < 0.999);
    this.group.visible = on;
    if (!on) return;
    this.group.position.copy(pos);
    this.spin += dt * 2.6;
    this.drawCharge(tr.charge, unit);
    this.drawBurst(tr.flash, tr.ring, unit);
    this.drawGlint(tr.flash, unit);
    if (tr.burst) this.bang(world, unit, fx);
    if (tr.settle > 0 && tr.settle < 0.25) fx?.sparks?.(world, 0xbfe4ff, 4, unit * 0.06);
  }

  // Energy columns rising around the hull while the reactor spools up.
  drawCharge(k, unit) {
    const r = unit * 0.5 * (1 - k * 0.55);
    for (let i = 0; i < COLUMNS; i++) {
      const s = this.columns[i];
      s.visible = k > 0.02;
      if (!s.visible) continue;
      const a = this.spin + (i / COLUMNS) * Math.PI * 2;
      s.position.set(Math.cos(a) * r, (i / COLUMNS - 0.5) * unit * 0.7 * (1 - k), Math.sin(a) * r);
      s.scale.set(unit * 0.1 * k, unit * (0.35 + k * 0.7), 1);
      s.material.opacity = 0.75 * k;
    }
    this.halo.visible = k > 0.02;
    this.halo.scale.setScalar(unit * (1.1 + k * 0.5));
    this.halo.material.opacity = 0.16 * k * k;
  }

  drawBurst(flash, ring, unit) {
    this.core.visible = flash > 0.01;
    this.core.scale.setScalar(unit * (1.4 + flash * 3.4));
    this.core.material.opacity = flash;
    this.ring.visible = ring > 0.001 && ring < 1;
    this.ring.scale.setScalar(unit * (0.4 + ring * 7));
    this.ring.material.opacity = (1 - ring) ** 1.6 * 0.95;
  }

  // Anamorphic streak across the burst.
  drawGlint(flash, unit) {
    this.glint.visible = flash > 0.02;
    this.glint.scale.set(unit * 9 * flash, unit * 0.22 * flash, 1);
    this.glint.material.opacity = flash * 0.85;
  }

  // One-shot at the swap: light, sparks and a shove of smoke.
  bang(pos, unit, fx) {
    fx?.flash?.(pos, 0xcfe8ff, unit * 0.9);
    fx?.sparks?.(pos, 0xdff0ff, 26, unit * 0.16);
    fx?.puff?.(pos, 0x9fb4c8, unit * 0.5, 0.9);
  }

  dispose() {
    for (const s of this.owned) s.removeFromParent();
    for (const k in this.mats) this.mats[k].dispose();
    this.group.removeFromParent();
  }
}
