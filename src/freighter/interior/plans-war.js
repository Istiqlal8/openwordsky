// Organic and military layouts. Whale: a ribbed living vault with bioluminescent veins and egg
// pods; a gullet tunnel leads to round chambers and an eye-windowed bridge. Cruiser: a launch
// deck with catapult rails under red light, a bulkheaded spine to the armory, barracks,
// workshop and the command bridge.
import { rect, disc, gap, arcGap, roomWalls } from './plan-kit.js';
import { decorateWhale, decorateCruiser } from './decor-war.js';

const Q = Math.PI / 2, PI = Math.PI;

export function whalePlan(S) {
  const bay = rect(-24, 24, -14, 14, { h: 9, ceil: false }), gullet = rect(-2, 2, 14, 44, { h: 3.4, ceil: false });
  const nest = disc(-12, 27, 7, { h: 4.5, ceil: false }), shop = disc(12, 27, 7, { h: 4.5, ceil: false });
  const bridge = disc(0, 54, 10, { h: 6, ceil: false });
  const door = { x0: -14, x1: 14, h: 9, z: -14, back: 12 };
  return {
    floors: [bay, gullet, nest, shop, bridge, rect(-5.2, -2, 25, 29, { h: 3 }), rect(2, 5.2, 25, 29, { h: 3 })],
    walk: [rect(-22, 22, -14, 14, { h: 9 }), gullet, nest, shop, bridge, rect(-2, 2, 12, 16, { h: 3 }),
      rect(-6, -1.5, 25, 29, { h: 3 }), rect(1.5, 6, 25, 29, { h: 3 }), rect(-2, 2, 42, 46, { h: 3 })],
    walls: [
      ['x', -14, -24, 24, 14, [[door.x0, door.x1, 0, door.h]]], ['x', 14, -24, 24, 14, [gap(0, 4, 0, 2.6)]],
      ['z', -2, 14, 44.2, 2.6, [[25, 29, 0, 2.6]]], ['z', 2, 14, 44.2, 2.6, [[25, 29, 0, 2.6]]],
      ['x', 25, -5.3, -2, 3], ['x', 29, -5.3, -2, 3], ['x', 25, 2, 5.3, 3], ['x', 29, 2, 5.3, 3],
    ],
    arcs: [
      { cx: -12, cz: 27, r: 7, h: 4.5, gaps: [arcGap(Q, 4, 7)] }, { cx: 12, cz: 27, r: 7, h: 4.5, gaps: [arcGap(3 * Q, 4, 7)] },
      { cx: 0, cz: 54, r: 10, h: 6, gaps: [arcGap(PI, 4, 10), [-0.7, 0.7, 1.5, 5.5]] },
    ],
    domes: [{ cx: -12, cz: 27, r: 7, y: 4.5, k: 0.5 }, { cx: 12, cz: 27, r: 7, y: 4.5, k: 0.5 }, { cx: 0, cz: 54, r: 10, y: 6, k: 0.45 }],
    vaults: [{ cx: 0, cz: 0, r: 24, len: 28, k: 0.55 }, { cx: 0, cz: 29.1, r: 2, len: 30.2, y: 2.6, k: 0.6 }],
    door, doors: [door],
    pads: { player: { x: 0, z: -3, r: 6.5 }, npc: [{ x: -13, z: 1, r: 5, rot: 0.4 }, { x: 13, z: 1, r: 5, rot: -0.4 }] },
    stations: {
      hangar: { x: -17.5, z: 9, rotY: Q }, shipyard: { x: 17.2, z: 24.9, rotY: -Q }, store: { x: 17.2, z: 29.1, rotY: -Q },
      rest: { x: -12, z: 31.5, rotY: PI }, map: { x: 0, z: 52 },
    },
    signs: [
      [S.name.toUpperCase(), 0, 10.2, -13.6, 0, 10], ['SARANG', -4.5, 2.6, 24.9, 0, 1.8], ['BENGKEL', 4.5, 2.6, 24.9, 0, 1.8],
      ['MATA', 0, 2.5, 43.9, 0, 1.6], ['PERDAGANGAN', 18.9, 2.7, 29.1, -Q, 2.4], ['LAMBUNG', 0, 2.2, 13.7, PI, 2.2],
    ],
    lamps: [],
    ambient: [0.55, 0.35],
    sun: 0.5,
    lights: [['key', 50, 0, 9, -2, 36], ['warm', 25, 0, 6, 9, 24], ['lamp', 10, 0, 2.4, 30, 12],
      ['lamp', 20, -12, 3.6, 27, 12], ['warm', 20, 12, 3.6, 27, 12], ['lamp', 35, 0, 5, 54, 18]],
    crew: [[[-20.5, -11], [-20.5, 11], [20.5, 11], [20.5, -11]], [[0, 16], [0, 42]], [[3, 59]],
      [[-14, 24], [-9, 24]], [[9, 24], [14, 30.5]]],
    suits: [0x6a4a8a, 0x3a7a6a, 0x8a5a4a, 0x5a6a9a, 0x7a3a5a],
    robots: [],
    decorate: decorateWhale,
  };
}

export function cruiserPlan(S) {
  const hangar = rect(-26, 26, -12, 10, { h: 11 }), spine = rect(-2, 2, 10, 44, { h: 3.6 });
  const armory = rect(-14, -2, 14, 24, { h: 3.6 }), barracks = rect(-14, -2, 28, 40, { h: 3.6 });
  const workshop = rect(2, 14, 14, 26, { h: 3.6 }), bridge = rect(-10, 10, 44, 56, { h: 5 });
  const door = { x0: -20, x1: 20, h: 9, z: -12, back: 8.5 };
  return {
    floors: [hangar, spine, armory, barracks, workshop, bridge],
    walk: [hangar, spine, armory, barracks, workshop, bridge, rect(-2, 2, 8, 12, { h: 3.6 }), rect(-2, 2, 42, 46, { h: 3.6 }),
      rect(-3.5, -0.5, 17, 20, { h: 3.6 }), rect(-3.5, -0.5, 32, 35, { h: 3.6 }), rect(0.5, 3.5, 18, 21, { h: 3.6 })],
    walls: [
      ...roomWalls(hangar, { s: [[door.x0, door.x1, 0, door.h]], n: [gap(0, 4)] }),
      ['z', -2, 10, 44, 3.6, [gap(18.5, 3), gap(33.5, 3)]], ['z', 2, 10, 44, 3.6, [gap(19.5, 3)]],
      ...roomWalls(armory, {}, 'e'), ...roomWalls(barracks, {}, 'e'), ...roomWalls(workshop, {}, 'w'),
      ...roomWalls(bridge, { s: [gap(0, 4)], n: [[-8, 8, 2, 3.6]] }),
    ],
    door, doors: [door],
    pads: { player: { x: 0, z: -3, r: 6 }, npc: [{ x: -16, z: -4, r: 5 }, { x: 16, z: -4, r: 5 }] },
    stations: {
      hangar: { x: 24.8, z: 4, rotY: -Q }, shipyard: { x: 12.8, z: 17, rotY: -Q }, store: { x: 12.8, z: 22.5, rotY: -Q },
      rest: { x: -12.2, z: 37.8, rotY: PI }, map: { x: 0, z: 48.5 },
    },
    signs: [
      [S.name.toUpperCase(), 0, 10, -11.7, 0, 9], ['DEK PELUNCUR', 0, 9.8, 9.7, PI, 6], ['GUDANG SENJATA', -2.2, 3.1, 18.5, -Q, 2.6],
      ['BARAK', -2.2, 3.1, 33.5, -Q, 2.2], ['BENGKEL', 2.2, 3.1, 19.5, Q, 2.2], ['PUSAT KOMANDO', 0, 3.1, 43.7, PI, 3],
      [`${S.name.toUpperCase()} - SIAGA`, 0, 4.4, 44.3, 0, 5], ['PERDAGANGAN', 13.8, 2.7, 22.5, -Q, 2.4],
    ],
    lamps: [{ spots: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [0, 12 + i * 4]), y: 3.52, w: 1, d: 0.4, mat: 'warm' },
      { spots: [[-8, 17], [-8, 22], [-8, 31], [-8, 37], [8, 17], [8, 23], [-5, 47], [5, 47]], y: 3.52, w: 2, d: 0.4, mat: 'warm' }],
    ambient: [0.55, 0.4],
    sun: 0.35,
    lights: [['key', 50, -12, 9, -2, 32], ['key', 50, 12, 9, -2, 32], ['fill', 22, 0, 6, 5, 26], ['key', 12, 0, 3, 27, 20],
      ['key', 18, -8, 3.2, 19, 12], ['fill', 18, 8, 3.2, 20, 12], ['key', 35, 0, 4.5, 50, 18]],
    crew: [[[-22, -10], [22, -10]], [[22, 7], [-22, 7]], [[0, 12], [0, 42]], [[-8, 16], [-8, 22]], [[-5, 53]], [[5, 16], [9, 24.5]]],
    suits: [0x4a5040, 0x505860, 0x3a4238, 0x5a5048],
    robots: [[-20, 2, 20, 2]],
    decorate: decorateCruiser,
  };
}
