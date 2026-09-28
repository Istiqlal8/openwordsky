// Procedural explorer suit for the third-person view (faces -Z like the camera).
import * as THREE from 'three';

function part(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

function limb(mat, x, y, len, thick) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  pivot.add(part(new THREE.CapsuleGeometry(thick, len, 3, 8), mat, 0, -len / 2 - thick * 0.5, 0));
  return pivot;
}

function materials(accent) {
  return {
    suit: new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.7, flatShading: true }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.8, flatShading: true }),
    skin: new THREE.MeshStandardMaterial({ color: 0xc98d62, roughness: 0.8, flatShading: true }),
    hair: new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.9, flatShading: true }),
    accent: new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.35, flatShading: true }),
    visor: new THREE.MeshStandardMaterial({ color: 0x1a2a44, metalness: 0.9, roughness: 0.15, emissive: 0xffa040, emissiveIntensity: 0.12 }),
  };
}

export class Astronaut {
  constructor(accent = 0xffa040) {
    this.mats = materials(accent);
    const m = this.mats;
    this.group = new THREE.Group();
    this.group.add(part(new THREE.CapsuleGeometry(0.28, 0.45, 4, 10), m.suit, 0, 1.05, 0));
    this.pack = part(new THREE.BoxGeometry(0.46, 0.55, 0.22), m.dark, 0, 1.1, 0.26);
    this.group.add(this.pack);
    this.group.add(part(new THREE.BoxGeometry(0.1, 0.1, 0.05), m.accent, 0.12, 1.25, -0.27));
    const head = part(new THREE.SphereGeometry(0.24, 16, 12), m.suit, 0, 1.58, 0);
    this.head = head;
    this.visor = part(new THREE.SphereGeometry(0.19, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).rotateX(-Math.PI / 2), m.visor, 0, 0.02, -0.09);
    head.add(this.visor);
    this.hair = part(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), m.hair, 0, 0.02, 0.02);
    this.hair.visible = false;
    head.add(this.hair);
    this.group.add(head);
    this.legs = [limb(m.suit, -0.13, 0.72, 0.42, 0.11), limb(m.suit, 0.13, 0.72, 0.42, 0.11)];
    this.arms = [limb(m.suit, -0.36, 1.32, 0.38, 0.08), limb(m.suit, 0.36, 1.32, 0.38, 0.08)];
    this.group.add(...this.legs, ...this.arms);
    this.t = 0;
  }

  // Breathable worlds: casual clothes, bare head, no life-support pack.
  setCasual(on) {
    this.pack.visible = !on;
    this.visor.visible = !on;
    this.hair.visible = on;
    this.head.material = on ? this.mats.skin : this.mats.suit;
    this.head.scale.setScalar(on ? 0.82 : 1);
    this.mats.suit.color.setHex(on ? 0x3f6fa8 : 0xe9e4d8); // shirt/trousers vs suit
  }

  // Place at the feet, facing yaw; swing limbs while walking.
  update(dt, feet, yaw, speed, onGround) {
    this.group.position.copy(feet);
    this.group.rotation.y = yaw;
    this.t += dt * speed * 1.2;
    const swing = onGround ? Math.sin(this.t) * Math.min(1, speed / 7) * 0.7 : 0.35;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.arms[0].rotation.x = -swing * 0.8;
    this.arms[1].rotation.x = swing * 0.8;
  }

  dispose() {
    this.group.removeFromParent();
    this.group.traverse((o) => o.geometry?.dispose());
    Object.values(this.mats).forEach((mat) => mat.dispose());
  }
}
