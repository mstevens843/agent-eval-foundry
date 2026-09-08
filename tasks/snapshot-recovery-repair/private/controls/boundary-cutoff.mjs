export function select(v) {
  return v.catalog
    .filter((c) => c.tenant === v.tenant && c.branch === v.branch && c.at <= v.cutoff)
    .sort((a, b) => b.lsn - a.lsn)[0];
}
export function transactions(v, c) {
  return v.logs
    .filter((t) => t.tenant === v.tenant && t.branch === v.branch && t.lsn > c.lsn && t.at < v.cutoff)
    .sort((a, b) => a.lsn - b.lsn);
}
