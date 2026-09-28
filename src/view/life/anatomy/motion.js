// Secondary motion: breathing, head look / graze / nod, jaw, blinking, tail follow-through,
// serpent undulation, wing flap + glide, hover tentacles. No allocations per frame.
const TAU = Math.PI * 2;
const damp = (cur, target, rate, dt) => cur + (target - cur) * Math.min(1, dt * rate);
const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));

export function animateBreath(a, dt) {
  const an = a.anim, torso = a.parts.torso;
  an.pant = damp(an.pant, a.speed > a.runSpeed * 0.6 ? 1 : 0, 0.3, dt);
  an.breath += dt * (1.6 + an.pant * 5) * (a.pose.sleep ? 0.6 : 1);
  if (!torso) return;
  const b = Math.sin(an.breath) * (0.018 + an.pant * 0.02);
  torso.scale.set(1 + an.squash * 0.25, 1 + b - an.squash * 0.3, 1 + b);
}

// Yaw from the animal's heading to the look target, clamped to what a neck can do.
function lookYaw(a) {
  if (!a.looking) return 0;
  const dx = a.lookAt.x - a.pos.x, dz = a.lookAt.z - a.pos.z;
  return Math.max(-1.3, Math.min(1.3, wrap(Math.atan2(-dz, dx) - a.root.rotation.y)));
}

export function animateHead(a, dt) {
  const an = a.anim, P = a.parts, pose = a.pose, yaw = lookYaw(a);
  const nod = an.move * Math.sin(an.phase * TAU * 2) * (P.plan.kind === 'biped' ? 0.12 : 0.05);
  for (const neck of P.necks) {
    const down = pose.head * an.graze + pose.lie * 0.25 - pose.alert * 0.15;
    neck.rotation.z = damp(neck.rotation.z, neck.userData.angle - down + nod, 4, dt);
    neck.rotation.y = damp(neck.rotation.y, neck.userData.yaw + yaw * 0.55, 3, dt);
  }
  const spineYaw = P.spine.length ? -P.spine[0].rotation.y : 0;
  for (const head of P.heads) {
    const pitch = head.userData.pitch - pose.head * 0.45 - nod * 0.6 + Math.sin(an.breath * 0.5) * 0.02;
    head.rotation.z = damp(head.rotation.z, pitch, 4, dt);
    head.rotation.y = damp(head.rotation.y, (P.necks.length ? yaw * 0.45 : yaw * 0.6) + spineYaw, 3, dt);
  }
  const chew = pose.head > 0.5 ? 0.12 + 0.12 * Math.sin(an.breath * 5) : 0;
  for (const jaw of P.jaws) jaw.rotation.z = damp(jaw.rotation.z, -(pose.mouth * 0.55 + chew), 10, dt);
  blink(a, dt);
}

function blink(a, dt) {
  const an = a.anim;
  an.blinkT -= dt;
  if (an.blinkT < -0.13) an.blinkT = 1.5 + ((an.seed = (an.seed * 16807) % 2147483647) / 2147483647) * 4.5;
  const shut = a.pose.sleep || an.blinkT < 0 ? 0.08 : 1;
  for (const e of a.parts.eyes) e.scale.y = shut;
}

export function animateTail(a, dt) {
  const an = a.anim, tails = a.parts.tails;
  if (!tails.length) return;
  an.tailT += dt * (1.2 + an.move * 2.5);
  const n = tails.length, amp = (0.6 - an.g * 0.35) / n * (a.pose.sleep ? 0.2 : 1), lift = an.g * an.move * 0.25 + a.pose.alert * 0.1;
  for (let i = 0; i < tails.length; i++) {
    const t = tails[i], lag = an.tailLag;
    lag[i] = damp(lag[i], i ? lag[i - 1] : Math.max(-0.5, Math.min(0.5, -a.turn * 0.4)) / n, 6 - i * 0.6, dt);
    t.rotation.y = amp * Math.sin(an.tailT - i * 0.7) + lag[i];
    t.rotation.z = damp(t.rotation.z, (i ? -0.04 : t.userData.droop + lift) - a.pose.lie * (i ? 0 : 0.2), 4, dt);
  }
}

// Serpents: lateral travelling wave; worms: vertical inchworm wave.
export function animateSpine(a, dt) {
  const spine = a.parts.spine, an = a.anim;
  if (!spine.length) return;
  an.tailT += dt * (1 + an.move * 5);
  const worm = a.sp.genes.body !== 'ular', amp = 0.12 + an.move * 0.25;
  for (let i = 0; i < spine.length; i++) {
    const w = Math.sin(an.tailT - i * 0.9) * amp * Math.min(1, 0.4 + i * 0.2);
    if (worm) spine[i].rotation.z = i ? w * 0.5 : 0; else spine[i].rotation.y = i ? w : w * 0.5;
    spine[i].rotation.y += worm && i ? -a.turn * 0.05 : 0;
  }
}

// Flap with glide phases; tips lag the inner wing.
export function animateWings(a, dt) {
  const wings = a.parts.wings, an = a.anim;
  if (!wings.length) return;
  an.glideT -= dt;
  if (an.glideT < -3) an.glideT = 2 + (a.anim.seed % 3);
  const flap = a.fleeing || a.climb > 0.05 || an.glideT > 0 ? 1 : 0;
  an.flapAmp = damp(an.flapAmp, flap, 2, dt);
  an.wingT += dt * (6 + flap * 3) / Math.sqrt(a.scale);
  const s = Math.sin(an.wingT) * 0.75 * an.flapAmp, dihedral = 0.12 * (1 - an.flapAmp);
  for (let i = 0; i < wings.length; i++) {
    const w = wings[i], side = w.userData.side;
    w.rotation.x = -side * (s + dihedral);
    w.children[w.children.length - 1].rotation.x = -side * (Math.sin(an.wingT - 0.9) * 0.5 * an.flapAmp + dihedral * 0.5);
  }
}

export function animateTentacles(a, dt) {
  const ts = a.parts.tentacles, an = a.anim;
  for (let k = 0; k < ts.length; k++) {
    let seg = ts[k], i = 0;
    const back = a.speed * 0.08;
    seg.rotation.z = 0.25 * Math.sin(an.breath * 0.7 + k) - back;
    seg.rotation.x = 0.2 * Math.cos(an.breath * 0.6 + k * 1.7);
    while ((seg = seg.children.find(isSeg))) seg.rotation.z = 0.35 * Math.sin(an.breath * 0.9 - ++i * 0.8 + k) - back * 0.5;
  }
}

const isSeg = (o) => o.userData.tag === 'tentacleSeg';
