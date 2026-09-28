// Deterministic hashing + PRNG. Same seed -> same universe, forever.
const U32 = 4294967296;

export function hash32(...ints) {
  let h = 0x811c9dc5;
  for (let i = 0; i < ints.length; i++) {
    let x = ints[i] | 0;
    x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
    x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
    h = Math.imul(h ^ x ^ (i * 0x9e3779b9), 16777619) >>> 0;
    h ^= h >>> 13;
  }
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  return (h ^ (h >>> 13)) >>> 0;
}

export class Rng {
  constructor(seed) {
    this.s = (seed >>> 0) || 0x9e3779b9;
  }

  next() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / U32;
  }

  range(a, b) { return a + (b - a) * this.next(); }
  int(n) { return Math.floor(this.next() * n); }
  pick(list) { return list[this.int(list.length)]; }
  chance(p) { return this.next() < p; }

  weighted(items) {
    let total = 0;
    for (const it of items) total += it.w;
    let r = this.next() * total;
    for (const it of items) {
      r -= it.w;
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }

  take(list, n) {
    const copy = list.slice();
    const out = [];
    while (out.length < n && copy.length) out.push(copy.splice(this.int(copy.length), 1)[0]);
    return out;
  }
}

export function rngOf(...ints) { return new Rng(hash32(...ints)); }
export function unitOf(...ints) { return hash32(...ints) / U32; }
