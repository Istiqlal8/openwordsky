// The mech while flying inside a star system. It rides the ship's own flight rig (so the chase
// camera, collisions and the star system all keep working) but flies like a mecha: hovers,
// strafes, stops dead, turns hard and tops out well below the ship.
import { MechPose } from './mech-pose.js';
import { Transform } from './mech-transform.js';
import { MechSpaceGuns } from './mech-space-guns.js';
import { transformSfx } from './mech-sfx.js';

const SHIP_SCALE = 0.14;        // src/view/ship/ship-rig.js: model metres -> space units
const FRAME = 1.12;             // mech height relative to the ship's length on screen
const CRUISE = 46, BOOST = 190; // u/s, against the ship's 60 / 320
const STOP = 3.4;               // velocity damping when nothing is pressed (stop dead)
const FOV_KICK = 13;
const BODY_YAW = 0.45;          // hips bladed to the camera; the torso twists back onto the aim line
const MOVE_KEYS = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyR', 'KeyC'];

export class MechSpace {
  constructor({ space, player, sfx }) {
    Object.assign(this, { space, player, sfx });
    this.mech = null;
    this.pose = null;
    this.guns = null;
    this.tr = new Transform();
    this.active = false;
  }

  get busy() { return this.tr.busy; }
  get weapon() { return this.guns?.weapon ?? '—'; }
  get weaponHud() { return this.guns?.hud() ?? null; }

  // Starts the unfolding sequence; the mech is live from the first frame.
  enter(mech, combat) {
    this.mech = mech;
    this.pose = new MechPose(mech);
    this.guns = new MechSpaceGuns(this.space, this.player, this.sfx, mech);
    this.guns.attach(combat);
    const rig = this.space.rig;
    this.shipScale = rig.model?.group.scale.x ?? 1; // the rig scales the model; restore it exactly
    this.wasCockpit = rig.mode === 'cockpit';
    if (this.wasCockpit) rig.toggleMode();
    this.scale = (SHIP_SCALE * (this.space.design?.parts?.length ?? 8) * FRAME) / mech.design.d.H;
    mech.group.scale.setScalar(this.scale);
    mech.setWorldScale(this.scale);
    // Off to the left and below the crosshair: the camera then sees the mech three-quarter from
    // behind, so the arm that holds the weapon reads instead of hiding behind the torso.
    const h = mech.design.d.H * this.scale;
    mech.group.position.set(-h * 0.46, -h * 0.74, -0.1);
    mech.group.rotation.set(0, BODY_YAW, 0);
    rig.ship.add(mech.group);
    this.baseFov = rig.baseFov;
    this.active = true;
    this.tr.t = 0;
    this.tr.start(1);
    transformSfx(this.sfx, true);
  }

  leave() {
    this.tr.start(-1);
    transformSfx(this.sfx, false);
  }

  // Called once the fold-back finishes (or on death / mode change).
  detach() {
    const rig = this.space.rig;
    this.mech?.group.removeFromParent();
    if (this.wasCockpit && rig.mode === 'chase') rig.toggleMode();
    if (rig.model) rig.model.group.visible = rig.mode === 'chase';
    if (rig.model) rig.model.group.scale.setScalar(this.shipScale ?? 1);
    if (rig.model) rig.model.group.rotation.x = 0;
    rig.baseFov = this.baseFov ?? rig.baseFov;
    this.pose?.dispose();
    this.pose = null;
    this.guns?.dispose();
    this.guns = null;
    this.mech = null;
    this.active = false;
    this.tr.finish(false);
  }

  update(dt, input, combat) {
    if (!this.active) return;
    this.guns.attach(combat);
    const rig = this.space.rig, tr = this.tr;
    tr.update(dt);
    this.applyTransform(rig);
    if (tr.t <= 0 && !tr.busy) { this.detach(); return; }
    if (tr.t < 1) return;
    this.flight(dt, input);
    const thrust = MOVE_KEYS.some((k) => input.down(k)) ? 1 : 0;
    this.pose.fly(dt, thrust);
    this.pose.weapons(dt, this.guns.ctlFor(0, 0, BODY_YAW)); // pose first: the muzzle FX must match this frame
    this.guns.update(dt, input, this.pose);
    this.mech.setThrust(Math.min(1, thrust * 0.5 + this.space.speed / BOOST));
  }

  // Ship model shrinks away, mech unfolds, camera pulls back a touch.
  applyTransform(rig) {
    const tr = this.tr;
    if (rig.model) {
      rig.model.group.visible = tr.shipVisible && rig.mode === 'chase';
      rig.model.group.scale.setScalar(Math.max(0.001, tr.shipScale) * (this.shipScale ?? 1));
      rig.model.group.rotation.x = (1 - tr.shipScale) * -1.2;
    }
    this.mech.group.visible = tr.mechVisible;
    this.mech.setDeploy(tr.deploy);
    rig.baseFov = this.baseFov + tr.kick * FOV_KICK + (this.guns?.fovPulse ?? 0);
  }

  // Mecha flight: hard speed cap, and letting go of the sticks brings it to a full stop.
  flight(dt, input) {
    const v = this.space.velocity;
    const cap = input.down('ShiftLeft') ? BOOST : CRUISE;
    const len = v.length();
    if (len > cap) v.setLength(cap + (len - cap) * Math.exp(-5 * dt));
    if (!MOVE_KEYS.some((k) => input.down(k)) && !this.space.pulsing) v.multiplyScalar(Math.exp(-STOP * dt));
  }
}

export const MECH_SPACE_CAP = { CRUISE, BOOST };
