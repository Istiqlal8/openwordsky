// Small shared helpers for creature templates.
import { Rng } from '../../core/rng.js';
import { Bin } from './anatomy/parts.js';

export const has = (g, f) => !!g.features?.includes(f);

// Deterministic per-species rng for decoration placement.
export const decoRng = (g) => new Rng((g.seed ?? 1) ^ 0x51ab);

export const newBin = () => new Bin();
