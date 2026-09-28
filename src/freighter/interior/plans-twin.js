// Twin and ring layouts. Catamaran: two mirrored bays joined by a ground passage through the
// spine and a raised glass walkway (ramps up each side) that leads to the bridge.
// Ring: a compact hangar opening onto a curved ring corridor around a glass-domed garden,
// with the cabins, workshop and bridge off the ring.
import { rect, disc, ring, ramp, gap, arcGap, roomWalls, loop } from './plan-kit.js';
import { decorateCatamaran, decorateRing } from './decor-twin.js';
import { grid } from './plans-long.js';

const Q = Math.PI / 2, PI = Math.PI;

export function catamaranPlan(S) {
  const bayA = rect(-36, -8, -14, 14, { h: 14 }), bayB = rect(8, 36, -14, 14, { h: 14 });
  const spine = rect(-8, 8, 4, 10), walk = rect(-35.5, 35.5, 10, 14, { y: 6, ceil: false, under: true });
  const quarters = rect(-30, -14, 14, 26), workshop = rect(14, 30, 14, 26), bridge = rect(-8, 8, 14, 28, { y: 6, h: 6 });
  const rampA = ramp(-35.5, -32, -8, 10.5, 0, 6), rampB = ramp(32, 35.5, -8, 10.5, 0, 6);
  const doorA = { x0: -32, x1: -12, h: 11, z: -14, back: 9 }, doorB = { x0: 12, x1: 32, h: 11, z: -14 };
  return {
    floors: [bayA, bayB, spine, walk, rect(-8, 8, 10, 14, { y: 6, floor: false }), quarters, workshop, bridge, rampA, rampB],
    walk: [rect(-32, -8, -14, 14, { h: 14 }), rect(-36, -31, -14, -7, { h: 14 }), rect(8, 32, -14, 14, { h: 14 }),
      rect(31, 36, -14, -7, { h: 14 }), rampA, rampB, walk, spine, rect(-9, -7, 4, 10), rect(7, 9, 4, 10),
      quarters, workshop, bridge, rect(-21.6, -18.4, 12, 16), rect(18.4, 21.6, 12, 16), rect(-2, 2, 12, 16, { y: 6 })],
    walls: [
      ['z', -36, -14, 14, 14], ['z', 36, -14, 14, 14],
      ['x', -14, -36, -8, 14, [[doorA.x0, doorA.x1, 0, doorA.h]]], ['x', -14, 8, 36, 14, [[doorB.x0, doorB.x1, 0, doorB.h]]],
      ['x', 14, -36, -8, 14, [gap(-20)]], ['x', 14, 8, 36, 14, [gap(20)]],
      ['z', -8, -14, 14, 14, [[4, 10, 0, 3.4], [10, 14, 6, 9.4]]], ['z', 8, -14, 14, 14, [[4, 10, 0, 3.4], [10, 14, 6, 9.4]]],
      ['x', 4, -8, 8, 4], ['x', 10, -8, 8, 10],
      ...roomWalls(quarters, {}, 's'), ...roomWalls(workshop, {}, 's'),
      ...roomWalls(bridge, { s: [gap(0, 4)], n: [[-6.5, 6.5, 1, 5.2]] }),
    ],
    door: doorA, doors: [doorA, doorB],
    pads: { player: { x: -22, z: -2, r: 6 }, npc: [{ x: 22, z: -3, r: 6, rot: -0.2 }] },
    stations: {
      hangar: { x: -9.2, z: -6, rotY: -Q }, shipyard: { x: 28.8, z: 18, rotY: -Q }, store: { x: 28.8, z: 23, rotY: -Q },
      rest: { x: -26, z: 23.5, rotY: PI }, map: { x: 0, z: 19.5, y: 6 },
    },
    signs: [
      [S.name.toUpperCase(), -22, 12.4, 13.8, PI, 8], ['HANGAR B', 22, 12.4, 13.8, PI, 6], ['HANGAR A', -22, 12.4, -13.7, 0, 5],
      ['JEMBATAN', -7.8, 3.7, 7, Q + PI, 2.6], ['JEMBATAN', 7.8, 3.7, 7, Q, 2.6], ['ANJUNGAN', 0, 9.6, 13.8, PI, 3],
      ['KABIN', -20, 3.6, 13.8, PI, 2.4], ['BENGKEL', 20, 3.6, 13.8, PI, 2.4],
      [`${S.name} - ANJUNGAN`, 0, 11.4, 14.2, 0, 6],
    ],
    lamps: [
      { spots: grid(-32, -12, 5, -10, 6, 8), y: 13.8, w: 3, d: 0.6 }, { spots: grid(12, 32, 5, -10, 6, 8), y: 13.8, w: 3, d: 0.6, mat: 'accentGlow' },
      { spots: [[-5, 7], [0, 7], [5, 7]], y: 3.92, w: 1.5, d: 1.2 },
      { spots: [[-22, 18], [-22, 22], [22, 18], [22, 22]], y: 3.92, w: 2, d: 0.5, mat: 'warm' },
      { spots: [[-4, 17], [4, 17], [-4, 24], [4, 24]], y: 11.9, w: 2, d: 0.5 },
    ],
    lights: [['key', 55, -22, 11, -2, 36], ['accent', 45, 22, 11, -2, 36], ['fill', 12, 0, 3.4, 7, 14],
      ['warm', 25, -22, 3.5, 20, 14], ['key', 25, 22, 3.5, 20, 14], ['warm', 40, 0, 10.5, 21, 20]],
    crew: [[[-33.7, -9, 0], [-33.7, 10.5, 6], [-20, 12, 6], [-33.7, 10.5, 6]], [[-30, 12, 6], [30, 12, 6]],
      [[11, -12], [11, 9]], [[16, 16], [26, 16], [26, 24]], [[4, 25, 6]], [[-29, -12], [-15, -12], [-15, 9]]],
    robots: [[-30, -12.5, -14, -12.5], [14, 9, 30, 9]],
    decorate: decorateCatamaran,
  };
}

export function ringPlan(S) {
  const C = 32, hangar = rect(-22, 22, -14, 10, { h: 12 }), corridor = ring(0, C, 15, 19.5);
  const garden = disc(0, C, 14.6, { h: 9, ceil: false }), bridge = rect(-9, 9, 51.6, 63.6, { h: 6 });
  const quarters = rect(-33, -21, 26, 38), workshop = rect(21, 33, 26, 38);
  const door = { x0: -16, x1: 16, h: 10, z: -14, back: 8.5 };
  const four = (w, r) => [0, Q, PI, 3 * Q].map((t) => arcGap(t, w, r));
  return {
    floors: [hangar, corridor, disc(0, C, 15, { ceil: false }), bridge, quarters, workshop,
      rect(-2.5, 2.5, 10, 12.7), rect(-2.5, 2.5, 51.3, 51.6), rect(-21, -19.4, 30, 34), rect(19.4, 21, 30, 34)],
    walk: [hangar, corridor, garden, bridge, quarters, workshop, rect(-2.5, 2.5, 8, 14.5), rect(-2.5, 2.5, 49, 53),
      rect(-22, -18.5, 30, 34), rect(18.5, 22, 30, 34), rect(12, 16, 30, 34), rect(-16, -12, 30, 34),
      rect(-2, 2, 16.5, 19.5), rect(-2, 2, 44.5, 47.5)],
    walls: [
      ...roomWalls(hangar, { s: [[door.x0, door.x1, 0, door.h]], n: [gap(0, 5, 0, 3.6)] }),
      ['z', -2.5, 10, 12.7, 4], ['z', 2.5, 10, 12.7, 4], ['x', 30, -21, -19.4, 4], ['x', 34, -21, -19.4, 4],
      ['x', 30, 19.4, 21, 4], ['x', 34, 19.4, 21, 4],
      ...roomWalls(bridge, { s: [gap(0, 5)], n: [[-7, 7, 1, 5.2]] }),
      ...roomWalls(quarters, { e: [gap(32, 4)] }), ...roomWalls(workshop, { w: [gap(32, 4)] }),
    ],
    arcs: [{ cx: 0, cz: C, r: 19.5, h: 4, gaps: [arcGap(0, 5, 19.5), arcGap(Q, 4, 19.5), arcGap(PI, 5, 19.5), arcGap(3 * Q, 4, 19.5)] },
      { cx: 0, cz: C, r: 15, h: 5, gaps: four(4, 15) }],
    domes: [{ cx: 0, cz: C, r: 15, y: 5, k: 0.45, mat: 'glass' }],
    door, doors: [door],
    pads: { player: { x: 0, z: -3, r: 6 }, npc: [{ x: -15, z: -4, r: 5, rot: 0.3 }, { x: 15, z: -4, r: 5, rot: -0.3 }] },
    stations: {
      hangar: { x: 8, z: 9.2, rotY: PI }, shipyard: { x: 31.8, z: 29, rotY: -Q }, store: { x: 31.8, z: 35, rotY: -Q },
      rest: { x: -30, z: 35.5, rotY: PI }, map: { x: 0, z: 55.5 },
    },
    signs: [
      [S.name.toUpperCase(), 0, 11.2, -13.6, 0, 9], ['CINCIN', 0, 3.5, 9.7, PI, 2.6], ['TAMAN', 0, 3.5, 17.3, PI, 2.4],
      ['ANJUNGAN', 0, 3.5, 51.2, 0, 2.6], ['KABIN', -20.9, 3.5, 32, Q, 2.4], ['BENGKEL', 20.9, 3.5, 32, -Q, 2.4],
      [`TAMAN ${S.name.toUpperCase()}`, 0, 8.2, 20, PI, 6], ['PERDAGANGAN', 32.8, 2.7, 35, -Q, 2.8],
    ],
    lamps: [{ spots: grid(-16, 16, 8, -10, 6, 8), y: 11.8, w: 4, d: 0.6 }, { spots: [[-4, 56], [4, 56], [-4, 61], [4, 61]], y: 5.9, w: 2, d: 0.5, mat: 'warm' },
      { spots: [[-27, 29], [-27, 35], [27, 29], [27, 35]], y: 3.92, w: 2, d: 0.5 }],
    lights: [['key', 60, 0, 10, -4, 36], ['warm', 70, 0, 8, C, 22], ['fill', 14, 0, 3.4, 14.5, 12], ['fill', 14, 0, 3.4, 49.5, 12],
      ['warm', 25, -27, 3.5, 32, 14], ['key', 25, 27, 3.5, 32, 14], ['warm', 45, 0, 5, 57, 20]],
    crew: [loop(0, C, 17.2, 10), [[-4, 24], [4, 24], [4, 40], [-4, 40]], [[-21, -12], [-21, 6], [21, 6], [21, -12]],
      [[23, 28], [23, 36], [29, 36]], [[-4, 59.8]], loop(0, C, 17.4, 10, 0, PI)],
    robots: [[-12, 8, 12, 8]],
    decorate: decorateRing,
  };
}
