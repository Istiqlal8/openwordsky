// One hittable piece of a space boss (turret, shield generator, armour plate, core...).
// It carries exactly the shape SpaceCombat already expects from a Pirate, so pushing it into
// combat.pirates makes every ship weapon — bolts, rockets, splash, beam, lock-on — work on it
// without a single line changing in src/combat/.
import * as THREE from 'three';

export class BossPart {
  // owner: SpaceBoss, node: THREE.Object3D inside the boss model.
  constructor(owner, node, { id, label, hp, radius, core = false }) {
    this.owner = owner;
    this.node = node;
    this.partId = id;
    this.core = core;
    this.hp = hp;
    this.maxHp = hp;
    this.radius = radius;
    this.kind = { name: label };
    this.pos = node.getWorldPosition(new THREE.Vector3());
    this.group = { position: this.pos }; // hud-feed/minimap read group.position
    this.alive = true;
    this.gone = false;
    this.listed = false; // true while it sits in combat.pirates
    this.flash = 0;
  }

  syncWorld() {
    this.node.getWorldPosition(this.pos);
  }

  // SpaceCombat calls this from every bolt/rocket/beam hit. Returning false keeps the generic
  // pirate death path (loot, 'pirate' act event) out of the way; the boss pays out instead.
  hit(damage) {
    if (!this.alive) return false;
    this.hp -= damage;
    this.flash = 0.18;
    this.owner.tookDamage(this, damage);
    if (this.hp > 0) return false;
    this.hp = 0;
    this.alive = false; // SpaceCombat drops it from the list on its next pass
    this.owner.partDown(this);
    return false;
  }

  update() {}      // the boss drives the whole model in one place
  relocate() {}    // player respawn must not teleport a part out of its hull
  dispose() { this.listed = false; }
}
