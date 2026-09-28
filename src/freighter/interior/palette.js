// Mood per capital-ship archetype: surface patterns and colours, lamp and light tints, sign
// colour and the void colour. The ship's own accent colours the trim; the whale also takes
// its hull tone and bioluminescent glow from the exterior.
import * as THREE from 'three';

const css = (hex) => `#${new THREE.Color(hex).getHexString()}`;
const shade = (hex, k) => css(new THREE.Color(hex).multiplyScalar(k));

// floor/wall: 5 css colours for the pattern (see textures.js).
const BASE = {
  classic: {
    floorKind: 'plate', floor: ['#3a3f47', '#40464f', '#373c44', '#23262c', '#5a616b'],
    wallKind: 'panel', wall: ['#6b7380', '#5b626e', '#2d3138', '#434954', '#9aa3b0'],
    ceil: 0x2a2e35, metal: 0x8b939e, dark: 0x1f2328, fabric: 0x3e5a7a, lamp: 0x8fe8ff, warm: 0xffc47a,
    sky: 0xc8dcff, ground: 0x2a2e36, key: 0xbfe6ff, fill: 0xffd09a, sign: '#bff0ff', screen: '#3fb8ff', bg: 0x02040a,
  },
  hammerhead: {
    floorKind: 'plate', floor: ['#30393f', '#37424a', '#2e373e', '#1c2226', '#c9a23a'],
    wallKind: 'panel', wall: ['#4f6272', '#43535f', '#232c33', '#35434e', '#e0b84a'],
    ceil: 0x222a30, metal: 0x7d8c99, dark: 0x1a2025, fabric: 0x5a4a2a, lamp: 0xfff0b8, warm: 0xffd070,
    sky: 0xfff0d8, ground: 0x2a2a26, key: 0xfff2d0, fill: 0xffc060, sign: '#ffe27a', screen: '#ffcf4a', bg: 0x03040a,
  },
  catamaran: {
    floorKind: 'plate', floor: ['#2e4446', '#35504f', '#2b403f', '#172524', '#7fd8c8'],
    wallKind: 'panel', wall: ['#7c9496', '#6a8284', '#2a3a3b', '#4a5e60', '#aef4e8'],
    ceil: 0x223032, metal: 0x93a9aa, dark: 0x182224, fabric: 0x2f6a66, lamp: 0x9ffff0, warm: 0xffb07a,
    sky: 0xcffff4, ground: 0x223030, key: 0xb0fff0, fill: 0xffb884, sign: '#9ffff0', screen: '#40f0d0', bg: 0x020608,
  },
  ring: {
    floorKind: 'tile', floor: ['#b9c0c4', '#c4cbcf', '#aeb6ba', '#8d969b', '#e8eef0'],
    wallKind: 'tile', wall: ['#e2e7ea', '#d8dee2', '#cfd6da', '#aab4b9', '#ffffff'],
    ceil: 0xdfe5e8, metal: 0xc0c8cc, dark: 0x4c585e, fabric: 0x3f8a5a, lamp: 0xf2fff6, warm: 0xfff0c8,
    sky: 0xf4fff8, ground: 0x6a7a70, key: 0xfff8ec, fill: 0xd8ffe0, sign: '#5fe89a', screen: '#4fe890', bg: 0x02050a,
  },
  citadel: {
    floorKind: 'stone', floor: ['#6b5a48', '#5f5040', '#74624e', '#3a3027', '#8a7560'],
    wallKind: 'stone', wall: ['#8a7560', '#7d6a56', '#94806a', '#4a3e33', '#b09a80'],
    ceil: 0x3a3027, metal: 0xb08a4a, dark: 0x2a221c, fabric: 0x7a2a2a, lamp: 0xffb060, warm: 0xffa040,
    sky: 0xffd8a8, ground: 0x3a2a1c, key: 0xffc890, fill: 0xff9a50, sign: '#ffd28a', screen: '#ffb050', bg: 0x05030a,
  },
  saucer: {
    floorKind: 'tile', floor: ['#c9d0d8', '#d2d9e0', '#bfc7d0', '#9aa4ae', '#f0f6ff'],
    wallKind: 'tile', wall: ['#e8ecf2', '#dde3ea', '#d3dae3', '#b4bec9', '#ffffff'],
    ceil: 0xe4e9f0, metal: 0xc8d2dc, dark: 0x3a4250, fabric: 0x3a6aa0, lamp: 0xbfe8ff, warm: 0xd8f0ff,
    sky: 0xe8f4ff, ground: 0x5a6878, key: 0xcfeaff, fill: 0x9fdcff, sign: '#7fdfff', screen: '#58c8ff', bg: 0x01030a,
  },
  whale: {
    floorKind: 'organic', floor: ['#2a2230', '#3a2a3e', '#24303a', '#402838', '#7affd8'],
    wallKind: 'organic', wall: ['#3a2a40', '#4a3350', '#2e3a48', '#553a5a', '#7affd8'],
    ceil: 0x221a28, metal: 0x6a5a78, dark: 0x1a1420, fabric: 0x5a2a4a, lamp: 0x7affd8, warm: 0xd8a0ff,
    sky: 0x6a5a88, ground: 0x1a1020, key: 0x7affd8, fill: 0xd8a0ff, sign: '#7affd8', screen: '#7affd8', bg: 0x030108,
  },
  cruiser: {
    floorKind: 'grate', floor: ['#2a2d31', '#b83a2a', '#26292c', '#1a1c1f', '#d9a02a'],
    wallKind: 'panel', wall: ['#3b4046', '#33373c', '#1c1f22', '#2a2e33', '#c0392b'],
    ceil: 0x1c1f22, metal: 0x5f666e, dark: 0x16181b, fabric: 0x3a4030, lamp: 0xff3a28, warm: 0xffe0c0,
    sky: 0xffb0a0, ground: 0x200808, key: 0xff4030, fill: 0xfff0e0, sign: '#ff6a50', screen: '#ff5040', bg: 0x050102,
  },
};

// style = { archetype, accent, hull, glow } (see interior/style.js). Returns a fresh palette.
export function paletteOf(style = {}) {
  const pal = { ...(BASE[style.archetype] ?? BASE.classic), id: BASE[style.archetype] ? style.archetype : 'classic' };
  pal.accent = style.accent ?? 0x3d7fc0;
  if (pal.id === 'whale') tintWhale(pal, style);
  return pal;
}

// The living ship borrows its hull tone for the tissue and its glow for veins and lamps.
function tintWhale(pal, { hull = 0x4f7f7a, glow = 0x7affd8 }) {
  const g = css(glow);
  pal.floor = [shade(hull, 0.22), shade(hull, 0.3), shade(hull, 0.18), shade(hull, 0.35), g];
  pal.wall = [shade(hull, 0.32), shade(hull, 0.42), shade(hull, 0.26), shade(hull, 0.5), g];
  pal.ceil = new THREE.Color(hull).multiplyScalar(0.2).getHex();
  Object.assign(pal, { lamp: glow, key: glow, sign: g, screen: g });
}
