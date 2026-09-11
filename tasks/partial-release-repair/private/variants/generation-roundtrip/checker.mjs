import { equal, verdicts } from "./checker-utils.mjs";
const normalized = ({ generation, ...r }) => ({ ...r, parents: [...new Set(r.parents)].sort() });
const same = (a, b) => Boolean(a && b && equal(normalized(a), normalized(b)));
function check(c) {
  const scope = new Set(c.requestedScope), target = new Map(c.requestedTarget.map(r => [r.id, r]));
  const actual = new Map(c.actual.map(r => [r.id, r]));
  if (actual.size !== c.actual.length) return false;
  for (const id of scope) {
    if (actual.has(id) !== target.has(id)) return false;
    if (target.has(id) && !same(actual.get(id), target.get(id))) return false;
  }
  for (const r of c.initialResources) if (!scope.has(r.id) && !same(actual.get(r.id), r)) return false;
  if (c.actual.some(r => !scope.has(r.id) && !c.initialResources.some(old => same(old, r)))) return false;
  for (const { method, args, before } of c.operations) {
    const id = method === "create" ? args.resource?.id : args.id;
    if (!scope.has(id)) return false;
    if (method === "create") {
      const resource = args.resource;
      if (!resource || typeof resource.payload !== "string" || !Array.isArray(resource.parents)) return false;
      if (resource.parents.some(p => !before.some(r => r.id === p))) return false;
      const current = before.find(r => r.id === id);
      if (current && !same(current, resource)) return false;
    } else if (method === "remove") {
      if (before.some(r => r.parents.includes(id))) return false;
    } else return false;
  }
  return true;
}
export const run = ({ cases }) => verdicts(cases, check);
