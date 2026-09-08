export function select(view) {
  return view.catalog
    .filter((c) => c.tenant === view.tenant && c.branch === view.branch && c.at <= view.cutoff)
    .sort((a, b) => b.lsn - a.lsn)[0];
}
export function transactions(view, checkpoint) {
  return view.logs
    .filter((t) => t.tenant === view.tenant && t.lsn > checkpoint.lsn && t.at <= view.cutoff)
    .sort((a, b) => a.lsn - b.lsn);
}
