// Photo gallery: small JPEG thumbnails in localStorage, kept apart from the save file.
const KEY = 'openworldsky.photos';
const MAX = 24;
const WIDTH = 320;

export function loadPhotos() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

// Newest first; drops the oldest beyond MAX. Returns false when storage is full or blocked.
export function storePhoto(photo) {
  const list = [photo, ...loadPhotos()].slice(0, MAX);
  for (let n = list.length; n > 0; n--) {
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, n))); return true; } catch { /* quota: drop more */ }
  }
  return false;
}

// Downscaled JPEG of the WebGL canvas with the photo filter baked in (ctx.filter = CSS filter).
export function thumbnail(canvas, cssFilter) {
  const h = Math.max(1, Math.round((WIDTH * canvas.height) / Math.max(1, canvas.width)));
  const out = document.createElement('canvas');
  out.width = WIDTH;
  out.height = h;
  const g = out.getContext('2d');
  g.filter = cssFilter || 'none';
  g.drawImage(canvas, 0, 0, WIDTH, h);
  return out.toDataURL('image/jpeg', 0.72);
}
