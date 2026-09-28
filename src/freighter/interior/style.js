// What the interior needs to know about the capital ship it belongs to: its archetype, name
// and colours. Pass the result as FreighterInterior.mount(design, name, view, style).
export function interiorStyleOf(freighter) {
  const m = freighter?.model;
  if (!m) return {};
  return {
    archetype: m.archetype,
    name: m.name,
    accent: m.mats.accent.color.getHex(),
    hull: m.mats.hull.color.getHex(),
    glow: m.mats.window.emissive.getHex(),
    owned: Boolean(m.owned),
    bridgeStyle: m.spec?.bridgeStyle ?? null,
  };
}
