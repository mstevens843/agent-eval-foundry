export function latest(rows) {
  const selected = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row.tenant, row.id]),
      old = selected.get(key);
    if (!old || old.revision < row.revision) selected.set(key, row);
  }
  return [...selected.values()];
}
