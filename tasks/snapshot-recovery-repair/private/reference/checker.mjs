import { createHash } from "node:crypto";
import { equal, verdicts } from "./checker-utils.mjs";
const normalized = s => ({ accounts: [...s.accounts].sort((a, b) => a.id - b.id), entries: [...s.entries].sort((a, b) => a.id - b.id), nextId: s.nextId });
function recovered(c) {
  const v = c.view;
  let checkpoint;
  for (const p of v.catalog) if (p.tenant === v.tenant && p.branch === v.branch && p.at <= v.cutoff && (!checkpoint || p.lsn > checkpoint.lsn)) checkpoint = p;
  const bytes = Buffer.from(c.blobs[checkpoint.digest], "base64");
  if (bytes.length !== checkpoint.size || createHash("sha256").update(bytes).digest("hex") !== checkpoint.digest) throw Error("checkpoint commitment");
  const initial = JSON.parse(bytes), tables = { accounts: new Map(), entries: new Map() };
  for (const table of Object.keys(tables)) for (const row of initial[table]) tables[table].set(row.id, { ...row });
  let nextId = initial.nextId;
  const pending = v.logs.filter(t => t.tenant === v.tenant && t.branch === v.branch && t.lsn > checkpoint.lsn && t.at <= v.cutoff);
  for (const tx of [...pending].sort((a, b) => a.lsn - b.lsn)) {
    for (const change of tx.changes) {
      if (change.op === "delete") tables[change.table].delete(change.row.id);
      else tables[change.table].set(change.row.id, { ...change.row });
    }
    nextId = tx.nextId;
  }
  return normalized({ accounts: [...tables.accounts.values()], entries: [...tables.entries.values()], nextId });
}
function check(c) {
  const wanted = recovered(c);
  if (!equal(normalized(c.actual), wanted) || c.publications.length !== 1 || c.backupError !== null) return false;
  const { state, archive } = c.publications[0];
  if (!archive || archive.tenant !== c.view.tenant || archive.branch !== c.view.branch || archive.cutoff !== c.view.cutoff) return false;
  if (!equal(normalized(state), wanted) || !equal(normalized(archive), wanted)) return false;
  for (const table of ["accounts", "entries"]) if (new Set(archive[table].map(r => r.id)).size !== archive[table].length) return false;
  let open = false, published = false;
  for (const o of c.observations) {
    if (["fetch", "cache", "inspect"].includes(o.method)) continue;
    if (published) return false;
    if (o.method === "begin" && o.value?.ok) open = true;
    if (o.method === "commit") open = false;
    if (o.method === "publish" && o.value?.ok) {
      if (open) return false;
      published = true;
    }
  }
  return published && !open;
}
export const run = ({ cases }) => verdicts(cases, check);
