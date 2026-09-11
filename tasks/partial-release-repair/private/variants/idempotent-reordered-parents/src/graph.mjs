export function order(resources) {
  const map = new Map(resources.map((r) => [r.id, r])),
    seen = new Set(),
    active = new Set(),
    sorted = [];
  function visit(id) {
    if (seen.has(id) || !map.has(id)) return;
    if (active.has(id)) throw Error("cyclic graph");
    active.add(id);
    for (const p of map.get(id).parents) visit(p);
    active.delete(id);
    seen.add(id);
    sorted.push(map.get(id));
  }
  for (const id of map.keys()) visit(id);
  return sorted;
}
export function same(a, b) {
  return (
    !!a &&
    !!b &&
    a.payload === b.payload &&
    JSON.stringify([...a.parents].sort()) === JSON.stringify([...b.parents].sort())
  );
}
