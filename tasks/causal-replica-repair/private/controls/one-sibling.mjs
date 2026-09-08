import { identity, contextUnion } from "./identity.mjs";
export function merge(states) {
  const all = new Map();
  for (const s of states) for (const v of s.values) all.set(identity(v), v);
  const values = [...all.values()].filter((v) =>
    states.every((s) => s.values.some((w) => identity(v) === identity(w)) || (s.context[v.site] ?? 0) < v.n),
  );
  return { context: contextUnion(states), values: values.slice(0, 1) };
}
