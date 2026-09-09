export function order(definitions) {
  const byId = new Map(definitions.map((d) => [d.id, d])),
    seen = new Set(),
    out = [];
  function visit(id) {
    if (seen.has(id)) return;
    seen.add(id);
    const d = byId.get(id);
    for (const s of d.inputs) if (s.kind === "report") visit(s.id);
    out.push(d);
  }
  for (const d of definitions) visit(d.id);
  return out;
}
