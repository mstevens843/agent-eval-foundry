import { session, checks, equal } from "./adapter.mjs";
const normalized = (r) => ({ ...r, parents: [...new Set(r.parents)].sort() });
export async function runScenario(s, execute, storage) {
  const actual = new Map(s.current.map((r) => [r.id, structuredClone(r)])),
    // Server-tracked incarnation bookkeeping, kept OUTSIDE `actual`'s own content on purpose: it
    // must never affect the "same-content create is a safe idempotent no-op" comparison below,
    // which still looks only at {parents,payload}. Every id ever present starts at generation 1
    // (either seeded by the scenario's initial state, or the first time it's freshly created
    // during the run) and increments by 1 only when a create LANDS while the id was genuinely
    // absent -- i.e. a real remove-then-recreate, not a duplicate no-op create of an id that was
    // never removed.
    generationOf = new Map(s.current.map((r) => [r.id, 1])),
    operations = [],
    observations = [],
    reports = [],
    tokens = new Map(),
    attempted = new Set();
  let serial = 0;
  function operate(method, args) {
    const id = method === "create" ? args.resource?.id : args.id,
      resource = args.resource;
    const before = structuredClone([...actual.values()]);
    const scope = s.scope.includes(id);
    const valid =
      scope &&
      (method === "create"
        ? resource &&
          typeof resource.payload === "string" &&
          Array.isArray(resource.parents) &&
          resource.parents.every((p) => actual.has(p)) &&
          (!actual.has(id) || equal(normalized(actual.get(id)), normalized(resource)))
        : !before.some((r) => r.parents.includes(id)));
    operations.push({ method, args: structuredClone(args), valid, scope, before });
    if (!valid) return { status: "REJECTED" };
    const key = method + ":" + id,
      first = !attempted.has(key);
    attempted.add(key);
    const landed = !(first && s.uncertain === 2);
    // Stable across an attempt/retry pair for the same key: nothing else can touch this id's
    // presence in between (single-threaded, synchronous run, no externally concurrent changes).
    const wasPresent = actual.has(id);
    if (landed) {
      if (method === "create") {
        if (!wasPresent) generationOf.set(id, (generationOf.get(id) || 0) + 1);
        actual.set(id, structuredClone(resource));
      } else actual.delete(id);
    }
    if (first && s.uncertain) {
      const token = "receipt-" + ++serial;
      // The generation THIS specific create call produced (or will produce once it lands) is
      // knowable up front from `wasPresent`, independent of whether it lands on this attempt or
      // needs a retry -- so the receipt can report it accurately regardless of timing.
      const generation =
        method === "create" ? (landed || wasPresent ? generationOf.get(id) : (generationOf.get(id) || 0) + 1) : undefined;
      tokens.set(token, { left: 1, status: landed ? "DONE" : "ABSENT", generation });
      return { status: "UNKNOWN", token };
    }
    return { status: "DONE" };
  }
  await execute(
    session(
      { scope: s.scope, target: s.target, storage },
      {
        inspect: () => ({
          resources: [...actual.values()].map((r) => ({
            ...structuredClone(r),
            generation: generationOf.get(r.id),
          })),
        }),
        create: (a) => operate("create", a),
        remove: (a) => operate("remove", a),
        receipt: ({ token }) => {
          const r = tokens.get(token);
          if (!r) return { status: "ABSENT" };
          if (r.left-- > 0) return { status: "PENDING", token };
          // A resolved create token additionally reports the generation it concerns; a resolved
          // remove token (or an ABSENT create token) does not -- a receipt is bound to the call
          // that produced it, not to the resource's current identity.
          if (r.status === "DONE" && r.generation !== undefined) return { status: "DONE", generation: r.generation };
          return { status: r.status };
        },
      },
      (r) => reports.push(r),
      observations,
    ),
  );
  const wanted = new Map(s.target.map((r) => [r.id, r]));
  return {
    ...checks({
      completion: s.scope.every((id) => actual.has(id) === wanted.has(id)),
      payload: s.target.every((r) => actual.has(r.id) && equal(normalized(actual.get(r.id)), normalized(r))),
      dependency_order: operations.every((o) => o.valid),
      preservation:
        operations.every((o) => o.scope) &&
        s.current.filter((r) => !s.scope.includes(r.id)).every((r) => equal(actual.get(r.id), r)),
    }),
    actual: [...actual.values()],
    expected: s.target,
    // Legitimate PROBLEM data for an independent checker (not an answer-key leak under a new
    // name): `requestedScope`/`requestedTarget` are exactly `view.scope`/`view.target`, the same
    // input every candidate's entry.mjs is handed at the start of the run via `session(view, ...)`
    // above. They are the fixed goal stated to every candidate up front -- identical for the
    // reference, the alternative, and every control run against a given scenario -- not a verdict
    // computed after evaluating any particular candidate's behavior. A checker needs this same
    // "what was asked for" fact for exactly the reason a candidate does: without it there is no
    // way to judge completion/payload from a trace alone, since a scenario's target/scope is
    // scenario-specific structured data with no way to be derived purely from the candidate's own
    // (possibly wrong) actions.
    //
    // Note on `generation`: it appears only on resources inside `observations` entries (the
    // candidate's own api.inspect/api.receipt call records) -- never inside `actual`,
    // `expected`, `requestedTarget`, `initialResources`, or `operations[].before`, all of which
    // stay exactly the {id,parents,payload} shape they always were. A checker does not need
    // `generation` to grade correctly: final-state correctness (derived exactly as before from
    // `actual`/`operations`/`before`) already implies correct incarnation handling, because a
    // scenario bank exists where MISUSING a stale receipt provably produces a wrong final state.
    requestedScope: s.scope,
    requestedTarget: s.target,
    initialResources: s.current,
    operations: operations.map(({ method, args, before }) => ({ method, args, before })),
    observations,
    reports,
  };
}
