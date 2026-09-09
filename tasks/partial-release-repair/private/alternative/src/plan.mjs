import { same, order } from "./graph.mjs";
export function plan(current, target, scope) {
  const wanted = new Map(target.map((r) => [r.id, r]));
  const remove = current.filter((r) => scope.includes(r.id) && !same(r, wanted.get(r.id)));
  return {
    remove: order(remove)
      .reverse()
      .map((r) => r.id),
    create: order(target).filter(
      (r) =>
        !same(
          r,
          current.find((x) => x.id === r.id),
        ),
    ),
  };
}
