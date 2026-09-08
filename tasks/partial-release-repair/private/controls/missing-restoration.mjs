import { same, order } from "./graph.mjs";
export function plan(current, target, scope) {
  const wanted = new Map(target.map((r) => [r.id, r])),
    remove = new Set(
      current.filter((r) => scope.includes(r.id) && !same(r, wanted.get(r.id))).map((r) => r.id),
    );
  for (let i = 0; i < current.length; i++)
    for (const r of current) if (r.parents.some((p) => remove.has(p))) remove.add(r.id);
  return {
    remove: order(current)
      .reverse()
      .filter((r) => remove.has(r.id))
      .map((r) => r.id),
    create: order(target).filter((r) => !current.some((c) => same(c, r) && c.id === r.id)),
  };
}
