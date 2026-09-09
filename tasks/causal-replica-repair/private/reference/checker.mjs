import { equal, verdicts } from "./checker-utils.mjs";
const empty = () => ({ context: {}, values: [] });
function normalized(s) {
  return {
    context: Object.fromEntries(Object.entries(s.context).filter(([, n]) => n !== 0)),
    values: [...s.values].sort((a, b) => JSON.stringify([a.site, a.n]).localeCompare(JSON.stringify([b.site, b.n]))),
  };
}
function check(c) {
  for (const id of c.scope) {
    const states = c.replicas.map((r) => c.initialDocuments[r][id] ?? empty());
    const context = {}, values = new Map();
    for (const s of states) {
      for (const [site, n] of Object.entries(s.context)) context[site] = Math.max(context[site] ?? 0, n);
      for (const v of s.values) values.set(JSON.stringify([v.site, v.n]), v);
    }
    for (const [key, v] of values)
      if (states.some((s) => (s.context[v.site] ?? 0) >= v.n && !s.values.some((w) => w.site === v.site && w.n === v.n))) values.delete(key);
    const wanted = normalized({ context, values: [...values.values()] });
    for (const replica of c.replicas)
      if (!equal(normalized(c.actual[replica][id] ?? empty()), wanted)) return false;
  }
  if (c.writes.some((w) => !c.replicas.includes(w.replica) || !c.scope.includes(w.document))) return false;
  for (const replica of c.replicas) {
    const outside = (docs) => Object.fromEntries(Object.entries(docs).filter(([id]) => !c.scope.includes(id)));
    if (!equal(outside(c.actual[replica]), outside(c.initialDocuments[replica]))) return false;
  }
  return true;
}
export const run = ({ cases }) => verdicts(cases, check);
