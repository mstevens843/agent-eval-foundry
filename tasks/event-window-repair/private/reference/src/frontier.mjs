export function advance(states, previous) {
  const all = [...states.values()];
  if (all.every((p) => p.ended)) return Infinity;
  const active = all.filter((p) => p.active && !p.ended);
  return active.length ? Math.max(previous, Math.min(...active.map((p) => p.watermark))) : previous;
}
