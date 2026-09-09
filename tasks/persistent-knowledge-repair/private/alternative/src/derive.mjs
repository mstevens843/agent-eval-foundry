export function resolve(records, id, visiting = new Set()) {
  const r = records[id];
  if (!r || r.retracted || visiting.has(id)) return null;
  const lineage = [{ id, revision: r.revision }];
  if (r.kind === "source") return { value: r.value, approved: r.authority === "approved", lineage };
  const next = new Set([...visiting, id]);
  const parents = r.parents.map((p) => resolve(records, p, next));
  if (parents.some((p) => !p)) return null;
  return {
    value: parents.map((p) => p.value).join(r.separator),
    approved: parents[0]?.approved ?? true,
    lineage: [...lineage, ...(parents[0]?.lineage ?? [])],
  };
}
