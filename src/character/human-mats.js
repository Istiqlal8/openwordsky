// Materials for a human figure, one set per avatar (disposed with it).
import * as THREE from 'three';

const HAT_DARK = 0x14161c;

// Head covering: always a shade apart from the shirt, so it reads as its own piece.
function hatColor(casual) {
  if (casual.hat === 'peci') return HAT_DARK;
  if (casual.hat === 'topi') return casual.trousersColor;
  return new THREE.Color(casual.shirtColor).multiplyScalar(0.62);
}

export function humanMats(look) {
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true, ...o });
  const smooth = (o) => new THREE.MeshStandardMaterial({ roughness: 0.3, ...o });
  const mats = {
    skin: std({ color: look.skin }),
    hair: std({ color: look.hair.color, roughness: 0.92 }),
    eye: smooth({ color: 0xf4f1e6 }),
    iris: smooth({ color: look.face.eyeColor }),
    mouth: std({ color: 0x7a3f3f }),
    suit: std({ color: look.suit.color }),
    trim: std({ color: look.suit.trim, emissive: look.suit.trim, emissiveIntensity: 0.3 }),
    dark: std({ color: 0x2a2f38, roughness: 0.85 }),
    visor: new THREE.MeshStandardMaterial({ color: look.suit.visor, metalness: 0.85, roughness: 0.15,
      transparent: true, opacity: look.suit.helmet === 'tertutup' ? 0.94 : 0.55,
      emissive: look.suit.trim, emissiveIntensity: 0.1 }),
    shirt: std({ color: look.casual.shirtColor }),
    jacket: std({ color: new THREE.Color(look.casual.shirtColor).multiplyScalar(0.55) }),
    trousers: std({ color: look.casual.trousersColor }),
    shoes: std({ color: look.casual.shoeColor }),
    hat: std({ color: hatColor(look.casual) }),
  };
  mats.all = Object.values(mats);
  return mats;
}
