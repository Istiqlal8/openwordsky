// Round-hull layouts. Citadel: a tall tower bay; a ramp along the wall climbs to a balcony and
// the upper deck with the cabins, workshop and bridge. Saucer: a domed round bay with three
// radial spokes to round rooms (lounge with aquarium, workshop, panoramic bridge).
import { rect, disc, ramp, gap, arcGap, roomWalls } from './plan-kit.js';
import { decorateCitadel, decorateSaucer } from './decor-round.js';

const Q = Math.PI / 2, PI = Math.PI, U = 8; // U: upper deck height

export function citadelPlan(S) {
  const bay = rect(-20, 20, -14, 14, { h: 28 }), up = { y: U };
  const rampUp = ramp(-20, -16.5, -10, 9, 0, U, 'z', { h: 20 });
  const balcony = rect(-20, 20, 8, 14, { y: U, h: 20, ceil: false, under: true });
  const corridor = rect(-2.5, 2.5, 14, 30, up), quarters = rect(-18, -2.5, 18, 30, up), workshop = rect(2.5, 18, 18, 30, up);
  const bridge = rect(-10, 10, 30, 42, { y: U, h: 7 });
  const door = { x0: -12, x1: 12, h: 14, z: -14, back: 7 };
  return {
    floors: [bay, rampUp, balcony, corridor, quarters, workshop, bridge],
    walk: [rect(-16.5, 20, -14, 14, { h: 28 }), rect(-20, -15.5, -14, -9, { h: 28 }), rampUp, balcony, corridor, quarters,
      workshop, bridge, rect(-2.5, 2.5, 12, 16, up), rect(-4.5, 0, 22, 26, up), rect(0, 4.5, 22, 26, up), rect(-2.5, 2.5, 28, 32, up)],
    walls: [
      ['z', -20, -14, 14, 28], ['z', 20, -14, 14, 28], ['x', -14, -20, 20, 28, [[door.x0, door.x1, 0, door.h]]],
      ['x', 14, -20, 20, 28, [[-2.5, 2.5, U, U + 3.6]]],
      ['z', -2.5, 14, 30, U + 4, [[22, 26, 0, 3.2]], U], ['z', 2.5, 14, 30, U + 4, [[22, 26, 0, 3.2]], U],
      ...roomWalls(quarters, {}, 'e'), ...roomWalls(workshop, {}, 'w'),
      ...roomWalls(bridge, { s: [gap(0, 5, 0, 3.6)], n: [[-8, 8, 1, 6.2]] }),
    ],
    door, doors: [door],
    pads: { player: { x: 4, z: -2, r: 6.5 }, npc: [{ x: -9, z: -5, r: 4.5, rot: 0.4 }] },
    stations: {
      hangar: { x: 18.8, z: -8, rotY: -Q }, shipyard: { x: 16.8, z: 21, rotY: -Q, y: U }, store: { x: 16.8, z: 27, rotY: -Q, y: U },
      rest: { x: -14, z: 27.5, rotY: PI, y: U }, map: { x: 0, z: 34, y: U },
    },
    signs: [
      [S.name.toUpperCase(), 0, 21, 13.7, PI, 14], ['DEK ATAS', -18.2, 4.5, -10.5, Q, 3], ['DEK ATAS', 0, U + 4.3, 13.7, PI, 3],
      ['HANGAR', 0, 15.5, -13.7, 0, 5], ['KABIN', -2.32, U + 3.55, 24, Q, 2.4], ['BENGKEL', 2.32, U + 3.55, 24, -Q, 2.4],
      ['ANJUNGAN', 0, U + 3.55, 29.8, PI, 2.6], ['PERDAGANGAN', 17.8, U + 2.7, 27, -Q, 2.8],
    ],
    lamps: [{ spots: [[-6, 20], [6, 20], [-6, 27], [6, 27], [-12, 20], [12, 20], [-12, 27], [12, 27]], y: U + 3.92, w: 2, d: 0.5, mat: 'warm' },
      { spots: [[-5, 33], [5, 33], [-5, 39], [5, 39]], y: U + 6.9, w: 3, d: 0.6, mat: 'warm' }],
    lights: [['key', 110, 0, 22, -2, 60], ['fill', 45, 0, 6, -6, 30], ['warm', 30, 0, 12, 11, 24],
      ['warm', 25, -10, U + 3.5, 24, 14], ['key', 25, 10, U + 3.5, 24, 14], ['warm', 45, 0, U + 5.5, 36, 20]],
    crew: [[[-12, -12], [15, -12], [15, 6], [-12, 6]], [[-18.2, -11, 0], [-18.2, 9, U], [0, 11, U], [-18.2, 9, U]],
      [[-14, 11, U], [16, 11, U]], [[0, 16, U], [0, 28, U]], [[-5, 38.2, U]], [[5, 20, U], [12, 20, U]]],
    robots: [[-10, -12.5, 12, -12.5]],
    decorate: decorateCitadel,
  };
}

export function saucerPlan(S) {
  const bay = disc(0, 0, 22, { h: 10, ceil: false }), R = 22;
  const lounge = disc(-37, 0, 8, { ceil: false }), shop = disc(37, 0, 8, { ceil: false }), bridge = disc(0, 38, 9, { h: 6, ceil: false });
  const door = { x0: -10.5, x1: 10.5, h: 9, z: -19.3, back: 18 };
  const spoke = (x0, x1, z0, z1) => rect(x0, x1, z0, z1);
  return {
    floors: [bay, lounge, shop, bridge, spoke(21.9, 29.3, -2, 2), spoke(-29.3, -21.9, -2, 2), spoke(-2, 2, 21.9, 29.3)],
    walk: [bay, lounge, shop, bridge, spoke(20, 30, -2, 2), spoke(-30, -20, -2, 2), spoke(-2, 2, 20, 30)],
    walls: [['x', -2, 21.9, 29.3, 4], ['x', 2, 21.9, 29.3, 4], ['x', -2, -29.3, -21.9, 4], ['x', 2, -29.3, -21.9, 4],
      ['z', -2, 21.9, 29.3, 4], ['z', 2, 21.9, 29.3, 4]],
    arcs: [
      { cx: 0, cz: 0, r: R, h: 10, gaps: [[PI - 0.5, PI + 0.5, 0, 9], arcGap(Q, 4, R), arcGap(3 * Q, 4, R), arcGap(0, 4, R)] },
      { cx: 37, cz: 0, r: 8, h: 4, gaps: [arcGap(3 * Q, 4, 8)] }, { cx: -37, cz: 0, r: 8, h: 4, gaps: [arcGap(Q, 4, 8)] },
      { cx: 0, cz: 38, r: 9, h: 6, gaps: [arcGap(PI, 4, 9), [-0.9, 0.9, 1, 5]] },
    ],
    domes: [{ cx: 0, cz: 0, r: R, y: 10, k: 0.55 }, { cx: 37, cz: 0, r: 8, y: 4, k: 0.3 }, { cx: -37, cz: 0, r: 8, y: 4, k: 0.3 },
      { cx: 0, cz: 38, r: 9, y: 6, k: 0.3 }],
    door, doors: [door],
    pads: { player: { x: 0, z: -4, r: 6.5 }, npc: [{ x: -10, z: 9, r: 4.5, rot: 0.8 }, { x: 10, z: 9, r: 4.5, rot: -0.8 }] },
    stations: {
      hangar: { x: -17, z: -12, rotY: Q }, shipyard: { x: 43, z: -2.8, rotY: -Q }, store: { x: 43, z: 2.8, rotY: -Q },
      rest: { x: -37, z: 5.2, rotY: PI }, map: { x: 0, z: 36.5 },
    },
    signs: [
      [S.name.toUpperCase(), 0, 7, 21.6, PI, 10], ['HANGAR', 0, 8.4, -19.2, 0, 4], ['ANJUNGAN', 0, 3.55, 21.8, PI, 2.4],
      ['BENGKEL', 21.8, 3.55, 0, -Q, 2.4], ['LOUNGE', -21.8, 3.55, 0, Q, 2.4], [`CAKRAM ${S.name.toUpperCase()}`, 0, 5.4, 46.8, PI, 5],
      ['PERDAGANGAN', 44.8, 2.7, 0, -Q, 2.8],
    ],
    lamps: [{ spots: [[-26, 0], [26, 0], [0, 26]], y: 3.92, w: 2, d: 1.2 }],
    lights: [['key', 100, 0, 16, 0, 45], ['fill', 30, 0, 5, -12, 22], ['lamp', 25, -37, 3.6, 0, 14],
      ['key', 25, 37, 3.6, 0, 14], ['fill', 40, 0, 5.2, 38, 18], ['lamp', 18, 0, 3.5, 25, 12]],
    crew: [[[0, 16], [0, 28]], [[-24, 0], [-33, -3]], [[24, 0], [33, 3]], [[3, 42.3]],
      [[-16, -10], [-16, 10], [-6, 17], [6, 17], [16, 10], [16, -10]], [[-40.5, -3]]],
    robots: [[-10, -15, 10, -15]],
    decorate: decorateSaucer,
  };
}
