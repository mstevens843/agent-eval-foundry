import { same, order } from "./graph.mjs";
export function plan(current, target, scope) {
  const wanted = new Map(target.map((r) => [r.id, r])),
    remove = new Set(
      current.filter((r) => scope.includes(r.id) && !same(r, wanted.get(r.id))).map((r) => r.id),
    );
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of current)
      if (r.parents.some((p) => remove.has(p)) && !remove.has(r.id)) {
        remove.add(r.id);
        changed = true;
      }
  }
  if ([...remove].some((id) => !scope.includes(id))) throw Error("infeasible scope");
  return {
    remove: order(current)
      .reverse()
      .filter((r) => remove.has(r.id))
      .map((r) => r.id),
    create: order(target).filter((r) => remove.has(r.id) || !current.some((c) => c.id === r.id)),
  };
}
