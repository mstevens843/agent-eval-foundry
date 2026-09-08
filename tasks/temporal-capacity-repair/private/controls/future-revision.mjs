export function select(rows, q) {
  const latest = new Map();
  for (const r of rows)
    if (r.series === q.series) {
      if (!latest.has(r.key) || latest.get(r.key).revision < r.revision) latest.set(r.key, r);
    }
  return [...latest.values()].filter((r) => r.value !== null);
}
