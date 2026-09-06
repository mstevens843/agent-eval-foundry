export function resolve(records, id, path = new Set()) {
  const r = records[id];
  if (!r || r.retracted || path.has(id)) return null;
  if (r.kind === "source")
    return { value: r.value, approved: r.authority === "approved", lineage: [{ id, revision: r.revision }] };
  const parents = r.parents.map((p) => resolve(records, p, new Set([...path, id])));
  if (parents.some((p) => !p)) return null;
  return {
    value: parents.map((p) => p.value).join(r.separator),
    approved: parents[0]?.approved ?? true,
    lineage: [{ id, revision: r.revision }, ...(parents[0]?.lineage ?? [])],
  };
}
