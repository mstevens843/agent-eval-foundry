export function advance(states, prev) {
  const all = [...states.values()],
    a = all.filter((p) => p.active && !p.ended);
  return all.every((p) => p.ended) ? Infinity : a.length ? Math.min(...a.map((p) => p.watermark)) : prev;
}
