export function select(rows, q) {
  const latest = new Map();
  for (const row of rows) {
    if (row.series !== q.series || row.knownAt > q.knownAt || row.to <= q.from || row.from >= q.to) continue;
    const prior = latest.get(row.key);
    if (!prior || row.revision > prior.revision) latest.set(row.key, row);
  }
  return [...latest.values()].filter((r) => r.value !== null);
}
