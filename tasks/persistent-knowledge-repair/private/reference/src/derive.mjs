export function resolve(records, id, visiting = new Set()) {
  const r = records[id];
  if (!r || r.retracted || visiting.has(id)) return null;
  if (r.kind === "source")
    return { value: r.value, approved: r.authority === "approved", lineage: [{ id, revision: r.revision }] };
  const next = new Set([...visiting, id]);
  const parents = r.parents.map((p) => resolve(records, p, next));
  if (parents.some((p) => !p)) return null;
  const versions = new Map([[id, r.revision]]);
  for (const p of parents) for (const item of p.lineage) versions.set(item.id, item.revision);
  return {
    value: parents.map((p) => p.value).join(r.separator),
    approved: parents.every((p) => p.approved),
    lineage: [...versions]
      .map(([id, revision]) => ({ id, revision }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}
