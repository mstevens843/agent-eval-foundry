import { session, checks, equal } from "./adapter.mjs";
export function expand(path, files, stack = []) {
  if (stack.includes(path) || typeof files[path] !== "string") throw Error("source");
  return files[path].replace(/@include\(([^)]+)\)/g, (_, p) => expand(p, files, [...stack, path]));
}
function artifact(recipe, ledger) {
  const files = Object.fromEntries(recipe.files.map((f) => [f.path, f.text]));
  if (new Set(recipe.files.map((f) => f.path)).size !== recipe.files.length) throw Error("duplicates");
  let text = expand(recipe.entry, files);
  if (recipe.flags === "upper") text = text.toUpperCase();
  const deps = recipe.dependencies.map((d) => {
    const r = ledger.get(d.handle);
    if (!r) throw Error("dependency");
    return [d.alias, r.bytes];
  });
  return { recipe: structuredClone(recipe), bytes: JSON.stringify([recipe.tool, recipe.flags, text, deps]) };
}
export function seedLedger(s) {
  const ledger = new Map();
  let count = 0;
  for (const round of s.seedBuilds) {
    const built = new Map();
    function visit(id) {
      if (built.has(id)) return built.get(id);
      const a = round.actions.find((a) => a.id === id),
        dependencies = a.deps.map((d) => ({ alias: d.alias, handle: visit(d.action) })),
        used = new Set();
      function scan(p) {
        if (used.has(p)) return;
        used.add(p);
        for (const m of round.files[p].matchAll(/@include\(([^)]+)\)/g)) scan(m[1]);
      }
      scan(a.entry);
      const recipe = {
        action: id,
        entry: a.entry,
        tool: a.tool,
        flags: a.flags,
        files: [...used].map((path) => ({ path, text: round.files[path] })),
        dependencies,
      };
      const h = "cached-" + ++count;
      ledger.set(h, artifact(recipe, ledger));
      built.set(id, h);
      return h;
    }
    round.targets.forEach(visit);
  }
  return ledger;
}
export function correct(handle, id, round, ledger, seen = new Set()) {
  const r = ledger.get(handle),
    a = round.actions.find((a) => a.id === id);
  if (!r || !a || seen.has(handle)) return false;
  const q = r.recipe;
  if (
    q.action !== id ||
    q.entry !== a.entry ||
    q.tool !== a.tool ||
    q.flags !== a.flags ||
    q.dependencies.length !== a.deps.length
  )
    return false;
  const selected = Object.fromEntries(q.files.map((f) => [f.path, f.text])),
    visited = new Set(),
    todo = [a.entry];
  while (todo.length) {
    const p = todo.pop();
    if (visited.has(p)) continue;
    visited.add(p);
    if (selected[p] !== round.files[p]) return false;
    for (const m of round.files[p].matchAll(/@include\(([^)]+)\)/g)) todo.push(m[1]);
  }
  const next = new Set([...seen, handle]);
  if (
    !a.deps.every(
      (d, i) =>
        q.dependencies[i].alias === d.alias &&
        correct(q.dependencies[i].handle, d.action, round, ledger, next),
    )
  )
    return false;
  let text = expand(a.entry, round.files);
  if (a.flags === "upper") text = text.toUpperCase();
  const expected = JSON.stringify([
    a.tool,
    a.flags,
    text,
    a.deps.map((d, i) => [d.alias, ledger.get(q.dependencies[i].handle).bytes]),
  ]);
  return r.bytes === expected;
}
export async function runScenario(s, execute, storage) {
  const ledger = seedLedger(s),
    initial = new Map(ledger),
    observations = [],
    reports = [],
    publications = [],
    calls = s.rounds.map(() => 0);
  let index = -1,
    serial = 0;
  await execute(
    session(
      { storage },
      {
        next: () => s.rounds[++index] ?? null,
        artifacts: () => [...ledger.keys()],
        inspect: ({ handle }) => ledger.get(handle) ?? null,
        compile: (recipe) => {
          if (index >= 0 && index < calls.length) calls[index]++;
          try {
            if (
              !recipe ||
              !Array.isArray(recipe.files) ||
              !Array.isArray(recipe.dependencies) ||
              !["identity", "upper"].includes(recipe.flags) ||
              typeof recipe.action !== "string" ||
              typeof recipe.tool !== "string"
            )
              return { error: "recipe" };
            const r = artifact(recipe, ledger),
              handle = "built-" + ++serial;
            ledger.set(handle, r);
            return { handle };
          } catch {
            return { error: "recipe" };
          }
        },
        publish: ({ round, outputs }) => {
          if (
            typeof round !== "string" ||
            !Array.isArray(outputs) ||
            outputs.some((o) => !o || typeof o.target !== "string" || typeof o.handle !== "string")
          )
            return { error: "shape" };
          const current = s.rounds[index];
          const validAtPublication =
            !!current &&
            round === current.id &&
            outputs.every((o) => correct(o.handle, o.target, current, ledger));
          publications.push({ after: index, round, outputs, validAtPublication });
          return { stored: true };
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  let binding = publications.every((p) => p.validAtPublication);
  for (const p of publications) {
    const round = s.rounds[p.after];
    if (
      !round ||
      p.round !== round.id ||
      !equal(p.outputs.map((o) => o.target).sort(), round.targets.toSorted())
    ) {
      binding = false;
      continue;
    }
    for (const o of p.outputs) if (!correct(o.handle, o.target, round, ledger)) binding = false;
  }
  // Handles the candidate's own compile()/inspect()/publish() calls actually referenced, per the
  // real observed API traffic -- used below to trim the exposed artifact dump to what a checker
  // could legitimately learn from this candidate's real execution, never handles it never asked
  // about (e.g. untouched seed artifacts, or other candidates' builds in an unrelated run).
  const touchedHandles = new Set();
  for (const o of observations) {
    if (o.method === "compile" && o.value && typeof o.value.handle === "string")
      touchedHandles.add(o.value.handle);
    else if (o.method === "inspect" && o.request && typeof o.request.handle === "string")
      touchedHandles.add(o.request.handle);
    else if (o.method === "publish" && o.request && Array.isArray(o.request.outputs))
      for (const out of o.request.outputs)
        if (out && typeof out.handle === "string") touchedHandles.add(out.handle);
  }
  // A published attestation may name cached dependencies without re-inspecting them.
  // Include that raw attestation closure so alternative correct read strategies remain
  // independently checkable. Recipes and bytes are evidence, not validity booleans.
  for (const handle of touchedHandles)
    for (const dependency of ledger.get(handle)?.recipe.dependencies ?? [])
      touchedHandles.add(dependency.handle);
  return {
    ...checks({
      completion: index >= s.rounds.length && publications.length === s.rounds.length,
      current_artifacts: binding,
      publication_scope:
        publications.length === s.rounds.length &&
        publications.every((p, i) => p.after === i && p.round === s.rounds[i].id),
      incremental_budget: calls.every((n, i) => n <= s.rounds[i].callBudget),
      // Structural invariant, not a falsifiable subject property: the only operation that ever
      // writes to the ledger is compile(), and it always mints a brand-new "built-N" handle --
      // nothing in the exposed API surface can overwrite or delete an existing entry. No possible
      // entry.mjs (however buggy) can make this fail, so it provides zero discriminating signal
      // between correct and incorrect submissions; it is retained only as a regression guard
      // against a future bug in this domain harness itself, never as a candidate-facing check a
      // checker should expect any real or planted defect to violate.
      retained_attestations: [...initial].every(([h, r]) => equal(ledger.get(h), r)),
    }),
    actual: {
      // validAtPublication is a precomputed correctness verdict, not something the candidate's
      // execution itself produced -- strip it so it never reaches a checker (stripGroundTruth
      // only catches top-level expected/truth/groundTruth keys, not this nested one).
      publications: publications.map(({ validAtPublication: _validAtPublication, ...rest }) => rest),
      calls,
      // Trimmed to touchedHandles: only artifacts this candidate's own calls actually referenced,
      // not a full ledger dump that would expose untouched handles' recipe/bytes content beyond
      // what the candidate's real execution legitimately observed.
      artifacts: [...ledger]
        .filter(([handle]) => touchedHandles.has(handle))
        .map(([handle, r]) => ({ handle, ...r })),
    },
    input: { rounds: s.rounds },
    expected: { rounds: s.rounds.map((r) => ({ id: r.id, targets: r.targets, callBudget: r.callBudget })) },
    observations,
    reports,
  };
}
