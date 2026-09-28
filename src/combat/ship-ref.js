// Accessors for the player ship that work with both the chase-cam and first-person SpaceView.
import * as THREE from 'three';

const muzzleOut = [new THREE.Vector3(), new THREE.Vector3()];
const tmp = new THREE.Vector3();

export function shipObject(space) {
  return space.shipObject ?? space.camera;
}

export function shipForward(space, out) {
  if (space.forward) return out.copy(space.forward);
  return out.set(0, 0, -1).applyQuaternion(shipObject(space).quaternion);
}

// Crosshair direction: always the camera's view axis.
export function aimForward(space, out) {
  return out.set(0, 0, -1).applyQuaternion(space.camera.quaternion);
}

// Gun muzzles in world space; fallback = two points under the first-person camera.
export function muzzles(space) {
  const list = space.muzzleWorldPositions?.();
  if (list?.length) return list;
  const cam = space.camera;
  for (let i = 0; i < 2; i++) {
    tmp.set(i ? 1.1 : -1.1, -0.8, -2).applyQuaternion(cam.quaternion);
    muzzleOut[i].copy(cam.position).add(tmp);
  }
  return muzzleOut;
}

export function setShipVisible(space, visible) {
  if (space.shipObject) space.shipObject.visible = visible;
}
