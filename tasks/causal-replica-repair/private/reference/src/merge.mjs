import { identity, contextUnion } from "./identity.mjs";
export function merge(states) {
  const memberships = states.map((s) => new Set(s.values.map(identity))),
    all = new Map();
  for (const s of states) for (const v of s.values) all.set(identity(v), v);
  const values = [...all.values()].filter((v) =>
    states.every((s, i) => memberships[i].has(identity(v)) || (s.context[v.site] ?? 0) < v.n),
  );
  return { context: contextUnion(states), values };
}
