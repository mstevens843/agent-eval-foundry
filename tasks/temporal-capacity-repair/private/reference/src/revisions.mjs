export function select(rows, q) {
  const latest = new Map();
  for (const r of rows)
    if (r.series === q.series && r.knownAt <= q.knownAt) {
      const previous = latest.get(r.key);
      if (!previous || previous.revision < r.revision) latest.set(r.key, r);
    }
  return [...latest.values()].filter((r) => r.value !== null);
}
