// Graphics quality: renderer pixel ratio now, antialias on the next page load (?aa=0 forces it off).
import { settings } from './settings-store.js';

export const QUALITY = [['rendah', 'Rendah'], ['sedang', 'Sedang'], ['tinggi', 'Tinggi']];
const RATIO = { rendah: 0.7, sedang: 1, tinggi: 2 };
let renderer = null;

export function bootAntialias() {
  if (/[?&]aa=0\b/.test(location.search)) return false;
  return settings.quality !== 'rendah';
}

export function pixelRatioFor(quality) {
  return Math.min(devicePixelRatio || 1, RATIO[quality] ?? RATIO.tinggi);
}

export function bindRenderer(r) {
  renderer = r;
  applyQuality();
}

export function applyQuality(quality = settings.quality) {
  renderer?.setPixelRatio(pixelRatioFor(quality));
}

// True when the page must reload for antialias to match the chosen quality.
export function needsReload(quality = settings.quality) {
  const aa = renderer?.getContext?.().getContextAttributes?.()?.antialias;
  return aa !== undefined && aa !== (quality !== 'rendah') && !/[?&]aa=0\b/.test(location.search);
}
