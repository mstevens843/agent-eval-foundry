export function latest(rows, view) {
  const selected = new Map();
  for (const row of rows.filter((r) => r.at >= view.from && r.at < view.to)) {
    const key = JSON.stringify([row.tenant, row.id]),
      old = selected.get(key);
    if (!old || old.revision < row.revision) selected.set(key, row);
  }
  return [...selected.values()];
}
