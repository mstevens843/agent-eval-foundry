export function select(rows, v) {
  const seen = new Set();
  return rows.filter((r) => {
    if (!v.tenants.includes(r.tenant) || r.status !== "open" || seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}
