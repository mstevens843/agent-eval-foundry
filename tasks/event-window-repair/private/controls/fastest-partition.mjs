export function advance(states, prev) {
  const all = [...states.values()],
    active = all.filter((p) => p.active && !p.ended);
  return all.every((p) => p.ended)
    ? Infinity
    : active.length
      ? Math.max(prev, ...active.map((p) => p.watermark))
      : prev;
}
