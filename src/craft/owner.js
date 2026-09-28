// The player the craft addon serves, for hooks in modules that hold no player handle
// (space flight, cargo hold, on-foot speed). CraftAddon sets both fields on start.
// state is the saved craft state (log.s.craft): state.clock is the buff clock in seconds.
export const owner = { player: null, state: null };
