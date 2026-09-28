// Long-hull layouts. Classic: the wide cargo hangar with gantry cranes and a straight corridor.
// Hammerhead: a long, narrow runway bay with a container conveyor, opening into a cross hall
// (the "hammer") with the cabins at its ends and the bridge in the middle.
import { rect, gap, roomWalls } from './plan-kit.js';
import { decorateClassic, decorateHammer } from './decor-long.js';

const Q = Math.PI / 2;

export function classicPlan(S) {
  const hangar = rect(-30, 30, -15, 15, { h: 16 }), corridor = rect(-2.5, 2.5, 15, 40);
  const quarters = rect(-16, -2.5, 22, 34), workshop = rect(2.5, 16, 22, 34), bridge = rect(-12, 12, 40, 56, { h: 7 });
  const door = { x0: -24, x1: 24, h: 13, z: -15, back: 13 };
  return {
    floors: [hangar, corridor, quarters, workshop, bridge],
    walk: [hangar, quarters, workshop, bridge, rect(-2.5, 2.5, 13, 42), rect(-4.5, 0, 26, 30), rect(0, 4.5, 26, 30)],
    walls: [
      ['x', -15, -30, 30, 16, [[door.x0, door.x1, 0, door.h]]], ['x', 15, -30, 30, 16, [gap(0, 5, 0, 3.6)]],
      ['z', -30, -15, 15, 16], ['z', 30, -15, 15, 16],
      ['z', -2.5, 15, 40, 4, [[26, 30, 0, 3.2]]], ['z', 2.5, 15, 40, 4, [[26, 30, 0, 3.2]]],
      ...roomWalls(quarters, { w: [[25, 31, 1.3, 3]] }, 'e'), ...roomWalls(workshop, {}, 'w'),
      ...roomWalls(bridge, { s: [gap(0, 5, 0, 3.6)], n: [[-10, 10, 1, 6.2]] }),
    ],
    door, doors: [door],
    pads: { player: { x: 0, z: 0, r: 6.5 }, npc: [{ x: -18, z: -3, r: 6, rot: 0.35 }, { x: 18, z: -3, r: 6, rot: -0.3 }] },
    stations: {
      hangar: { x: 8.5, z: 9, rotY: -Q }, shipyard: { x: 14.6, z: 25, rotY: -Q }, store: { x: 14.6, z: 31, rotY: -Q },
      rest: { x: -12, z: 32.3, rotY: Math.PI }, map: { x: 0, z: 45 },
    },
    signs: [
      [S.name.toUpperCase(), 0, 14.4, -14.6, 0, 9], ['HANGAR', 0, 10.5, 14.2, Math.PI, 10], ['HANGAR', 0, 3.55, 16.3, 0, 2.6],
      ['ANJUNGAN', 0, 3.55, 38.6, Math.PI, 2.6], ['KABIN', -2.32, 3.55, 28, Q, 2.4], ['BENGKEL', 2.32, 3.55, 28, -Q, 2.4],
      ['BENGKEL', 15.8, 2.7, 25, -Q, 2.6, '#ffc47a'], ['PERDAGANGAN', 15.8, 2.7, 31, -Q, 2.8, '#8fffb0'],
      [`ANJUNGAN ${S.name.toUpperCase()}`, 0, 6.3, 40.2, 0, 7],
    ],
    lamps: [
      { spots: grid(-24, 24, 8, -10, 10, 5), y: 15.8, w: 4, d: 0.8 },
      { spots: [17, 20, 23, 26, 29, 32, 35, 38].map((z) => [0, z]), y: 3.92, w: 1.2, d: 1.4 },
      { spots: [[-6, 43], [6, 43], [-6, 49], [6, 49]], y: 6.9, w: 3, d: 0.6, mat: 'warm' },
      { spots: [[-9, 26], [-9, 30], [6, 26], [12, 26], [6, 30], [12, 30]], y: 3.92, w: 2, d: 0.5 },
    ],
    lights: [['key', 60, -15, 12, -2, 40], ['key', 60, 15, 12, -2, 40], ['fill', 40, 0, 9, 7, 40], ['key', 12, 0, 3.4, 27.5, 18],
      ['warm', 70, 0, 5.5, 47, 30], ['warm', 30, -9, 3.4, 28, 16], ['key', 30, 9, 3.4, 28, 16]],
    crew: [[[-10, 9], [-10, -11], [-23, -11], [-23, 4]], [[11, -11], [11, 5], [21, 5], [21, -11]],
      [[0.9, 17], [0.9, 38]], [[6, 25], [11.5, 25], [11.5, 30.5]], [[-7, 52.6]]],
    robots: [[-7, -11.5, 7, -11.5], [-8.5, -10, -8.5, 10]],
    decorate: decorateClassic,
  };
}

export function grid(x0, x1, dx, z0, z1, dz) {
  const out = [];
  for (let x = x0; x <= x1; x += dx) for (let z = z0; z <= z1; z += dz) out.push([x, z]);
  return out;
}

export function hammerheadPlan(S) {
  const bay = rect(-13, 13, -45, 12, { h: 14 }), hall = rect(-32, 32, 12, 22, { h: 4.5 });
  const quarters = rect(-32, -20, 22, 34, { h: 4.5 }), workshop = rect(20, 32, 22, 34, { h: 4.5 });
  const bridge = rect(-10, 10, 22, 36, { h: 7 });
  const door = { x0: -10, x1: 10, h: 11, z: -45, back: -6 };
  return {
    floors: [bay, hall, quarters, workshop, bridge],
    walk: [bay, hall, quarters, workshop, bridge, rect(-2.5, 2.5, 10, 14, { h: 4.5 }),
      rect(-28, -24, 20, 24, { h: 4.5 }), rect(24, 28, 20, 24, { h: 4.5 }), rect(-2.5, 2.5, 20, 24, { h: 4.5 })],
    walls: [
      ['z', -13, -45, 12, 14], ['z', 13, -45, 12, 14], ['x', -45, -13, 13, 14, [[door.x0, door.x1, 0, door.h]]],
      ['x', 12, -13, 13, 14, [gap(0, 5, 0, 3.6)]], ['x', 12, -32, -13, 4.5], ['x', 12, 13, 32, 4.5],
      ['z', -32, 12, 34, 4.5], ['z', 32, 12, 34, 4.5],
      ['x', 22, -32, -10, 4.5, [gap(-26, 4)]], ['x', 22, 10, 32, 4.5, [gap(26, 4)]], ['x', 22, -10, 10, 7, [gap(0, 5, 0, 3.6)]],
      ['x', 34, -32, -20, 4.5], ['z', -20, 22, 34, 4.5], ['x', 34, 20, 32, 4.5], ['z', 20, 22, 34, 4.5],
      ['z', -10, 22, 36, 7], ['z', 10, 22, 36, 7], ['x', 36, -10, 10, 7, [[-8, 8, 1, 6.2]]],
    ],
    door, doors: [door],
    pads: { player: { x: 0, z: -30, r: 6 }, npc: [{ x: -6, z: -10, r: 5, rot: 0.25 }, { x: 6, z: 2, r: 5, rot: -0.2 }] },
    stations: {
      hangar: { x: 11.8, z: -20, rotY: -Q }, shipyard: { x: 30.6, z: 25, rotY: -Q }, store: { x: 30.6, z: 31, rotY: -Q },
      rest: { x: -29, z: 31.5, rotY: Math.PI }, map: { x: 0, z: 28 },
    },
    signs: [
      [S.name.toUpperCase(), 0, 12.3, -44.6, 0, 10], ['HANGAR', 0, 9.5, 11.7, Math.PI, 8], ['LANDASAN 1', 0, 9.5, -44.6, 0, 6],
      [`KABIN - ${S.name}`, -31.7, 3.4, 17, Q, 5], [`BENGKEL - ${S.name}`, 31.7, 3.4, 17, -Q, 5],
      ['ANJUNGAN', 0, 3.9, 21.8, Math.PI, 3], ['BENGKEL', 31.8, 2.7, 25, -Q, 2.6], ['PERDAGANGAN', 31.8, 2.7, 31, -Q, 2.8],
    ],
    lamps: [
      { spots: grid(-8, 8, 8, -42, 8, 5), y: 13.8, w: 5, d: 0.5 },
      { spots: grid(-28, 28, 7, 17, 17, 1), y: 4.42, w: 2.4, d: 0.8, mat: 'warm' },
      { spots: [[-26, 26], [-26, 31], [26, 26], [26, 31], [-5, 26], [5, 26], [-5, 32], [5, 32]], y: 4.42, w: 2, d: 0.5 },
    ],
    lights: [['key', 55, 0, 11, -32, 40], ['key', 55, 0, 11, -6, 40], ['fill', 25, 0, 4, 17, 30],
      ['warm', 25, -26, 3.8, 28, 14], ['key', 25, 26, 3.8, 28, 14], ['warm', 50, 0, 5.5, 29, 24]],
    crew: [[[-10.5, -40], [-10.5, 8], [10.5, 8], [10.5, -40]], [[-30, 17], [30, 17]], [[-6, 33.2]],
      [[22, 25], [27, 30], [22, 31]], [[-24, 24], [-24, 30]]],
    robots: [[-11, -40, -11, 6], [8, -38, 8, -18]],
    decorate: decorateHammer,
  };
}
