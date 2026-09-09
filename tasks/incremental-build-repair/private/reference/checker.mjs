import { equal, verdicts } from "./checker-utils.mjs";
function check(c) {
  const artifacts = new Map(c.actual.artifacts.map((a) => [a.handle, a]));
  const newHandles = new Set(c.observations.filter((o) => o.method === "compile" && o.value?.handle).map((o) => o.value.handle));
  const available = new Set([...artifacts.keys()].filter((h) => !newHandles.has(h)));
  function current(handle, action, round, seen = new Set()) {
    const r = artifacts.get(handle), a = round.actions.find((x) => x.id === action);
    if (!r || !a || !available.has(handle) || seen.has(handle)) return false;
    const recipe = r.recipe;
    if (recipe.entry !== a.entry || recipe.tool !== a.tool || recipe.flags !== a.flags) return false;
    const files = new Map(recipe.files.map((f) => [f.path, f.text]));
    if (files.size !== recipe.files.length || recipe.dependencies.length !== a.deps.length) return false;
    function expand(path, stack = []) {
      if (stack.includes(path) || !files.has(path) || files.get(path) !== round.files[path]) throw Error("source");
      return files.get(path).replace(/@include\(([^)]+)\)/g, (_, child) => expand(child, [...stack, path]));
    }
    let text = expand(a.entry);
    if (a.flags === "upper") text = text.toUpperCase();
    const dependencies = [];
    for (let i = 0; i < a.deps.length; i++) {
      const d = recipe.dependencies[i];
      if (d.alias !== a.deps[i].alias || !current(d.handle, a.deps[i].action, round, new Set([...seen, handle]))) return false;
      dependencies.push([d.alias, artifacts.get(d.handle).bytes]);
    }
    return r.bytes === JSON.stringify([a.tool, a.flags, text, dependencies]);
  }
  let roundIndex = -1, publications = 0, calls = 0;
  for (const o of c.observations) {
    if (o.method === "next") {
      if (roundIndex >= 0 && roundIndex < c.input.rounds.length && (publications !== 1 || calls > c.input.rounds[roundIndex].callBudget)) return false;
      roundIndex++; publications = 0; calls = 0;
    } else if (o.method === "compile") {
      calls++; if (o.value?.handle) available.add(o.value.handle);
    } else if (o.method === "publish" && o.value?.stored === true) {
      const round = c.input.rounds[roundIndex];
      if (!round || o.request.round !== round.id || ++publications !== 1 || !equal(o.request.outputs.map((x) => x.target).sort(), [...round.targets].sort())) return false;
      if (o.request.outputs.some((x) => !current(x.handle, x.target, round))) return false;
    }
  }
  if (roundIndex < c.input.rounds.length - 1) return false;
  if (roundIndex === c.input.rounds.length - 1 && (publications !== 1 || calls > c.input.rounds[roundIndex].callBudget)) return false;
  return c.actual.publications.length === c.input.rounds.length && c.actual.calls.every((n, i) => n <= c.input.rounds[i].callBudget);
}
export const run = ({ cases }) => verdicts(cases, check);
