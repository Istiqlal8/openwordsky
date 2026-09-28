// The one live Pemakan Planet event, shared read-only with the galaxy map and its side panel.
// The devourer addon owns it; everything else only reads it.
let live = null;

export function setLiveEvent(ev) {
  live = ev;
}

export function liveEvent() {
  return live;
}

export function isEventSystem(index) {
  return Boolean(live) && live.sys === index;
}
