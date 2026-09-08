export function advance(states, prev) {
  const a = [...states.values()].filter((p) => p.active && !p.ended);
  return a.length ? Math.max(prev, Math.min(...a.map((p) => p.watermark))) : Infinity;
}
