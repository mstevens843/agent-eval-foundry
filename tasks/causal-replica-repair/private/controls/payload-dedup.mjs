import { identity, contextUnion } from "./identity.mjs";
export function merge(states) {
  const all = new Map();
  for (const s of states) for (const v of s.values) all.set(identity(v), v);
  const retained = [...all.values()].filter((v) =>
    states.every((s) => s.values.some((w) => identity(w) === identity(v)) || (s.context[v.site] ?? 0) < v.n),
  );
  return {
    context: contextUnion(states),
    values: [...new Map(retained.map((v) => [v.payload, v])).values()],
  };
}
