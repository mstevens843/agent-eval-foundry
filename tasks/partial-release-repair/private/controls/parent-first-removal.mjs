export function same(a, b) {
  return (
    !!a &&
    !!b &&
    a.payload === b.payload &&
    JSON.stringify([...a.parents].sort()) === JSON.stringify([...b.parents].sort())
  );
}
export function order(resources) {
  const sorted = [],
    seen = new Set(),
    map = new Map(resources.map((r) => [r.id, r]));
  function visit(id) {
    if (seen.has(id) || !map.has(id)) return;
    seen.add(id);
    for (const p of map.get(id).parents) visit(p);
    sorted.push(map.get(id));
  }
  for (const id of map.keys()) visit(id);
  return sorted.reverse();
}
