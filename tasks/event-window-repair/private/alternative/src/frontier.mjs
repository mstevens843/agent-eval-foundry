export function advance(states, previous) {
  const live = [...states.values()].filter((p) => !p.ended && p.active);
  return live.length ? Math.max(previous, ...live.map((p) => p.watermark)) : Infinity;
}
