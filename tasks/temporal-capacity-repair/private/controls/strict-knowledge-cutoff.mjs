export function select(rows, q) {
  const chosen = new Map();
  for (const r of rows)
    if (r.series === q.series && r.knownAt < q.knownAt) {
      const old = chosen.get(r.key);
      if (!old || old.revision < r.revision) chosen.set(r.key, r);
    }
  return [...chosen.values()].filter((r) => r.value !== null);
}
