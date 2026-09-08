export function select(rows, v) {
  return rows.filter((r) => v.tenants.includes(r.tenant));
}
