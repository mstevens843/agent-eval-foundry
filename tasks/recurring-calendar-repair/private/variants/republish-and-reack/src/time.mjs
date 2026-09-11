export const minute = (s) => Date.parse(s + "Z") / 60000;
export const civil = (n) => new Date(n * 60000).toISOString().slice(0, 16);
export function utc(local, zone) {
  const wall = minute(local),
    candidates = [];
  const offsets = new Set([zone.initialOffset, ...zone.transitions.map((t) => t.offset)]);
  for (const offset of offsets) {
    const instant = wall - offset;
    let actual = zone.initialOffset;
    for (const t of zone.transitions) if (t.at <= instant) actual = t.offset;
    if (actual === offset) candidates.push(instant);
  }
  return candidates.length ? Math.min(...candidates) : null;
}
