import { session, checks, equal } from "./adapter.mjs";
function normalize(s) {
  return {
    context: Object.fromEntries(Object.entries(s.context ?? {}).filter(([, n]) => n !== 0)),
    values: [...(s.values ?? [])].sort((a, b) =>
      JSON.stringify([a.site, a.n]).localeCompare(JSON.stringify([b.site, b.n])),
    ),
  };
}
export function truth(s) {
  const result = {};
  for (const d of s.scope) {
    const states = s.replicas.map((r) => s.documents[r][d] ?? { context: {}, values: [] });
    const candidates = states.flatMap((x) => x.values),
      live = [],
      context = {};
    for (const state of states)
      for (const [site, n] of Object.entries(state.context)) context[site] = Math.max(context[site] ?? 0, n);
    for (const v of candidates) {
      if (live.some((w) => w.site === v.site && w.n === v.n)) continue;
      const deleting = states.some(
        (x) => (x.context[v.site] ?? 0) >= v.n && !x.values.some((w) => w.site === v.site && w.n === v.n),
      );
      if (!deleting) live.push(v);
    }
    result[d] = normalize({ context, values: live });
  }
  return result;
}
export async function runScenario(s, execute, storage) {
  const actual = structuredClone(s.documents),
    expected = truth(s),
    writes = [],
    observations = [],
    reports = [];
  await execute(
    session(
      { replicas: s.replicas, documents: s.scope, storage },
      {
        read: ({ replica }) => ({ documents: structuredClone(actual[replica] ?? {}) }),
        replace: (r) => {
          writes.push(structuredClone(r));
          if (actual[r.replica]) actual[r.replica][r.document] = structuredClone(r.state);
          return { stored: true };
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  const states = s.replicas.flatMap((r) =>
    s.scope.map((d) => ({
      r,
      d,
      actual: normalize(actual[r][d] ?? { context: {}, values: [] }),
      expected: expected[d],
    })),
  );
  return {
    ...checks({
      completion: states.every((x) => equal(x.actual, x.expected)),
      causal_values: states.every((x) => equal(x.actual.values, x.expected.values)),
      causal_context: states.every((x) => equal(x.actual.context, x.expected.context)),
      preservation:
        writes.every((w) => s.replicas.includes(w.replica) && s.scope.includes(w.document)) &&
        s.replicas.every((r) => equal(actual[r].untouched, s.documents[r].untouched)),
    }),
    expected,
    actual,
    writes,
    // `replicas` and `scope` are exactly `view.replicas` / `view.documents`, already handed to
    // every candidate at the start of the scenario (see the `session(...)` call above) -- PROBLEM
    // data every solver already receives as input, not a computed answer. A checker needs them to
    // independently judge "preservation" (no writes outside this replica/document set, and
    // untouched out-of-scope documents left byte-identical) from the candidate's own observed API
    // calls, rather than being handed the verdict directly.
    replicas: s.replicas,
    scope: s.scope,
    // The pristine, pre-execution per-replica document store. This is exactly what
    // `api.read({replica})` already returns for every replica the candidate is willing to read
    // before making its first write (every reference/alternative/control implementation here
    // captures every replica up front, per SEMANTICS.md: "Capture participating snapshots before
    // changing them"). Echoing it back lets a checker reconstruct the same "what should the
    // converged state be" computation a real solver's own checker would have to derive from raw
    // execution data, without depending on fragile inference of read-call ordering.
    initialDocuments: s.documents,
    observations,
    reports,
  };
}
