export function select(rows, v) {
  const seen = new Set();
  return rows.filter((r) => {
    const key = JSON.stringify([r.tenant, r.id]);
    if (!v.tenants.includes(r.tenant) || r.status !== "open" || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
