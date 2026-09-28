// Shared link between the meta addon (MissionsAddon) and the surface addon (RescueBeacons).
// The meta addon sets `rescue` to its RescueMissions instance; the surface side reads it lazily.
export const hub = { rescue: null };
